<?php
declare(strict_types=1);

final class AppointmentController
{
    public const WEEKDAYS_FA = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

    public static function register(Router $r): void
    {
        $r->get('/appointments/days', [self::class, 'days']);
        $r->get('/appointments/slots', [self::class, 'slots']);
        $r->post('/appointments/book', [self::class, 'book']);
        $r->get('/appointments/last', [self::class, 'last']);
        $r->get('/appointments/last/{patient_id}', [self::class, 'last']);
        $r->get('/appointments/today', [self::class, 'today']);
        $r->get('/appointments/upcoming', [self::class, 'upcoming']);
        $r->get('/appointments/next', [self::class, 'next']);
        $r->get('/appointments/count/today', [self::class, 'countToday']);
        $r->patch('/appointments/{id}/status', [self::class, 'updateStatus']);
    }

    // ---- helpers ----

    public static function tz(): DateTimeZone
    {
        return new DateTimeZone((string) Config::get('TIMEZONE', 'Asia/Tehran'));
    }

    public static function pymod(int $a, int $n): int
    {
        return (($a % $n) + $n) % $n;
    }

    /** Python datetime.weekday(): Monday=0 .. Sunday=6 */
    public static function pyWeekday(string $dateStr): int
    {
        $d = DateTime::createFromFormat('!Y-m-d', $dateStr, new DateTimeZone('UTC'));
        return (int) $d->format('N') - 1;
    }

    public static function persianWeekday(int $py): int
    {
        return self::pymod($py + 2, 7);
    }

    public static function todayDate(): DateTime
    {
        return new DateTime('now', self::tz());
    }

    /** @return string[] available HH:MM slots for a date */
    public static function generateSlots(string $dateStr): array
    {
        $d = DateTime::createFromFormat('!Y-m-d', $dateStr, self::tz());
        if (!$d || $d->format('Y-m-d') !== $dateStr) {
            return [];
        }
        $today = self::todayDate();
        $dOnly = $d->format('Y-m-d');
        $tOnly = $today->format('Y-m-d');

        if ($dOnly <= $tOnly) {
            $existingToday = Db::one(
                "SELECT id FROM appointments WHERE appointment_date = ? AND status = 'pending' LIMIT 1",
                [$dateStr]
            );
            if ($dOnly < $tOnly && !$existingToday) {
                return [];
            }
        }

        $weekday = self::pyWeekday($dateStr);
        $schedules = Db::all('SELECT * FROM doctor_schedule WHERE weekday = ?', [$weekday]);
        if (!$schedules) {
            return [];
        }
        if (Db::one('SELECT id FROM closed_days WHERE closed_date = ? LIMIT 1', [$dateStr])) {
            return [];
        }

        $allSlots = self::slotsFromSchedules($schedules);

        $booked = Db::all(
            "SELECT appointment_time FROM appointments
             WHERE appointment_date = ? AND status IN ('pending','confirmed')",
            [$dateStr]
        );
        $bookedTimes = array_column($booked, 'appointment_time');
        return array_values(array_filter($allSlots, fn($s) => !in_array($s, $bookedTimes, true)));
    }

    /** Expand schedule rows into ordered unique HH:MM slot starts. */
    public static function slotsFromSchedules(array $schedules): array
    {
        $all = [];
        foreach ($schedules as $s) {
            [$sh, $sm] = array_map('intval', explode(':', $s['start_time']));
            [$eh, $em] = array_map('intval', explode(':', $s['end_time']));
            $duration = (int) $s['visit_duration'];
            if ($duration <= 0) {
                continue;
            }
            $cur = $sh * 60 + $sm;
            $end = $eh * 60 + $em;
            while ($cur + $duration <= $end) {
                $t = sprintf('%02d:%02d', intdiv($cur, 60), $cur % 60);
                if (!in_array($t, $all, true)) {
                    $all[] = $t;
                }
                $cur += $duration;
            }
        }
        return $all;
    }

    private static function countByPeriod(array $slots): array
    {
        $morning = array_filter($slots, fn($s) => $s < '13:00');
        $afternoon = array_filter($slots, fn($s) => $s >= '13:00');
        return [count($morning), count($afternoon)];
    }

    // ---- endpoints ----

    public static function days(): void
    {
        $today = self::todayDate();
        $daysData = [];
        for ($i = 0; $i < 14; $i++) {
            $dateObj = (clone $today)->modify("+$i day");
            if ($dateObj->format('Y-m-d') <= $today->format('Y-m-d')) {
                continue;
            }
            $dateStr = $dateObj->format('Y-m-d');
            $weekday = self::pyWeekday($dateStr);

            $schedules = Db::all('SELECT id FROM doctor_schedule WHERE weekday = ?', [$weekday]);
            $hasSchedule = count($schedules) > 0;
            $isClosed = (bool) Db::one('SELECT id FROM closed_days WHERE closed_date = ? LIMIT 1', [$dateStr]);

            $slots = ($hasSchedule && !$isClosed) ? self::generateSlots($dateStr) : [];
            [$morning, $afternoon] = self::countByPeriod($slots);
            $total = $morning + $afternoon;

            $status = 'available';
            $statusText = '';
            if (!$hasSchedule) {
                $status = 'no_schedule';
                $statusText = 'تعطیل پزشک';
            } elseif ($isClosed) {
                $status = 'closed';
                $statusText = 'تعطیل';
            } elseif ($total === 0) {
                $status = 'full';
                $statusText = 'ظرفیت کامل';
            }

            $pw = self::persianWeekday($weekday);
            $daysData[] = [
                'date'            => $dateStr,
                'weekday'         => $pw,
                'weekday_name'    => self::WEEKDAYS_FA[$pw],
                'has_schedule'    => $hasSchedule,
                'is_closed'       => $isClosed,
                'status'          => $status,
                'status_text'     => $statusText,
                'total_available' => $total,
                'morning_count'   => $morning,
                'afternoon_count' => $afternoon,
            ];
        }
        Http::json(['days' => $daysData]);
    }

    public static function slots(): void
    {
        $dateStr = (string) Http::query('date', '');
        if ($dateStr === '') {
            Http::error('تاریخ الزامی است', 400);
        }
        $slots = self::generateSlots($dateStr);
        [$morning, $afternoon] = self::countByPeriod($slots);
        Http::json([
            'slots'           => $slots,
            'date'            => $dateStr,
            'morning_count'   => $morning,
            'afternoon_count' => $afternoon,
            'total_available' => count($slots),
        ]);
    }

    public static function book(): void
    {
        $patientId = Http::raw('patient_id');
        $dateStr = Http::str('date');
        $period = Http::str('period');

        if (!$patientId || $dateStr === '' || $period === '') {
            Http::error('تمامی فیلدها الزامی است', 400);
        }
        if (!in_array($period, ['morning', 'afternoon'], true)) {
            Http::error('نوع نوبت صبح یا ظهر را انتخاب کنید', 400);
        }

        $patient = Db::one('SELECT * FROM users WHERE id = ?', [(int) $patientId]);
        if (!$patient || $patient['role'] !== 'patient') {
            Http::error('بیمار یافت نشد', 404);
        }

        $d = DateTime::createFromFormat('!Y-m-d', $dateStr, self::tz());
        if (!$d || $d->format('Y-m-d') !== $dateStr) {
            Http::error('فرمت تاریخ نامعتبر است', 400);
        }
        if ($d->format('Y-m-d') < self::todayDate()->format('Y-m-d')) {
            Http::error('تاریخ گذشته قابل انتخاب نیست', 400);
        }
        if (Db::one('SELECT id FROM closed_days WHERE closed_date = ? LIMIT 1', [$dateStr])) {
            Http::error('این روز تعطیل است', 400);
        }

        $available = self::generateSlots($dateStr);
        $periodSlots = $period === 'morning'
            ? array_values(array_filter($available, fn($s) => $s < '13:00'))
            : array_values(array_filter($available, fn($s) => $s >= '13:00'));

        if (!$periodSlots) {
            Http::error('هیچ نوبت خالی در این بازه وجود ندارد', 400);
        }
        $assignedTime = $periodSlots[0];

        $apptId = Db::insert(
            'INSERT INTO appointments (patient_id, appointment_date, appointment_time, status, created_at, reminder_sent)
             VALUES (?, ?, ?, ?, ?, 0)',
            [(int) $patientId, $dateStr, $assignedTime, 'pending', Db::nowUtc()]
        );

        $jalali = Jalali::gregorianToJalali($dateStr);

        Sms::booking($patient['mobile'], $patient['full_name'], $jalali, $assignedTime, (string) $apptId);
        foreach (Db::all("SELECT mobile, full_name FROM users WHERE role = 'doctor'") as $doc) {
            if (!empty($doc['mobile'])) {
                Sms::doctor($doc['mobile'], $patient['full_name'], $jalali, $assignedTime);
            }
        }

        Http::json([
            'message'     => 'نوبت با موفقیت ثبت شد',
            'appointment' => [
                'id'           => $apptId,
                'date'         => $dateStr,
                'time'         => $assignedTime,
                'status'       => 'pending',
                'patient_name' => $patient['full_name'],
            ],
        ]);
    }

    public static function last(array $args = []): void
    {
        $patientId = isset($args['patient_id']) ? (int) $args['patient_id'] : null;
        if (!$patientId) {
            $mobile = (string) Http::query('mobile', '');
            if ($mobile === '') {
                Http::error('شناسه بیمار الزامی است', 400);
            }
            $user = Db::one('SELECT * FROM users WHERE mobile = ?', [$mobile]);
            if (!$user) {
                Http::error('بیمار یافت نشد', 404);
            }
            $patientId = (int) $user['id'];
        }

        $appt = Db::one('SELECT * FROM appointments WHERE patient_id = ? ORDER BY id DESC LIMIT 1', [$patientId]);
        if (!$appt) {
            Http::error('نوبتی یافت نشد', 404);
        }
        $patient = Db::one('SELECT * FROM users WHERE id = ?', [$patientId]);
        Http::json([
            'appointment' => [
                'id'             => (int) $appt['id'],
                'date'           => $appt['appointment_date'],
                'time'           => $appt['appointment_time'],
                'status'         => $appt['status'],
                'patient_name'   => $patient['full_name'],
                'patient_mobile' => $patient['mobile'],
            ],
        ]);
    }

    public static function today(): void
    {
        Http::requireAuth();
        $today = self::todayDate()->format('Y-m-d');
        $appts = Db::all('SELECT * FROM appointments WHERE appointment_date = ? ORDER BY appointment_time', [$today]);
        Http::json(['appointments' => self::serialize($appts), 'date' => $today]);
    }

    public static function upcoming(): void
    {
        Http::requireAuth();
        $today = self::todayDate()->format('Y-m-d');
        $status = (string) Http::query('status', '');
        if ($status !== '') {
            $appts = Db::all(
                'SELECT * FROM appointments WHERE appointment_date >= ? AND status = ?
                 ORDER BY appointment_date, appointment_time',
                [$today, $status]
            );
        } else {
            $appts = Db::all(
                'SELECT * FROM appointments WHERE appointment_date >= ?
                 ORDER BY appointment_date, appointment_time',
                [$today]
            );
        }
        Http::json(['appointments' => self::serialize($appts)]);
    }

    public static function next(): void
    {
        Http::requireAuth();
        $now = self::todayDate();
        $today = $now->format('Y-m-d');
        $nowTime = $now->format('H:i');
        $appt = Db::one(
            "SELECT * FROM appointments
             WHERE appointment_date = ? AND appointment_time >= ? AND status IN ('pending','confirmed')
             ORDER BY appointment_time LIMIT 1",
            [$today, $nowTime]
        );
        if (!$appt) {
            Http::json(['appointment' => null]);
        }
        $patient = Db::one('SELECT * FROM users WHERE id = ?', [(int) $appt['patient_id']]);
        Http::json([
            'appointment' => [
                'id'             => (int) $appt['id'],
                'time'           => $appt['appointment_time'],
                'patient_name'   => $patient['full_name'] ?? 'نامشخص',
                'patient_mobile' => $patient['mobile'] ?? '',
                'status'         => $appt['status'],
            ],
        ]);
    }

    public static function countToday(): void
    {
        Http::requireAuth();
        $today = self::todayDate()->format('Y-m-d');
        $c = fn($status) => (int) (Db::one(
            'SELECT COUNT(*) AS c FROM appointments WHERE appointment_date = ?'
            . ($status ? ' AND status = ?' : ''),
            $status ? [$today, $status] : [$today]
        )['c'] ?? 0);
        Http::json([
            'total'     => $c(null),
            'pending'   => $c('pending'),
            'completed' => $c('completed'),
            'missed'    => $c('missed'),
            'confirmed' => $c('confirmed'),
        ]);
    }

    public static function updateStatus(array $args): void
    {
        Http::requireAuth();
        $status = Http::str('status');
        if (!in_array($status, ['completed', 'missed', 'confirmed', 'rejected'], true)) {
            Http::error('وضعیت نامعتبر است', 400);
        }
        $appt = Db::one('SELECT * FROM appointments WHERE id = ?', [(int) $args['id']]);
        if (!$appt) {
            Http::error('نوبت یافت نشد', 404);
        }

        $time = $appt['appointment_time'];
        $newTime = Http::str('time');
        if ($status === 'confirmed' && $newTime !== '') {
            $time = $newTime;
        }
        Db::exec('UPDATE appointments SET status = ?, appointment_time = ? WHERE id = ?',
            [$status, $time, (int) $appt['id']]);

        if ($status === 'confirmed' || $status === 'rejected') {
            $patient = Db::one('SELECT * FROM users WHERE id = ?', [(int) $appt['patient_id']]);
            if ($patient && !empty($patient['mobile'])) {
                $jdate = Jalali::gregorianToJalali($appt['appointment_date']);
                if ($status === 'confirmed') {
                    Sms::approve($patient['mobile'], $patient['full_name'], $jdate, $time, (string) $appt['id']);
                } else {
                    Sms::cancel($patient['mobile'], $patient['full_name'], $jdate);
                }
            }
        }
        Http::json(['message' => 'وضعیت به‌روزرسانی شد', 'status' => $status]);
    }

    /** Mirror serialize_appointments(). */
    public static function serialize(array $appts): array
    {
        $result = [];
        foreach ($appts as $a) {
            $p = Db::one('SELECT * FROM users WHERE id = ?', [(int) $a['patient_id']]);
            $result[] = [
                'id'                   => (int) $a['id'],
                'patient_id'           => (int) $a['patient_id'],
                'patient_name'         => $p['full_name'] ?? 'نامشخص',
                'patient_national_id'  => $p['national_id'] ?? '',
                'patient_mobile'       => $p['mobile'] ?? '',
                'patient_diseases'     => $p['underlying_diseases'] ?? '',
                'date'                 => $a['appointment_date'],
                'time'                 => $a['appointment_time'],
                'status'               => $a['status'],
            ];
        }
        return $result;
    }
}
