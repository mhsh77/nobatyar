<?php
declare(strict_types=1);

final class AuthController
{
    public static function register(Router $r): void
    {
        $r->post('/auth/login', [self::class, 'login']);
        $r->get('/auth/me', [self::class, 'me']);
    }

    public static function login(): void
    {
        $mobile = Http::str('mobile');
        $password = (string) Http::raw('password', '');

        if ($mobile === '' || $password === '') {
            Http::error('موبایل و رمز عبور الزامی است', 400);
        }

        // Legacy order: patient, then doctor, then secretary.
        $user = Db::one('SELECT * FROM users WHERE mobile = ? AND role = ?', [$mobile, 'patient'])
            ?: Db::one('SELECT * FROM users WHERE mobile = ? AND role = ?', [$mobile, 'doctor'])
            ?: Db::one('SELECT * FROM users WHERE mobile = ? AND role = ?', [$mobile, 'secretary']);

        if (!$user) {
            Http::error('کاربر یافت نشد', 404);
        }
        if (empty($user['password_hash']) || !password_verify($password, $user['password_hash'])) {
            Http::error('رمز عبور اشتباه است', 401);
        }
        if (!in_array($user['role'], ['doctor', 'secretary'], true)) {
            Http::error('دسترسی غیرمجاز', 403);
        }

        $token = Jwt::createAccessToken($user['id']);
        Http::json([
            'token' => $token,
            'user'  => [
                'id'        => (int) $user['id'],
                'full_name' => $user['full_name'],
                'mobile'    => $user['mobile'],
                'role'      => $user['role'],
            ],
        ]);
    }

    public static function me(): void
    {
        $user = Http::requireAuth();
        Http::json([
            'id'          => (int) $user['id'],
            'full_name'   => $user['full_name'],
            'mobile'      => $user['mobile'],
            'national_id' => $user['national_id'],
            'role'        => $user['role'],
        ]);
    }
}
