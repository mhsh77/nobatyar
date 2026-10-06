<?php
declare(strict_types=1);

/**
 * DB-backed short-OTP sessions for the comment / feedback / seminar flows.
 * Replaces the Flask app's per-process in-memory dicts (which cannot work in per-request PHP).
 * One active row per (phone, scope).
 */
final class OtpSession
{
    public static function start(string $phone, string $scope, string $code, int $ttlMinutes): void
    {
        $expires = gmdate('Y-m-d H:i:s', time() + $ttlMinutes * 60);
        Db::exec(
            'INSERT INTO otp_sessions (phone, scope, code, expires_at, verified, created_at)
             VALUES (?, ?, ?, ?, 0, ?)
             ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at),
                                     verified = 0, created_at = VALUES(created_at)',
            [$phone, $scope, $code, $expires, Db::nowUtc()]
        );
    }

    /** @return string 'ok' | 'missing' | 'expired' | 'invalid' */
    public static function verify(string $phone, string $scope, string $code): string
    {
        $row = Db::one('SELECT * FROM otp_sessions WHERE phone = ? AND scope = ?', [$phone, $scope]);
        if (!$row) {
            return 'missing';
        }
        if (gmdate('Y-m-d H:i:s') > $row['expires_at']) {
            Db::exec('DELETE FROM otp_sessions WHERE phone = ? AND scope = ?', [$phone, $scope]);
            return 'expired';
        }
        if ($row['code'] !== $code) {
            return 'invalid';
        }
        Db::exec('UPDATE otp_sessions SET verified = 1 WHERE phone = ? AND scope = ?', [$phone, $scope]);
        return 'ok';
    }

    public static function isVerified(string $phone, string $scope): bool
    {
        if ($phone === '') {
            return false;
        }
        $row = Db::one('SELECT verified FROM otp_sessions WHERE phone = ? AND scope = ?', [$phone, $scope]);
        return $row && (int) $row['verified'] === 1;
    }

    public static function clear(string $phone, string $scope): void
    {
        Db::exec('DELETE FROM otp_sessions WHERE phone = ? AND scope = ?', [$phone, $scope]);
    }
}
