<?php
declare(strict_types=1);

final class SecretaryController
{
    public static function register(Router $r): void
    {
        $r->get('/secretary/appointments', [self::class, 'listAppointments']);
        $r->patch('/secretary/appointments/{id}/confirm', [self::class, 'confirm']);
        $r->patch('/secretary/appointments/{id}/reject', [self::class, 'reject']);
        $r->patch('/secretary/appointments/{id}/reschedule', [self::class, 'reschedule']);
        $r->patch('/secretary/appointments/{id}/arrived', [self::class, 'arrived']);
        $r->patch('/secretary/appointments/{id}/absent', [self::class, 'absent']);
        $r->get('/secretary/patients', [self::class, 'searchPatients']);
    }

    public static function listAppointments(): void
    {
        Http::requireAuth();
        $status = (string) Http::query('status', '');
        $date = (string) Http::query('date', '');

        $sql = 'SELECT * FROM appointments WHERE 1=1';
        $params = [];
        if ($status !== '') {
            $sql .= ' AND status = ?';
            $params[] = $status;
        }
        $today = AppointmentController::todayDate()->format('Y-m-d');
        if ($date === 'today') {
            $sql .= ' AND appointment_date = ?';
            $params[] = $today;
        } elseif ($date !== '') {
            $sql .= ' AND appointment_date = ?';
            $params[] = $date;
        }
        $sql .= ' ORDER BY appointment_date, appointment_time';

        $appts = Db::all($sql, $params);
        $result = [];
        foreach ($appts as $a) {
            $p = Db::one('SELECT * FROM users WHERE id = ?', [(int) $a['patient_id']]);
            $result[] = [
                'id'                  => (int) $a['id'],
                'patient_name'        => $p['full_name'] ?? 'نامشخص',
                'patient_national_id' => $p['national_id'] ?? '',
                'patient_mobile'      => $p['mobile'] ?? '',
                'patient_diseases'    => $p['underlying_diseases'] ?? '',
                'date'                => $a['appointment_date'],
                'time'                => $a['appointment_time'],
                'status'              => $a['status'],
            ];
        }
        Http::json(['appointments' => $result]);
    }

    private static function findAppt(int $id): array
    {
        $appt = Db::one('SELECT * FROM appointments WHERE id = ?', [$id]);
        if (!$appt) {
            Http::error('نوبت یافت نشد', 404);
        }
        return $appt;
    }

    public static function confirm(array $args): void
    {
        Http::requireAuth();
        $appt = self::findAppt((int) $args['id']);
        Db::exec("UPDATE appointments SET status = 'confirmed' WHERE id = ?", [(int) $appt['id']]);
        $p = Db::one('SELECT * FROM users WHERE id = ?', [(int) $appt['patient_id']]);
        if ($p && !empty($p['mobile'])) {
            $jdate = Jalali::gregorianToJalali($appt['appointment_date']);
            Sms::approve($p['mobile'], $p['full_name'], $jdate, $appt['appointment_time'], (string) $appt['id']);
        }
        Http::json(['message' => 'نوبت تایید شد']);
    }

    public static function reject(array $args): void
    {
        Http::requireAuth();
        $appt = self::findAppt((int) $args['id']);
        Db::exec("UPDATE appointments SET status = 'rejected' WHERE id = ?", [(int) $appt['id']]);
        $p = Db::one('SELECT * FROM users WHERE id = ?', [(int) $appt['patient_id']]);
        if ($p && !empty($p['mobile'])) {
            Sms::cancel($p['mobile'], $p['full_name'], Jalali::gregorianToJalali($appt['appointment_date']));
        }
        Http::json(['message' => 'نوبت رد شد']);
    }

    public static function reschedule(array $args): void
    {
        Http::requireAuth();
        $newDate = Http::str('date');
        $newTime = Http::str('time');
        if ($newDate === '' || $newTime === '') {
            Http::error('تاریخ و زمان جدید الزامی است', 400);
        }
        $appt = self::findAppt((int) $args['id']);
        Db::exec("UPDATE appointments SET appointment_date = ?, appointment_time = ?, status = 'pending' WHERE id = ?",
            [$newDate, $newTime, (int) $appt['id']]);
        $p = Db::one('SELECT * FROM users WHERE id = ?', [(int) $appt['patient_id']]);
        if ($p && !empty($p['mobile'])) {
            Sms::reschedule($p['mobile'], $p['full_name'], Jalali::gregorianToJalali($newDate), $newTime);
        }
        Http::json(['message' => 'نوبت تغییر یافت']);
    }

    public static function arrived(array $args): void
    {
        Http::requireAuth();
        $appt = self::findAppt((int) $args['id']);
        Db::exec("UPDATE appointments SET status = 'confirmed' WHERE id = ?", [(int) $appt['id']]);
        Http::json(['message' => 'بیمار حضور یافت']);
    }

    public static function absent(array $args): void
    {
        Http::requireAuth();
        $appt = self::findAppt((int) $args['id']);
        Db::exec("UPDATE appointments SET status = 'missed' WHERE id = ?", [(int) $appt['id']]);
        Http::json(['message' => 'بیمار غایب ثبت شد']);
    }

    public static function searchPatients(): void
    {
        Http::requireAuth();
        $q = (string) Http::query('q', '');
        $q = trim($q);
        if ($q === '') {
            Http::json(['patients' => []]);
        }
        $like = '%' . $q . '%';
        $patients = Db::all(
            "SELECT * FROM users WHERE role = 'patient'
             AND (full_name LIKE ? OR national_id LIKE ? OR mobile LIKE ?)",
            [$like, $like, $like]
        );
        $result = [];
        foreach ($patients as $p) {
            $appts = Db::all(
                'SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC LIMIT 5',
                [(int) $p['id']]
            );
            $result[] = [
                'id'                  => (int) $p['id'],
                'full_name'           => $p['full_name'],
                'national_id'         => $p['national_id'],
                'mobile'              => $p['mobile'],
                'underlying_diseases' => $p['underlying_diseases'] ?? '',
                'appointments'        => array_map(fn($a) => [
                    'id'     => (int) $a['id'],
                    'date'   => $a['appointment_date'],
                    'time'   => $a['appointment_time'],
                    'status' => $a['status'],
                ], $appts),
            ];
        }
        Http::json(['patients' => $result]);
    }
}
