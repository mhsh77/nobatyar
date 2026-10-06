<?php
declare(strict_types=1);

final class FeedbackController
{
    private const SCOPE = 'feedback';

    public static function register(Router $r): void
    {
        $r->post('/feedback/send-otp', [self::class, 'sendOtp']);
        $r->post('/feedback/verify-otp', [self::class, 'verifyOtp']);
        $r->post('/feedback/submit', [self::class, 'submit']);
        $r->get('/feedback/list', [self::class, 'list']);
        $r->delete('/feedback/{id}', [self::class, 'delete']);
    }

    public static function sendOtp(): void
    {
        $phone = Http::str('phone');
        if ($phone === '' || !ctype_digit($phone) || strlen($phone) < 10) {
            Http::json(['success' => false, 'error' => 'شماره معتبر وارد کنید'], 400);
        }
        $code = (string) random_int(1000, 9999);
        OtpSession::start($phone, self::SCOPE, $code, 5);
        Sms::otp($phone, $code);
        Http::json(['success' => true, 'message' => 'کد ارسال شد']);
    }

    public static function verifyOtp(): void
    {
        $phone = Http::str('phone');
        $code = Http::str('code');
        CommentController::respondVerify(OtpSession::verify($phone, self::SCOPE, $code));
    }

    public static function submit(): void
    {
        $name = Http::str('name');
        $phone = Http::str('phone');
        $rating = (int) Http::raw('rating', 5);
        $content = Http::str('content');
        if ($name === '' || $content === '') {
            Http::json(['success' => false, 'error' => 'نام و متن نظر الزامی است'], 400);
        }
        if (!OtpSession::isVerified($phone, self::SCOPE)) {
            Http::json(['success' => false, 'error' => 'شماره تایید نشده'], 400);
        }
        Db::insert('INSERT INTO survey_responses (name, phone, rating, content, created_at) VALUES (?, ?, ?, ?, ?)',
            [$name, $phone, $rating, $content, Db::nowUtc()]);
        OtpSession::clear($phone, self::SCOPE);
        Http::json(['success' => true, 'message' => 'نظر شما ثبت شد']);
    }

    public static function list(): void
    {
        $page = max(1, Http::queryInt('page', 1));
        $perPage = max(1, Http::queryInt('per_page', 50));
        $search = trim((string) Http::query('search', ''));

        $where = '';
        $params = [];
        if ($search !== '') {
            $where = ' WHERE name LIKE ? OR phone LIKE ? OR content LIKE ?';
            $like = '%' . $search . '%';
            $params = [$like, $like, $like];
        }

        $total = (int) (Db::one('SELECT COUNT(*) AS c FROM survey_responses' . $where, $params)['c'] ?? 0);
        $pages = (int) ceil($total / $perPage);
        $offset = ($page - 1) * $perPage;

        $rows = Db::all(
            'SELECT * FROM survey_responses' . $where . ' ORDER BY created_at DESC LIMIT ' . $perPage . ' OFFSET ' . $offset,
            $params
        );
        $responses = array_map(fn($r) => [
            'id'         => (int) $r['id'],
            'name'       => $r['name'],
            'phone'      => $r['phone'],
            'rating'     => (int) $r['rating'],
            'content'    => $r['content'],
            'created_at' => Util::fmtDateTime($r['created_at']),
        ], $rows);

        Http::json(['responses' => $responses, 'total' => $total, 'page' => $page, 'pages' => $pages]);
    }

    public static function delete(array $args): void
    {
        $r = Db::one('SELECT id FROM survey_responses WHERE id = ?', [(int) $args['id']]);
        if (!$r) {
            Http::error('یافت نشد', 404);
        }
        Db::exec('DELETE FROM survey_responses WHERE id = ?', [(int) $args['id']]);
        Http::json(['success' => true, 'message' => 'حذف شد']);
    }
}
