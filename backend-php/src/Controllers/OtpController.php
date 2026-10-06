<?php
declare(strict_types=1);

final class OtpController
{
    public static function register(Router $r): void
    {
        $r->post('/otp/send', [self::class, 'send']);
        $r->post('/otp/debug-send', [self::class, 'debugSend']);
        $r->post('/otp/verify', [self::class, 'verify']);
    }

    public static function send(): void
    {
        $mobile = Http::str('mobile');
        $fullName = Http::str('full_name');
        $nationalId = Http::str('national_id');

        if ($mobile === '' || $fullName === '' || $nationalId === '') {
            Http::error('تمامی فیلدهای اجباری را پر کنید', 400);
        }

        // Invalidate previous unverified codes for this mobile.
        Db::exec('UPDATE otp_codes SET verified = 1 WHERE mobile = ? AND verified = 0', [$mobile]);

        $code = (string) random_int(100000, 999999);
        $expires = '2099-12-31 00:00:00';
        Db::insert(
            'INSERT INTO otp_codes (mobile, otp_code, expires_at, verified, created_at) VALUES (?, ?, ?, 0, ?)',
            [$mobile, $code, $expires, Db::nowUtc()]
        );

        Sms::otp($mobile, $code);

        Http::json([
            'message'    => 'کد تایید ارسال شد',
            'expires_in' => (int) Config::get('OTP_EXPIRE_SECONDS', 120),
            'otp_code'   => $code, // legacy behavior (known-open)
        ]);
    }

    public static function debugSend(): void
    {
        if (!Config::get('ENABLE_OTP_DEBUG', false)) {
            Http::error('غیرفعال است', 403);
        }
        $mobile = Http::str('mobile');
        $code = (string) Http::raw('code', '');
        if ($mobile === '' || $code === '') {
            Http::error('mobile and code required', 400);
        }
        $code = substr($code, 0, 6);
        Db::exec('UPDATE otp_codes SET verified = 1 WHERE mobile = ? AND verified = 0', [$mobile]);
        Db::insert(
            'INSERT INTO otp_codes (mobile, otp_code, expires_at, verified, created_at) VALUES (?, ?, ?, 0, ?)',
            [$mobile, $code, '2099-12-31 00:00:00', Db::nowUtc()]
        );
        Http::json(['message' => 'test OTP created', 'otp_code' => $code]);
    }

    public static function verify(): void
    {
        $mobile = Http::str('mobile');
        $otpCode = Http::str('otp_code');
        $fullName = Http::str('full_name');
        $nationalId = Http::str('national_id');
        $underlying = Http::str('underlying_diseases');

        if ($mobile === '' || $otpCode === '') {
            Http::error('موبایل و کد تایید الزامی است', 400);
        }

        $otp = Db::one(
            'SELECT * FROM otp_codes WHERE mobile = ? AND otp_code = ? AND verified = 0 ORDER BY id DESC LIMIT 1',
            [$mobile, $otpCode]
        );
        if (!$otp) {
            Http::error('کد تایید نامعتبر است', 400);
        }
        Db::exec('UPDATE otp_codes SET verified = 1 WHERE id = ?', [(int) $otp['id']]);

        $existing = Db::one('SELECT * FROM users WHERE mobile = ?', [$mobile]);
        if (!$existing && $nationalId !== '') {
            $existing = Db::one('SELECT * FROM users WHERE national_id = ?', [$nationalId]);
        }

        if (!$existing) {
            $userId = Db::insert(
                'INSERT INTO users (full_name, national_id, mobile, role, underlying_diseases, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)',
                [$fullName, $nationalId, $mobile, 'patient', $underlying, Db::nowUtc()]
            );
        } elseif ($existing['role'] === 'patient') {
            Db::exec('UPDATE users SET full_name = ?, underlying_diseases = ? WHERE id = ?',
                [$fullName, $underlying, (int) $existing['id']]);
            $userId = (int) $existing['id'];
        } else {
            // Mobile belongs to doctor/secretary -> create a distinct patient record.
            $userId = Db::insert(
                'INSERT INTO users (full_name, national_id, mobile, role, underlying_diseases, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)',
                [$fullName, $nationalId, 'dup_' . $existing['id'] . '_' . $mobile, 'patient', $underlying, Db::nowUtc()]
            );
        }

        Http::json(['message' => 'تایید شد', 'user_id' => $userId, 'mobile' => $mobile]);
    }
}
