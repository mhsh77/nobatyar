<?php
declare(strict_types=1);

final class SeminarController
{
    private const SCOPE = 'seminar';

    public static function register(Router $r): void
    {
        // Paths are relative to the /seminar entry prefix.
        $r->post('/api/send-otp', [self::class, 'sendOtp']);
        $r->post('/api/verify-otp', [self::class, 'verifyOtp']);
        $r->get('/register', [self::class, 'form']);
        $r->post('/api/register', [self::class, 'submit']);
        $r->get('/api/registrations', [self::class, 'list']);
        $r->delete('/api/register/{id}', [self::class, 'delete']);
    }

    public static function sendOtp(): void
    {
        $phone = Http::str('phone');
        if ($phone === '' || !ctype_digit($phone) || strlen($phone) < 10) {
            Http::json(['success' => false, 'error' => 'شماره تماس معتبر وارد کنید'], 400);
        }
        $code = (string) random_int(1000, 9999);
        OtpSession::start($phone, self::SCOPE, $code, 5);
        $sent = Sms::otp($phone, $code);
        if (!$sent) {
            Http::json(['success' => false, 'error' => 'خطا در ارسال پیامک، لطفا دوباره تلاش کنید'], 500);
        }
        Http::json(['success' => true, 'message' => 'کد تایید ارسال شد']);
    }

    public static function verifyOtp(): void
    {
        $phone = Http::str('phone');
        $code = Http::str('code');
        CommentController::respondVerify(OtpSession::verify($phone, self::SCOPE, $code));
    }

    public static function form(): void
    {
        $path = __DIR__ . '/../../seminar/register.html';
        if (!is_file($path)) {
            Http::error('یافت نشد', 404);
        }
        if (!headers_sent()) {
            header('Content-Type: text/html; charset=utf-8');
        }
        readfile($path);
        exit;
    }

    public static function submit(): void
    {
        $phone = Http::str('phone');
        if ($phone !== '' && !OtpSession::isVerified($phone, self::SCOPE)) {
            Http::json(['success' => false, 'errors' => ['لطفا ابتدا شماره خود را تایید کنید']], 400);
        }

        $firstName = Http::str('first_name');
        $lastName = Http::str('last_name');
        $isStudent = Util::truthy(Http::raw('is_student', false));
        $fieldOfStudy = Http::str('field_of_study');
        $semester = Http::str('semester');

        $errors = [];
        if ($firstName === '') {
            $errors[] = 'نام الزامی است';
        }
        if ($lastName === '') {
            $errors[] = 'نام خانوادگی الزامی است';
        }
        if ($phone === '') {
            $errors[] = 'شماره تماس الزامی است';
        } elseif (!ctype_digit($phone) || strlen($phone) < 10) {
            $errors[] = 'شماره تماس معتبر وارد کنید';
        }
        if ($isStudent) {
            if ($fieldOfStudy === '') {
                $errors[] = 'لطفاً رشته تحصیلی خود را وارد کنید';
            }
            if ($semester === '') {
                $errors[] = 'لطفاً ترم تحصیلی خود را وارد کنید';
            }
        }
        if ($errors) {
            Http::json(['success' => false, 'errors' => $errors], 400);
        }

        Db::insert(
            'INSERT INTO seminar_registrations (first_name, last_name, phone, is_student, field_of_study, semester, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                $firstName, $lastName, $phone, $isStudent ? 1 : 0,
                $isStudent ? $fieldOfStudy : null, $isStudent ? $semester : null, Db::nowUtc(),
            ]
        );

        // Confirmation SMS (VERIFY template: Name, Title, Date)
        $title = self::setting('seminar_title', 'سمینار');
        $date = self::setting('seminar_date', '');
        if ($date !== '') {
            $date = Jalali::gregorianToJalali($date);
        }
        Sms::seminar($phone, trim($firstName . ' ' . $lastName), $title, $date);

        Http::json(['success' => true, 'message' => 'ثبت‌نام شما با موفقیت انجام شد.']);
    }

    public static function list(): void
    {
        $page = max(1, Http::queryInt('page', 1));
        $perPage = max(1, Http::queryInt('per_page', 50));
        $search = trim((string) Http::query('search', ''));

        $where = '';
        $params = [];
        if ($search !== '') {
            $where = ' WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?';
            $like = '%' . $search . '%';
            $params = [$like, $like, $like];
        }

        $total = (int) (Db::one('SELECT COUNT(*) AS c FROM seminar_registrations' . $where, $params)['c'] ?? 0);
        $pages = (int) ceil($total / $perPage);
        $offset = ($page - 1) * $perPage;

        $rows = Db::all(
            'SELECT * FROM seminar_registrations' . $where . ' ORDER BY created_at DESC LIMIT ' . $perPage . ' OFFSET ' . $offset,
            $params
        );
        $regs = array_map(fn($r) => [
            'id'             => (int) $r['id'],
            'first_name'     => $r['first_name'],
            'last_name'      => $r['last_name'],
            'phone'          => $r['phone'],
            'is_student'     => (bool) $r['is_student'],
            'field_of_study' => $r['field_of_study'] ?? '',
            'semester'       => $r['semester'] ?? '',
            'created_at'     => Util::fmtDateTime($r['created_at']),
        ], $rows);

        Http::json(['registrations' => $regs, 'total' => $total, 'page' => $page, 'pages' => $pages]);
    }

    public static function delete(array $args): void
    {
        $r = Db::one('SELECT id FROM seminar_registrations WHERE id = ?', [(int) $args['id']]);
        if (!$r) {
            Http::json(['success' => false, 'error' => 'ثبت‌نام یافت نشد'], 404);
        }
        Db::exec('DELETE FROM seminar_registrations WHERE id = ?', [(int) $args['id']]);
        Http::json(['success' => true, 'message' => 'حذف شد']);
    }

    private static function setting(string $key, string $default): string
    {
        $row = Db::one('SELECT `value` FROM site_settings WHERE `key` = ?', [$key]);
        return ($row && $row['value'] !== null && $row['value'] !== '') ? $row['value'] : $default;
    }
}
