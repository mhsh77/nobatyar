<?php
/**
 * One-time data migration: legacy SQLite DB -> the new MySQL database.
 *
 * Usage (CLI):
 *   php scripts/migrate_sqlite_to_mysql.php /path/to/moradipsy.db [--force]
 *
 * Requires the pdo_sqlite and pdo_mysql PHP extensions. Run it anywhere that can
 * reach the MySQL server (locally, or on the host via SSH). MySQL credentials are
 * read from ../config.php. Existing ids are preserved. With --force, each target
 * table is TRUNCATEd before loading (otherwise the script aborts if a table is not empty).
 *
 * Run schema.sql FIRST to create the tables.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Run from the command line.\n");
    exit(1);
}

$sqlitePath = $argv[1] ?? '';
$force = in_array('--force', $argv, true);
if ($sqlitePath === '' || !is_file($sqlitePath)) {
    fwrite(STDERR, "Usage: php migrate_sqlite_to_mysql.php /path/to/moradipsy.db [--force]\n");
    exit(1);
}

$config = require __DIR__ . '/../config.php';

try {
    $sqlite = new PDO('sqlite:' . $sqlitePath, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (Throwable $e) {
    fwrite(STDERR, "Cannot open SQLite DB: " . $e->getMessage() . "\n");
    fwrite(STDERR, "(pdo_sqlite extension required.)\n");
    exit(1);
}

$dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    $config['DB_HOST'], $config['DB_PORT'], $config['DB_NAME']);
$mysql = new PDO($dsn, $config['DB_USER'], $config['DB_PASS'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
$mysql->exec("SET time_zone = '+00:00'");

// Target tables and their MySQL columns. Only these columns are copied (when present in SQLite).
$tables = [
    'users'                  => ['id','full_name','national_id','mobile','role','password_hash','underlying_diseases','created_at'],
    'otp_codes'              => ['id','mobile','otp_code','expires_at','verified','created_at'],
    'doctor_schedule'        => ['id','weekday','start_time','end_time','visit_duration'],
    'closed_days'            => ['id','closed_date','reason','created_at'],
    'posts'                  => ['id','title','content','image','author_id','published','created_at','updated_at'],
    'chatbot_messages'       => ['id','sender','message','created_at'],
    'site_settings'          => ['id','key','value'],
    'appointments'           => ['id','patient_id','appointment_date','appointment_time','status','created_at','reminder_sent'],
    'medical_records'        => ['id','patient_id','doctor_id','appointment_id','visit_date','chief_complaint','history','diagnosis','treatment_plan','medications','insurance_company','insurance_type','notes','images','created_at','updated_at'],
    'comments'               => ['id','post_id','name','phone','content','approved','created_at','parent_id'],
    'survey_responses'       => ['id','name','phone','rating','content','created_at'],
    'seminar_registrations'  => ['id','first_name','last_name','phone','is_student','field_of_study','semester','created_at'],
];

$datetimeCols = ['created_at' => true, 'updated_at' => true, 'expires_at' => true];

// NOT NULL columns in the MySQL schema: substitute a sane default when the legacy value is NULL.
$notNullDefaults = [
    'reminder_sent'  => 0,
    'published'      => 1,
    'approved'       => 0,
    'verified'       => 0,
    'is_student'     => 0,
    'rating'         => 5,
    'visit_duration' => 20,
    'status'         => 'pending',
    'role'           => 'patient',
];

function sqliteColumns(PDO $db, string $table): array
{
    try {
        $rows = $db->query("PRAGMA table_info(" . $table . ")")->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        return [];
    }
    return array_map(fn($r) => $r['name'], $rows);
}

function normDate($v)
{
    if ($v === null || $v === '') {
        return null;
    }
    // SQLAlchemy stores "YYYY-MM-DD HH:MM:SS.ffffff"; MySQL DATETIME wants seconds only.
    $v = (string) $v;
    if (strpos($v, '.') !== false) {
        $v = substr($v, 0, strpos($v, '.'));
    }
    return substr($v, 0, 19);
}

$mysql->exec('SET FOREIGN_KEY_CHECKS = 0');
$grandTotal = 0;

foreach ($tables as $table => $cols) {
    $srcCols = sqliteColumns($sqlite, $table);
    if (!$srcCols) {
        echo "  skip $table (not in SQLite)\n";
        continue;
    }
    $useCols = array_values(array_filter($cols, fn($c) => in_array($c, $srcCols, true)));

    // Guard against double-loading.
    $existing = (int) $mysql->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
    if ($existing > 0) {
        if (!$force) {
            fwrite(STDERR, "Table `$table` already has $existing rows. Re-run with --force to truncate & reload.\n");
            exit(1);
        }
        $mysql->exec("TRUNCATE TABLE `$table`");
    }

    $rows = $sqlite->query("SELECT * FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) {
        echo "  $table: 0 rows\n";
        continue;
    }

    $colList = implode(', ', array_map(fn($c) => "`$c`", $useCols));
    $placeholders = implode(', ', array_fill(0, count($useCols), '?'));
    $stmt = $mysql->prepare("INSERT INTO `$table` ($colList) VALUES ($placeholders)");

    $mysql->beginTransaction();
    $n = 0;
    foreach ($rows as $row) {
        $values = [];
        foreach ($useCols as $c) {
            $v = $row[$c] ?? null;
            if (isset($datetimeCols[$c])) {
                $v = normDate($v);
            }
            if ($v === null && array_key_exists($c, $notNullDefaults)) {
                $v = $notNullDefaults[$c];
            }
            $values[] = $v;
        }
        $stmt->execute($values);
        $n++;
    }
    $mysql->commit();
    echo "  $table: $n rows\n";
    $grandTotal += $n;
}

$mysql->exec('SET FOREIGN_KEY_CHECKS = 1');
echo "Done. $grandTotal rows migrated.\n";
