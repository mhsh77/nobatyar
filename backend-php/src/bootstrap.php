<?php
/**
 * Shared bootstrap for both entry points (api/index.php, seminar/index.php).
 * Loads config, sets up error handling, timezone, charset headers, and the class includes.
 */

declare(strict_types=1);

// ---- Load config ----
$configPath = __DIR__ . '/../config.php';
if (!is_file($configPath)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Server not configured (config.php missing)'], JSON_UNESCAPED_UNICODE);
    exit;
}
$CONFIG = require $configPath;

// Make config globally reachable via Config::get()
require __DIR__ . '/Config.php';
Config::init($CONFIG);

// ---- Runtime setup ----
date_default_timezone_set(Config::get('TIMEZONE', 'Asia/Tehran'));
mb_internal_encoding('UTF-8');

// Do not leak PHP notices/warnings into JSON responses.
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ---- Class includes (no Composer; flat require) ----
require __DIR__ . '/Db.php';
require __DIR__ . '/Util.php';
require __DIR__ . '/Http.php';
require __DIR__ . '/Jwt.php';
require __DIR__ . '/Sms.php';
require __DIR__ . '/Jalali.php';
require __DIR__ . '/OtpSession.php';
require __DIR__ . '/Router.php';

foreach (glob(__DIR__ . '/Controllers/*.php') as $ctrl) {
    require $ctrl;
}

// Convert uncaught exceptions / fatal errors into clean JSON.
set_exception_handler(function (Throwable $e) {
    error_log('[nobatyar] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['error' => 'خطای سرور'], JSON_UNESCAPED_UNICODE);
    exit;
});
