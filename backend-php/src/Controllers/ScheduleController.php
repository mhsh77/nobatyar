<?php
declare(strict_types=1);

final class ScheduleController
{
    public const WEEKDAYS_LIST = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

    public static function register(Router $r): void
    {
        $r->get('/schedule/weekly-grid', [self::class, 'weeklyGrid']);
        $r->get('/schedule', [self::class, 'getSchedule']);
        $r->post('/schedule', [self::class, 'createSchedule']);
        $r->delete('/schedule/{id}', [self::class, 'deleteSchedule']);
        $r->get('/closed-days', [self::class, 'getClosedDays']);
        $r->post('/closed-days', [self::class, 'addClosedDay']);
        $r->delete('/closed-days/{id}', [self::class, 'removeClosedDay']);
        $r->get('/public/schedule', [self::class, 'publicSchedule']);
    }

    private static function pyToPersian(int $py): int
    {
        return AppointmentController::persianWeekday($py);
    }

    /** Like generateSlots but no past-date guard, and can exclude one appointment. */
    private static function availableSlotsForDate(string $dateStr, ?int $excludeId = null): array
    {
        $d = DateTime::createFromFormat('!Y-m-d', $dateStr, AppointmentController::tz());
        if (!$d || $d->format('Y-m-d') !== $dateStr) {
            return [];
        }
        $weekday = AppointmentController::pyWeekday($dateStr);
        $schedules = Db::all('SELECT * FROM doctor_schedule WHERE weekday = ?', [$weekday]);
        if (!$schedules) {
            return [];
        }
        if (Db::one('SELECT id FROM closed_days WHERE closed_date = ? LIMIT 1', [$dateStr])) {
            return [];
        }
        $allSlots = AppointmentController::slotsFromSchedules($schedules);

        if ($excludeId) {
            $booked = Db::all(
                "SELECT appointment_time FROM appointments
                 WHERE appointment_date = ? AND status IN ('pending','confirmed') AND id != ?",
                [$dateStr, $excludeId]
            );
        } else {
            $booked = Db::all(
                "SELECT appointment_time FROM appointments
                 WHERE appointment_date = ? AND status IN ('pending','confirmed')",
                [$dateStr]
            );
        }
        $bookedTimes = array_column($booked, 'appointment_time');
        return array_values(array_filter($allSlots, fn($s) => !in_array($s, $bookedTimes, true)));
    }

    /** Port of migrate_extra_appointments(): keep future appointments on valid slots. */
    private static function migrateExtraAppointments(): int
    {
        $today = AppointmentController::todayDate()->format('Y-m-d');
        $appts = Db::all(
            "SELECT * FROM appointments
             WHERE appointment_date >= ? AND status IN ('pending','confirmed') ORDER BY id",
            [$today]
        );
        $moved = 0;

        foreach ($appts as $a) {
            $dateStr = $a['appointment_date'];
            $weekday = AppointmentController::pyWeekday($dateStr);
            $hasSchedule = count(Db::all('SELECT id FROM doctor_schedule WHERE weekday = ?', [$weekday])) > 0;
            $closed = (bool) Db::one('SELECT id FROM closed_days WHERE closed_date = ? LIMIT 1', [$dateStr]);
            $isValid = $hasSchedule && !$closed;

            if (!$isValid) {
                $slots = self::availableSlotsForDate($dateStr);
                if ($slots) {
                    Db::exec('UPDATE appointments SET appointment_time = ? WHERE id = ?', [$slots[0], (int) $a['id']]);
                    $moved++;
                    continue;
                }
                for ($offset = 1; $offset < 14; $offset++) {
                    $newDate = (new DateTime($dateStr, AppointmentController::tz()))->modify("+$offset day")->format('Y-m-d');
                    $slots = self::availableSlotsForDate($newDate);
                    if ($slots) {
                        Db::exec('UPDATE appointments SET appointment_date = ?, appointment_time = ? WHERE id = ?',
                            [$newDate, $slots[0], (int) $a['id']]);
                        $moved++;
                        break;
                    }
                }
            } else {
                $scheduleSlots = self::availableSlotsForDate($dateStr, (int) $a['id']);
                $allScheduleSlots = AppointmentController::slotsFromSchedules(
                    Db::all('SELECT * FROM doctor_schedule WHERE weekday = ?', [$weekday])
                );
                if (!in_array($a['appointment_time'], $allScheduleSlots, true)) {
                    if ($scheduleSlots) {
                        Db::exec('UPDATE appointments SET appointment_time = ? WHERE id = ?',
                            [$scheduleSlots[0], (int) $a['id']]);
                        $moved++;
                    }
                } elseif (!in_array($a['appointment_time'], $scheduleSlots, true)) {
                    $clash = Db::all(
                        "SELECT id FROM appointments
                         WHERE appointment_date = ? AND appointment_time = ?
                           AND status IN ('pending','confirmed') AND id != ?",
                        [$dateStr, $a['appointment_time'], (int) $a['id']]
                    );
                    if (count($clash) > 0 && $scheduleSlots) {
                        Db::exec('UPDATE appointments SET appointment_time = ? WHERE id = ?',
                            [$scheduleSlots[0], (int) $a['id']]);
                        $moved++;
                    }
                }
            }
        }
        return $moved;
    }

    public static function getSchedule(): void
    {
        Http::requireAuth();
        $rows = Db::all('SELECT * FROM doctor_schedule');
        $result = [];
        foreach ($rows as $s) {
            $pw = self::pyToPersian((int) $s['weekday']);
            $result[] = [
                'id'             => (int) $s['id'],
                'weekday'        => $pw,
                'weekday_name'   => self::WEEKDAYS_LIST[$pw],
                'start_time'     => $s['start_time'],
                'end_time'       => $s['end_time'],
                'visit_duration' => (int) $s['visit_duration'],
            ];
        }
        usort($result, fn($a, $b) => $a['weekday'] <=> $b['weekday']);
        Http::json(['schedule' => $result]);
    }

    public static function createSchedule(): void
    {
        Http::requireAuth();
        $weekday = Http::raw('weekday');
        $startTime = Http::str('start_time');
        $endTime = Http::str('end_time');
        $visitDuration = Http::raw('visit_duration', 20);

        if ($weekday === null || $startTime === '' || $endTime === '') {
            Http::error('تمامی فیلدها الزامی است', 400);
        }
        if ($startTime >= $endTime) {
            Http::error('زمان شروع باید قبل از پایان باشد', 400);
        }
        $pyWeekday = AppointmentController::pymod((int) $weekday - 2, 7);
        $id = Db::insert(
            'INSERT INTO doctor_schedule (weekday, start_time, end_time, visit_duration) VALUES (?, ?, ?, ?)',
            [$pyWeekday, $startTime, $endTime, (int) $visitDuration]
        );
        $moved = self::migrateExtraAppointments();
        $msg = 'برنامه اضافه شد' . ($moved ? " — $moved نوبت به روز شد" : '');
        Http::json(['message' => $msg, 'id' => $id], 201);
    }

    public static function deleteSchedule(array $args): void
    {
        Http::requireAuth();
        $row = Db::one('SELECT id FROM doctor_schedule WHERE id = ?', [(int) $args['id']]);
        if (!$row) {
            Http::error('برنامه یافت نشد', 404);
        }
        Db::exec('DELETE FROM doctor_schedule WHERE id = ?', [(int) $args['id']]);
        $moved = self::migrateExtraAppointments();
        $msg = 'برنامه حذف شد' . ($moved ? " — $moved نوبت به روز شد" : '');
        Http::json(['message' => $msg]);
    }

    public static function getClosedDays(): void
    {
        Http::requireAuth();
        $today = AppointmentController::todayDate()->format('Y-m-d');
        $rows = Db::all('SELECT * FROM closed_days WHERE closed_date >= ? ORDER BY closed_date', [$today]);
        $result = array_map(fn($d) => [
            'id'     => (int) $d['id'],
            'date'   => $d['closed_date'],
            'reason' => $d['reason'] ?? '',
        ], $rows);
        Http::json(['closed_days' => $result]);
    }

    public static function addClosedDay(): void
    {
        Http::requireAuth();
        $closedDate = Http::str('date');
        $reason = Http::str('reason');
        if ($closedDate === '') {
            Http::error('تاریخ الزامی است', 400);
        }
        if (Db::one('SELECT id FROM closed_days WHERE closed_date = ? LIMIT 1', [$closedDate])) {
            Http::error('این تاریخ قبلاً ثبت شده است', 400);
        }
        $id = Db::insert('INSERT INTO closed_days (closed_date, reason, created_at) VALUES (?, ?, ?)',
            [$closedDate, $reason, Db::nowUtc()]);
        $moved = self::migrateExtraAppointments();
        $msg = 'روز تعطیل اضافه شد' . ($moved ? " — $moved نوبت به روز شد" : '');
        Http::json(['message' => $msg, 'id' => $id], 201);
    }

    public static function removeClosedDay(array $args): void
    {
        Http::requireAuth();
        $row = Db::one('SELECT id FROM closed_days WHERE id = ?', [(int) $args['id']]);
        if (!$row) {
            Http::error('یافت نشد', 404);
        }
        Db::exec('DELETE FROM closed_days WHERE id = ?', [(int) $args['id']]);
        $moved = self::migrateExtraAppointments();
        $msg = 'روز تعطیل حذف شد' . ($moved ? " — $moved نوبت به روز شد" : '');
        Http::json(['message' => $msg]);
    }

    public static function weeklyGrid(): void
    {
        Http::requireAuth();
        $offset = Http::queryInt('offset', 0);
        $today = AppointmentController::todayDate();
        $weekStart = (clone $today)->modify('-3 day')->modify(($offset * 7) . ' day');

        $grid = [];
        $allTimes = [];

        for ($dayOffset = 0; $dayOffset < 7; $dayOffset++) {
            $dateObj = (clone $weekStart)->modify("+$dayOffset day");
            $dateStr = $dateObj->format('Y-m-d');
            $pyWd = AppointmentController::pyWeekday($dateStr);
            $persianWd = self::pyToPersian($pyWd);

            $schedules = Db::all('SELECT * FROM doctor_schedule WHERE weekday = ?', [$pyWd]);
            $hasSchedule = count($schedules) > 0;
            $isClosed = (bool) Db::one('SELECT id FROM closed_days WHERE closed_date = ? LIMIT 1', [$dateStr]);

            $daySlots = ($hasSchedule && !$isClosed)
                ? AppointmentController::slotsFromSchedules($schedules) : [];

            $bookedAppts = Db::all(
                "SELECT * FROM appointments WHERE appointment_date = ?
                 AND status IN ('pending','confirmed','completed','missed','rejected')",
                [$dateStr]
            );
            $bookedByTime = [];
            foreach ($bookedAppts as $a) {
                $patient = Db::one('SELECT * FROM users WHERE id = ?', [(int) $a['patient_id']]);
                $patientName = 'نامشخص';
                if ($patient) {
                    $patientName = $patient['full_name'];
                    if (!empty($patient['underlying_diseases'])) {
                        $patientName .= ' (' . $patient['underlying_diseases'] . ')';
                    }
                }
                $t = $a['appointment_time'];
                $bookedByTime[$t][] = ['patient_name' => $patientName, 'status' => $a['status']];
            }

            $slotsData = [];
            foreach ($daySlots as $t) {
                if (isset($bookedByTime[$t])) {
                    foreach ($bookedByTime[$t] as $b) {
                        $slotsData[] = [
                            'time'               => $t,
                            'status'             => 'booked',
                            'patient_name'       => $b['patient_name'],
                            'appointment_status' => $b['status'],
                        ];
                    }
                } else {
                    $slotsData[] = [
                        'time'               => $t,
                        'status'             => 'available',
                        'patient_name'       => '',
                        'appointment_status' => '',
                    ];
                }
            }

            $extraSlots = [];
            foreach ($bookedByTime as $t => $bookings) {
                if (!in_array($t, $daySlots, true)) {
                    foreach ($bookings as $b) {
                        $extraSlots[] = [
                            'time'               => $t,
                            'status'             => 'booked',
                            'patient_name'       => $b['patient_name'],
                            'appointment_status' => $b['status'],
                        ];
                    }
                }
            }

            $grid[] = [
                'day_index'    => $persianWd,
                'day_name'     => self::WEEKDAYS_LIST[$persianWd],
                'date'         => $dateStr,
                'has_schedule' => $hasSchedule,
                'is_closed'    => $isClosed,
                'slots'        => $slotsData,
                'extra_slots'  => $extraSlots,
            ];

            foreach ($daySlots as $s) {
                if (!in_array($s, $allTimes, true)) {
                    $allTimes[] = $s;
                }
            }
        }

        sort($allTimes);
        Http::json(['grid' => $grid, 'all_times' => $allTimes]);
    }

    public static function publicSchedule(): void
    {
        $today = AppointmentController::todayDate();
        $days = [];
        for ($persianWd = 0; $persianWd < 7; $persianWd++) {
            $pyWd = AppointmentController::pymod($persianWd - 2, 7);
            $schedules = Db::all('SELECT * FROM doctor_schedule WHERE weekday = ?', [$pyWd]);
            $hasSchedule = count($schedules) > 0;
            $status = 'active';
            $hours = '';
            if ($hasSchedule) {
                $s = $schedules[0];
                $hours = $s['start_time'] . ' - ' . $s['end_time'];
            } else {
                $status = 'inactive';
            }
            $days[] = [
                'day_index'    => $persianWd,
                'day_name'     => self::WEEKDAYS_LIST[$persianWd],
                'status'       => $status,
                'hours'        => $hours,
                'has_schedule' => $hasSchedule,
            ];
        }
        $todayPersian = self::pyToPersian(AppointmentController::pyWeekday($today->format('Y-m-d')));
        Http::json(['days' => $days, 'today_index' => $todayPersian]);
    }
}
