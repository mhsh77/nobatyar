<?php
declare(strict_types=1);

final class CommentController
{
    private const SCOPE = 'comment';

    public static function register(Router $r): void
    {
        $r->post('/comments/send-otp', [self::class, 'sendOtp']);
        $r->post('/comments/verify-otp', [self::class, 'verifyOtp']);
        $r->get('/comments/admin/{post_id}', [self::class, 'adminList']);
        $r->post('/comments/{comment_id}/reply', [self::class, 'reply']);
        $r->put('/comments/{comment_id}/approve', [self::class, 'approve']);
        $r->delete('/comments/{comment_id}', [self::class, 'delete']);
        $r->get('/comments/{post_id}', [self::class, 'list']);
        $r->post('/comments/{post_id}', [self::class, 'add']);
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
        self::respondVerify(OtpSession::verify($phone, self::SCOPE, $code));
    }

    public static function respondVerify(string $result): void
    {
        switch ($result) {
            case 'ok':
                Http::json(['success' => true, 'message' => 'تایید شد']);
            case 'missing':
                Http::json(['success' => false, 'error' => 'کدی ارسال نشده'], 400);
            case 'expired':
                Http::json(['success' => false, 'error' => 'کد منقضی شد'], 400);
            default:
                Http::json(['success' => false, 'error' => 'کد نامعتبر'], 400);
        }
    }

    public static function list(array $args): void
    {
        $postId = (int) $args['post_id'];
        if (!Db::one('SELECT id FROM posts WHERE id = ?', [$postId])) {
            Http::error('پست یافت نشد', 404);
        }
        $top = Db::all(
            'SELECT * FROM comments WHERE post_id = ? AND approved = 1 AND parent_id IS NULL ORDER BY created_at DESC',
            [$postId]
        );
        $result = [];
        foreach ($top as $c) {
            $replies = Db::all('SELECT * FROM comments WHERE parent_id = ? ORDER BY created_at ASC', [(int) $c['id']]);
            $result[] = [
                'id'         => (int) $c['id'],
                'name'       => $c['name'],
                'content'    => $c['content'],
                'created_at' => Util::fmtDateTime($c['created_at']),
                'replies'    => array_map(fn($rr) => [
                    'id'         => (int) $rr['id'],
                    'name'       => $rr['name'],
                    'content'    => $rr['content'],
                    'created_at' => Util::fmtDateTime($rr['created_at']),
                ], $replies),
            ];
        }
        Http::json(['comments' => $result]);
    }

    public static function add(array $args): void
    {
        $postId = (int) $args['post_id'];
        if (!Db::one('SELECT id FROM posts WHERE id = ?', [$postId])) {
            Http::error('پست یافت نشد', 404);
        }
        $name = Http::str('name');
        $phone = Http::str('phone');
        $content = Http::str('content');
        if ($name === '' || $content === '') {
            Http::error('نام و متن نظر الزامی است', 400);
        }
        if (!OtpSession::isVerified($phone, self::SCOPE)) {
            Http::error('شماره تایید نشده', 400);
        }
        Db::insert('INSERT INTO comments (post_id, name, phone, content, approved, created_at) VALUES (?, ?, ?, ?, 0, ?)',
            [$postId, $name, $phone, $content, Db::nowUtc()]);
        OtpSession::clear($phone, self::SCOPE);
        Http::json(['success' => true, 'message' => 'نظر شما با موفقیت ثبت شد و پس از تایید نمایش داده می‌شود']);
    }

    public static function adminList(array $args): void
    {
        Http::requireStaff();
        $postId = (int) $args['post_id'];
        $top = Db::all('SELECT * FROM comments WHERE post_id = ? AND parent_id IS NULL ORDER BY created_at DESC', [$postId]);
        $result = [];
        foreach ($top as $c) {
            $replies = Db::all('SELECT * FROM comments WHERE parent_id = ? ORDER BY created_at ASC', [(int) $c['id']]);
            $result[] = [
                'id'         => (int) $c['id'],
                'name'       => $c['name'],
                'phone'      => $c['phone'],
                'content'    => $c['content'],
                'approved'   => (bool) $c['approved'],
                'created_at' => Util::fmtDateTime($c['created_at']),
                'replies'    => array_map(fn($rr) => [
                    'id'         => (int) $rr['id'],
                    'name'       => $rr['name'],
                    'phone'      => $rr['phone'],
                    'content'    => $rr['content'],
                    'approved'   => (bool) $rr['approved'],
                    'created_at' => Util::fmtDateTime($rr['created_at']),
                    'is_reply'   => true,
                ], $replies),
            ];
        }
        Http::json(['comments' => $result]);
    }

    public static function reply(array $args): void
    {
        Http::requireStaff();
        $parent = Db::one('SELECT * FROM comments WHERE id = ?', [(int) $args['comment_id']]);
        if (!$parent) {
            Http::error('یافت نشد', 404);
        }
        $content = Http::str('content');
        if ($content === '') {
            Http::error('متن پاسخ الزامی است', 400);
        }
        Db::insert(
            'INSERT INTO comments (post_id, name, phone, content, approved, parent_id, created_at)
             VALUES (?, ?, ?, ?, 1, ?, ?)',
            [(int) $parent['post_id'], 'دکتر حسین مرادی', '', $content, (int) $parent['id'], Db::nowUtc()]
        );
        if (!empty($parent['phone'])) {
            $msg = 'نظر شما در سایت دکتر حسین مرادی توسط دکتر پاسخ داده شد. https://moradipsy.ir/blog/' . (int) $parent['post_id'];
            Sms::sendUrl($parent['phone'], $msg);
        }
        Http::json(['success' => true, 'message' => 'پاسخ ثبت شد']);
    }

    public static function approve(array $args): void
    {
        Http::requireStaff();
        $c = Db::one('SELECT id FROM comments WHERE id = ?', [(int) $args['comment_id']]);
        if (!$c) {
            Http::error('یافت نشد', 404);
        }
        Db::exec('UPDATE comments SET approved = 1 WHERE id = ?', [(int) $args['comment_id']]);
        Http::json(['success' => true, 'message' => 'تایید شد']);
    }

    public static function delete(array $args): void
    {
        Http::requireStaff();
        $id = (int) $args['comment_id'];
        $c = Db::one('SELECT id FROM comments WHERE id = ?', [$id]);
        if (!$c) {
            Http::error('یافت نشد', 404);
        }
        // Legacy cascade: deleting a comment removed its replies.
        Db::exec('DELETE FROM comments WHERE parent_id = ?', [$id]);
        Db::exec('DELETE FROM comments WHERE id = ?', [$id]);
        Http::json(['success' => true, 'message' => 'حذف شد']);
    }
}
