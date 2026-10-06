<?php
declare(strict_types=1);

require __DIR__ . '/../src/bootstrap.php';

// Same-origin in production; permissive CORS kept for parity with the old Flask CORS(app).
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
// Strip the /api entry prefix.
if (strpos($path, '/api') === 0) {
    $path = substr($path, 4);
}
if ($path === '' || $path === false) {
    $path = '/';
}

$router = new Router();
AuthController::register($router);
OtpController::register($router);
AppointmentController::register($router);
ScheduleController::register($router);
SecretaryController::register($router);
MedicalController::register($router);
SettingsController::register($router);
PostController::register($router);
ChatbotController::register($router);
CommentController::register($router);
FeedbackController::register($router);

$router->dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', $path);
