<?php
declare(strict_types=1);

require __DIR__ . '/../src/bootstrap.php';

if (!Config::get('ENABLE_SEMINAR', true)) {
    Http::error('یافت نشد', 404);
}

if (!headers_sent()) {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Max-Age: 86400');
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
// Strip the /seminar entry prefix.
if (strpos($path, '/seminar') === 0) {
    $path = substr($path, 8);
}
if ($path === '' || $path === false) {
    $path = '/';
}

$router = new Router();
SeminarController::register($router);
$router->dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', $path);
