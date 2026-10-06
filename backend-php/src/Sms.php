<?php
declare(strict_types=1);

/**
 * sms.ir sender — mirrors the legacy backend/sms_utils.py.
 *  - VERIFY  : POST /v1/send/verify  (templateId + params)  -> every OTP and notification
 *  - URL     : GET  /v1/send         (raw text)             -> only the blog comment-reply notice
 *
 * PHP is per-request, so sends are synchronous (the Flask code used daemon threads).
 * Failures are logged and swallowed so they never break the user-facing request.
 */
final class Sms
{
    public static function sendVerify(string $mobile, int $templateId, array $params): bool
    {
        if (Config::get('SMS_DISABLED', false)) {
            error_log("[sms] (disabled) verify tpl=$templateId to=$mobile");
            return true;
        }
        $parameters = [];
        foreach ($params as $name => $value) {
            $parameters[] = ['name' => $name, 'value' => (string) $value];
        }
        $body = json_encode([
            'mobile'     => $mobile,
            'templateId' => $templateId,
            'parameters' => $parameters,
        ], JSON_UNESCAPED_UNICODE);

        return self::curl('https://api.sms.ir/v1/send/verify', [
            'method'  => 'POST',
            'body'    => $body,
            'headers' => [
                'Content-Type: application/json',
                'Accept: application/json',
                'x-api-key: ' . (string) Config::get('SMS_IR_API_KEY', ''),
            ],
        ]);
    }

    /** URL-based plain-text SMS (used only for the comment-reply notice). */
    public static function sendUrl(string $mobile, string $text): bool
    {
        if (Config::get('SMS_DISABLED', false)) {
            error_log("[sms] (disabled) url to=$mobile");
            return true;
        }
        $qs = http_build_query([
            'username' => Config::get('SMS_IR_USERNAME', ''),
            'password' => Config::get('SMS_IR_API_KEY', ''),
            'line'     => Config::get('SMS_IR_LINE', ''),
            'mobile'   => $mobile,
            'text'     => $text,
        ]);
        return self::curl('https://api.sms.ir/v1/send?' . $qs, ['method' => 'GET']);
    }

    // ---- Named helpers (template params match the sms.ir templates) ----

    public static function otp(string $mobile, string $code): bool
    {
        return self::sendVerify($mobile, (int) Config::get('SMS_IR_TEMPLATE_OTP'), ['Code' => $code]);
    }

    public static function booking(string $mobile, string $name, string $date, string $time, string $code): bool
    {
        return self::sendVerify($mobile, (int) Config::get('SMS_IR_TEMPLATE_BOOKING'),
            ['Name' => $name, 'Date' => $date, 'Time' => $time, 'Code' => $code]);
    }

    public static function doctor(string $mobile, string $name, string $date, string $time): bool
    {
        return self::sendVerify($mobile, (int) Config::get('SMS_IR_TEMPLATE_DOCTOR'),
            ['Name' => $name, 'Date' => $date, 'Time' => $time]);
    }

    public static function seminar(string $mobile, string $name, string $title, string $date): bool
    {
        return self::sendVerify($mobile, (int) Config::get('SMS_IR_TEMPLATE_SEMINAR'),
            ['Name' => $name, 'Title' => $title, 'Date' => $date]);
    }

    public static function reminder(string $mobile, string $name, string $time): bool
    {
        return self::sendVerify($mobile, (int) Config::get('SMS_IR_TEMPLATE_REMINDER'),
            ['Name' => $name, 'Time' => $time]);
    }

    public static function cancel(string $mobile, string $name, string $date): bool
    {
        return self::sendVerify($mobile, (int) Config::get('SMS_IR_TEMPLATE_CANCEL'),
            ['Name' => $name, 'Date' => $date]);
    }

    public static function reschedule(string $mobile, string $name, string $date, string $time): bool
    {
        return self::sendVerify($mobile, (int) Config::get('SMS_IR_TEMPLATE_RESCHEDULE'),
            ['Name' => $name, 'Date' => $date, 'Time' => $time]);
    }

    public static function approve(string $mobile, string $name, string $date, string $time, string $code): bool
    {
        return self::sendVerify($mobile, (int) Config::get('SMS_IR_TEMPLATE_APPROVE'),
            ['Name' => $name, 'Date' => $date, 'Time' => $time, 'Code' => $code]);
    }

    private static function curl(string $url, array $opts): bool
    {
        $ch = curl_init($url);
        if ($ch === false) {
            return false;
        }
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        if (($opts['method'] ?? 'GET') === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $opts['body'] ?? '');
        }
        if (!empty($opts['headers'])) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $opts['headers']);
        }
        $resp = curl_exec($ch);
        $err  = curl_error($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($resp === false || $err) {
            error_log('[sms] error: ' . $err);
            return false;
        }
        if ($code >= 400) {
            error_log('[sms] http ' . $code . ': ' . (is_string($resp) ? $resp : ''));
            return false;
        }
        return true;
    }
}
