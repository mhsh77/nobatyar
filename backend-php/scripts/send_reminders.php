<?php
/**
 * Appointment reminder cron — replaces the legacy send_reminders.py.
 *
 * Usage (CLI):  php scripts/send_reminders.php [minutes_ahead]
 *   minutes_ahead defaults to 1440 (24h). For each CONFIRMED appointment whose
 *   datetime falls within the window and that has not been reminded yet, it sends
 *   the sms.ir REMINDER template and marks reminder_sent = 1.
 *
 * Suggested cPanel cron (every minute, 24h ahead):
 *   * * * * * /usr/bin/php /home/USER/public_html/scripts/send_reminders.php 1440 >> /home/USER/reminders.log 2>&1
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Run from the command line.\n");
    exit(1);
}

require __DIR__ . '/../src/bootstrap.php';

$minsAhead = isset($argv[1]) && is_numeric($argv[1]) ? (int) $argv[1] : 1440;

$tz  = new DateTimeZone((string) Config::get('TIMEZONE', 'Asia/Tehran'));
$now = new DateTime('now', $tz);
$maxMinute = (clone $now)->modify("+{$minsAhead} minutes");

$rows = Db::all(
    "SELECT a.id, a.appointment_date, a.appointment_time, u.full_name, u.mobile
       FROM appointments a
       JOIN users u ON a.patient_id = u.id
      WHERE a.status = 'confirmed'
        AND (a.reminder_sent IS NULL OR a.reminder_sent = 0)"
);

$sent = 0;
foreach ($rows as $r) {
    try {
        $apt = DateTime::createFromFormat('!Y-m-d H:i', $r['appointment_date'] . ' ' . $r['appointment_time'], $tz);
        if (!$apt) {
            continue;
        }
        if ($apt <= $maxMinute) {
            Sms::reminder($r['mobile'], $r['full_name'], $r['appointment_time']);
            Db::exec('UPDATE appointments SET reminder_sent = 1 WHERE id = ?', [(int) $r['id']]);
            $sent++;
            echo 'Sent to ' . $r['mobile'] . "\n";
        }
    } catch (Throwable $e) {
        echo 'Error: ' . $e->getMessage() . "\n";
    }
}
echo "Done ($sent sent)\n";
