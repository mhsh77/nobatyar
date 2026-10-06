<?php
/**
 * Copy this file to config.php and fill in the real values.
 * config.php is gitignored because it holds live secrets (DB password, SMS API key, JWT secret).
 *
 * On the shared host, place config.php next to this file (one level above the api/ and seminar/
 * entry points). It is denied direct web access by src/.htaccess + the deny rule in the root .htaccess.
 */

return [
    // ---- Database (MySQL) ----
    'DB_HOST'    => '127.0.0.1',
    'DB_PORT'    => '3306',
    'DB_NAME'    => 'moradipsy',
    'DB_USER'    => 'moradipsy',
    'DB_PASS'    => 'CHANGE_ME_DB_PASSWORD',

    // ---- Security ----
    // Keep this stable; changing it invalidates all issued staff login tokens.
    'JWT_SECRET' => 'CHANGE_ME_TO_A_LONG_RANDOM_STRING',
    'JWT_TTL_HOURS' => 24,

    // Clinic-local timezone used for "today / upcoming" appointment-date logic.
    'TIMEZONE'   => 'Asia/Tehran',

    'OTP_EXPIRE_SECONDS' => 120,

    // ---- sms.ir ----
    // Set true on staging to skip real SMS sends (calls are logged and treated as success).
    'SMS_DISABLED'    => false,
    'SMS_IR_API_KEY'  => 'YOUR_SMS_IR_API_KEY',
    'SMS_IR_USERNAME' => 'YOUR_SMS_IR_USERNAME',
    'SMS_IR_LINE'     => 'YOUR_SMS_IR_LINE',

    // VERIFY template IDs (from the sms.ir panel)
    'SMS_IR_TEMPLATE_OTP'        => 815351,
    'SMS_IR_TEMPLATE_BOOKING'    => 619902,
    'SMS_IR_TEMPLATE_DOCTOR'     => 580012,
    'SMS_IR_TEMPLATE_SEMINAR'    => 814118,
    'SMS_IR_TEMPLATE_REMINDER'   => 970621,
    'SMS_IR_TEMPLATE_CANCEL'     => 800451,
    'SMS_IR_TEMPLATE_RESCHEDULE' => 726063,
    'SMS_IR_TEMPLATE_APPROVE'    => 786713,

    // ---- Feature flags ----
    'ENABLE_SEMINAR' => true,
    // Mirrors the legacy /api/otp/debug-send endpoint (lets a code be set for a number without SMS).
    // Known-insecure; kept false by default. Set true only for debugging.
    'ENABLE_OTP_DEBUG' => false,

    // ---- Uploads ----
    // Absolute path to the uploads directory (defaults to backend-php/uploads next to this file).
    'UPLOAD_DIR' => __DIR__ . '/uploads',
];
