<?php
/**
 * Optional seed for a FRESH / test database (skip this for a real migration,
 * which brings production data via migrate_sqlite_to_mysql.php).
 *
 * Usage:  php scripts/seed.php
 * Creates the two staff logins (if absent), a default weekly schedule, and the
 * default site settings. Safe to re-run: it only inserts what is missing.
 *
 * SECURITY: change these default staff passwords before going live.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Run from the command line.\n");
    exit(1);
}

require __DIR__ . '/../src/bootstrap.php';

function ensureUser(string $mobile, string $fullName, string $nationalId, string $role, string $password): void
{
    if (Db::one('SELECT id FROM users WHERE mobile = ?', [$mobile])) {
        echo "user $mobile exists\n";
        return;
    }
    Db::insert(
        'INSERT INTO users (full_name, national_id, mobile, role, password_hash, created_at) VALUES (?,?,?,?,?,?)',
        [$fullName, $nationalId, $mobile, $role, password_hash($password, PASSWORD_BCRYPT), Db::nowUtc()]
    );
    echo "created $role $mobile\n";
}

ensureUser('09120000001', 'دکتر حسین مرادی', '0010000001', 'doctor', 'doctor123');
ensureUser('09120000002', 'منشی مطب', '0010000002', 'secretary', 'secretary123');

// Weekly schedule (Python weekday: Mon=0..Sun=6). Sat..Thu 09:00-17:00 (Thu to 13:00), 20-min slots.
if (count(Db::all('SELECT id FROM doctor_schedule')) === 0) {
    $sched = [
        [5, '09:00', '17:00'], [6, '09:00', '17:00'], [0, '09:00', '17:00'],
        [1, '09:00', '17:00'], [2, '09:00', '17:00'], [3, '09:00', '13:00'],
    ];
    foreach ($sched as [$wd, $s, $e]) {
        Db::insert('INSERT INTO doctor_schedule (weekday, start_time, end_time, visit_duration) VALUES (?,?,?,20)',
            [$wd, $s, $e]);
    }
    echo "seeded schedule\n";
}

// Default site settings (only if none exist).
if (count(Db::all('SELECT id FROM site_settings')) === 0) {
    $defaults = [
        'doctor_name' => 'دکتر حسین مرادی',
        'doctor_specialty' => 'روانشناس بالینی',
        'contact_hours' => 'شنبه تا پنجشنبه ۰۹:۰۰ - ۱۷:۰۰',
    ];
    foreach ($defaults as $k => $v) {
        Db::insert('INSERT INTO site_settings (`key`, `value`) VALUES (?, ?)', [$k, $v]);
    }
    echo "seeded settings\n";
}

echo "Done.\n";
