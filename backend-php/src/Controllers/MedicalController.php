<?php
declare(strict_types=1);

final class MedicalController
{
    private const ALLOWED = ['png', 'jpg', 'jpeg', 'gif', 'pdf'];

    public static function register(Router $r): void
    {
        $r->post('/medical-records', [self::class, 'create']);
        $r->get('/medical-records/recent', [self::class, 'recent']);
        $r->get('/medical-records/detail/{id}', [self::class, 'detail']);
        $r->put('/medical-records/update/{id}', [self::class, 'update']);
        $r->delete('/medical-records/delete-image/{id}', [self::class, 'deleteImage']);
        $r->get('/medical-records/{patient_id}', [self::class, 'patientRecords']);
        $r->get('/uploads/{filename}', [self::class, 'serveUpload']);
    }

    private static function allowed(string $filename): bool
    {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return $ext !== '' && in_array($ext, self::ALLOWED, true);
    }

    /** Save uploaded files from a field, append their names to $images. */
    private static function saveImages(string $field, array $images): array
    {
        foreach (Http::files($field) as $f) {
            if (self::allowed($f['name'])) {
                $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
                $fname = bin2hex(random_bytes(16)) . '.' . $ext;
                move_uploaded_file($f['tmp_name'], Http::uploadDir() . '/' . $fname);
                $images[] = $fname;
            }
        }
        return $images;
    }

    public static function create(): void
    {
        $doctor = Http::requireStaff();

        $patientId = Http::raw('patient_id');
        $appointmentId = Http::raw('appointment_id');
        $visitDate = Http::str('visit_date');
        $fields = [
            'chief_complaint'   => Http::str('chief_complaint'),
            'history'           => Http::str('history'),
            'diagnosis'         => Http::str('diagnosis'),
            'treatment_plan'    => Http::str('treatment_plan'),
            'medications'       => Http::str('medications'),
            'insurance_company' => Http::str('insurance_company'),
            'insurance_type'    => Http::str('insurance_type'),
            'notes'             => Http::str('notes'),
        ];

        if (!$patientId || $visitDate === '') {
            Http::error('بیمار و تاریخ ویزیت الزامی است', 400);
        }
        $appointmentId = $appointmentId !== null && $appointmentId !== '' ? (int) $appointmentId : null;

        $existing = null;
        if ($appointmentId) {
            $existing = Db::one('SELECT * FROM medical_records WHERE appointment_id = ? LIMIT 1', [$appointmentId]);
        }

        if ($existing) {
            // Keep old value when a field comes in empty (mirrors `new or existing`).
            $merged = [];
            foreach ($fields as $k => $v) {
                $merged[$k] = $v !== '' ? $v : ($existing[$k] ?? '');
            }
            $images = $existing['images'] ? (json_decode($existing['images'], true) ?: []) : [];
            $images = self::saveImages('images', $images);

            Db::exec(
                'UPDATE medical_records SET chief_complaint=?, history=?, diagnosis=?, treatment_plan=?,
                    medications=?, insurance_company=?, insurance_type=?, notes=?, visit_date=?, images=?, updated_at=?
                 WHERE id=?',
                [
                    $merged['chief_complaint'], $merged['history'], $merged['diagnosis'], $merged['treatment_plan'],
                    $merged['medications'], $merged['insurance_company'], $merged['insurance_type'], $merged['notes'],
                    $visitDate, json_encode($images, JSON_UNESCAPED_UNICODE), Db::nowUtc(), (int) $existing['id'],
                ]
            );
            Http::json(['message' => 'پرونده پزشکی به‌روزرسانی شد', 'id' => (int) $existing['id']]);
        }

        $images = self::saveImages('images', []);

        if ($doctor['role'] === 'doctor') {
            $recordDoctorId = (int) $doctor['id'];
        } else {
            $doc = Db::one("SELECT id FROM users WHERE role = 'doctor' LIMIT 1");
            $recordDoctorId = $doc ? (int) $doc['id'] : (int) $doctor['id'];
        }

        $now = Db::nowUtc();
        $id = Db::insert(
            'INSERT INTO medical_records
                (patient_id, doctor_id, appointment_id, visit_date, chief_complaint, history, diagnosis,
                 treatment_plan, medications, insurance_company, insurance_type, notes, images, created_at, updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [
                (int) $patientId, $recordDoctorId, $appointmentId, $visitDate,
                $fields['chief_complaint'], $fields['history'], $fields['diagnosis'], $fields['treatment_plan'],
                $fields['medications'], $fields['insurance_company'], $fields['insurance_type'], $fields['notes'],
                $images ? json_encode($images, JSON_UNESCAPED_UNICODE) : null, $now, $now,
            ]
        );

        if ($appointmentId) {
            Db::exec("UPDATE appointments SET status = 'completed' WHERE id = ?", [$appointmentId]);
        }

        Http::json(['message' => 'پرونده پزشکی ایجاد شد', 'id' => $id], 201);
    }

    public static function recent(): void
    {
        Http::requireAuth();
        $records = Db::all('SELECT * FROM medical_records ORDER BY created_at DESC LIMIT 20');
        $result = [];
        foreach ($records as $r) {
            $p = Db::one('SELECT * FROM users WHERE id = ?', [(int) $r['patient_id']]);
            $doc = Db::one('SELECT * FROM users WHERE id = ?', [(int) $r['doctor_id']]);
            $result[] = [
                'id'             => (int) $r['id'],
                'patient_id'     => (int) $r['patient_id'],
                'patient_name'   => $p['full_name'] ?? '',
                'patient_mobile' => $p['mobile'] ?? '',
                'doctor_name'    => $doc['full_name'] ?? '',
                'appointment_id' => $r['appointment_id'] !== null ? (int) $r['appointment_id'] : null,
                'visit_date'     => $r['visit_date'],
                'diagnosis'      => $r['diagnosis'] ?? '',
                'created_at'     => Util::fmtDateTime($r['created_at']),
            ];
        }
        Http::json(['records' => $result]);
    }

    public static function patientRecords(array $args): void
    {
        Http::requireAuth();
        $records = Db::all('SELECT * FROM medical_records WHERE patient_id = ? ORDER BY visit_date DESC',
            [(int) $args['patient_id']]);
        $result = [];
        foreach ($records as $r) {
            $doc = Db::one('SELECT * FROM users WHERE id = ?', [(int) $r['doctor_id']]);
            $result[] = [
                'id'                => (int) $r['id'],
                'patient_id'        => (int) $r['patient_id'],
                'doctor_name'       => $doc['full_name'] ?? '',
                'appointment_id'    => $r['appointment_id'] !== null ? (int) $r['appointment_id'] : null,
                'visit_date'        => $r['visit_date'],
                'chief_complaint'   => $r['chief_complaint'] ?? '',
                'history'           => $r['history'] ?? '',
                'diagnosis'         => $r['diagnosis'] ?? '',
                'treatment_plan'    => $r['treatment_plan'] ?? '',
                'medications'       => $r['medications'] ?? '',
                'insurance_company' => $r['insurance_company'] ?? '',
                'insurance_type'    => $r['insurance_type'] ?? '',
                'notes'             => $r['notes'] ?? '',
                'images'            => $r['images'] ? (json_decode($r['images'], true) ?: []) : [],
                'created_at'        => Util::fmtDateTime($r['created_at']),
            ];
        }
        Http::json(['records' => $result]);
    }

    public static function detail(array $args): void
    {
        Http::requireAuth();
        $r = Db::one('SELECT * FROM medical_records WHERE id = ?', [(int) $args['id']]);
        if (!$r) {
            Http::error('پرونده یافت نشد', 404);
        }
        $doc = Db::one('SELECT * FROM users WHERE id = ?', [(int) $r['doctor_id']]);
        $p = Db::one('SELECT * FROM users WHERE id = ?', [(int) $r['patient_id']]);
        Http::json([
            'id'                  => (int) $r['id'],
            'patient_id'          => (int) $r['patient_id'],
            'patient_name'        => $p['full_name'] ?? '',
            'patient_national_id' => $p['national_id'] ?? '',
            'patient_mobile'      => $p['mobile'] ?? '',
            'patient_diseases'    => $p['underlying_diseases'] ?? '',
            'doctor_name'         => $doc['full_name'] ?? '',
            'appointment_id'      => $r['appointment_id'] !== null ? (int) $r['appointment_id'] : null,
            'visit_date'          => $r['visit_date'],
            'chief_complaint'     => $r['chief_complaint'] ?? '',
            'history'             => $r['history'] ?? '',
            'diagnosis'           => $r['diagnosis'] ?? '',
            'treatment_plan'      => $r['treatment_plan'] ?? '',
            'medications'         => $r['medications'] ?? '',
            'insurance_company'   => $r['insurance_company'] ?? '',
            'insurance_type'      => $r['insurance_type'] ?? '',
            'notes'               => $r['notes'] ?? '',
            'images'              => $r['images'] ? (json_decode($r['images'], true) ?: []) : [],
            'created_at'          => Util::fmtDateTime($r['created_at']),
            'updated_at'          => Util::fmtDateTime($r['updated_at']),
        ]);
    }

    public static function update(array $args): void
    {
        Http::requireStaff();
        $r = Db::one('SELECT * FROM medical_records WHERE id = ?', [(int) $args['id']]);
        if (!$r) {
            Http::error('پرونده یافت نشد', 404);
        }
        $in = Http::input();
        $get = fn($k) => array_key_exists($k, $in) ? trim((string) $in[$k]) : ($r[$k] ?? '');

        $visitDate = (array_key_exists('visit_date', $in) && trim((string) $in['visit_date']) !== '')
            ? trim((string) $in['visit_date']) : $r['visit_date'];

        $images = $r['images'] ? (json_decode($r['images'], true) ?: []) : [];
        $images = self::saveImages('images', $images);

        Db::exec(
            'UPDATE medical_records SET chief_complaint=?, history=?, diagnosis=?, treatment_plan=?,
                medications=?, insurance_company=?, insurance_type=?, notes=?, visit_date=?, images=?, updated_at=?
             WHERE id=?',
            [
                $get('chief_complaint'), $get('history'), $get('diagnosis'), $get('treatment_plan'),
                $get('medications'), $get('insurance_company'), $get('insurance_type'), $get('notes'),
                $visitDate, json_encode($images, JSON_UNESCAPED_UNICODE), Db::nowUtc(), (int) $r['id'],
            ]
        );
        Http::json(['message' => 'پرونده پزشکی به‌روزرسانی شد']);
    }

    public static function deleteImage(array $args): void
    {
        Http::requireStaff();
        $filename = Http::str('filename');
        if ($filename === '') {
            Http::error('نام فایل الزامی است', 400);
        }
        $r = Db::one('SELECT * FROM medical_records WHERE id = ?', [(int) $args['id']]);
        if (!$r) {
            Http::error('پرونده یافت نشد', 404);
        }
        $images = $r['images'] ? (json_decode($r['images'], true) ?: []) : [];
        if (in_array($filename, $images, true)) {
            $images = array_values(array_filter($images, fn($x) => $x !== $filename));
            $fpath = Http::uploadDir() . '/' . basename($filename);
            if (is_file($fpath)) {
                @unlink($fpath);
            }
        }
        Db::exec('UPDATE medical_records SET images = ? WHERE id = ?',
            [$images ? json_encode($images, JSON_UNESCAPED_UNICODE) : null, (int) $r['id']]);
        Http::json(['message' => 'تصویر حذف شد']);
    }

    /** Fallback file server for /api/uploads/{filename} (the .htaccess serves existing files directly). */
    public static function serveUpload(array $args): void
    {
        $name = basename($args['filename']);
        $path = Http::uploadDir() . '/' . $name;
        if (!is_file($path)) {
            Http::error('یافت نشد', 404);
        }
        $mime = [
            'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif', 'webp' => 'image/webp', 'pdf' => 'application/pdf',
        ][strtolower(pathinfo($name, PATHINFO_EXTENSION))] ?? 'application/octet-stream';
        if (!headers_sent()) {
            header('Content-Type: ' . $mime);
            header('Content-Length: ' . filesize($path));
            header('Cache-Control: public, max-age=86400');
        }
        readfile($path);
        exit;
    }
}
