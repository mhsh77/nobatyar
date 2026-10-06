<?php
declare(strict_types=1);

/** Request parsing + JSON responses + auth, shared by all controllers. */
final class Http
{
    private static ?array $cachedInput = null;

    /** Merged request input: JSON body when sent as JSON, otherwise $_POST (multipart/form). */
    public static function input(): array
    {
        if (self::$cachedInput !== null) {
            return self::$cachedInput;
        }
        $ctype = $_SERVER['CONTENT_TYPE'] ?? ($_SERVER['HTTP_CONTENT_TYPE'] ?? '');
        if (stripos($ctype, 'application/json') !== false) {
            $raw = file_get_contents('php://input') ?: '';
            $data = json_decode($raw, true);
            self::$cachedInput = is_array($data) ? $data : [];
        } else {
            // multipart/form-data or x-www-form-urlencoded
            if (!empty($_POST)) {
                self::$cachedInput = $_POST;
            } else {
                // Some clients send JSON without the header; try to parse anyway.
                $raw = file_get_contents('php://input') ?: '';
                $data = json_decode($raw, true);
                self::$cachedInput = is_array($data) ? $data : [];
            }
        }
        return self::$cachedInput;
    }

    /** Trimmed string field from the merged input. */
    public static function str(string $key, string $default = ''): string
    {
        $in = self::input();
        if (!array_key_exists($key, $in) || $in[$key] === null) {
            return $default;
        }
        return trim((string) $in[$key]);
    }

    /** Raw field (may be bool/int/array) from the merged input. */
    public static function raw(string $key, $default = null)
    {
        $in = self::input();
        return array_key_exists($key, $in) ? $in[$key] : $default;
    }

    public static function query(string $key, $default = null)
    {
        return array_key_exists($key, $_GET) ? $_GET[$key] : $default;
    }

    public static function queryInt(string $key, int $default = 0): int
    {
        return isset($_GET[$key]) && is_numeric($_GET[$key]) ? (int) $_GET[$key] : $default;
    }

    public static function json($data, int $status = 200): void
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $message, int $status = 400): void
    {
        self::json(['error' => $message], $status);
    }

    /** Pull the bearer token from the Authorization header (handles LiteSpeed/Apache quirks). */
    public static function bearerToken(): ?string
    {
        $auth = $_SERVER['HTTP_AUTHORIZATION']
            ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
        if (!$auth && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            foreach ($headers as $k => $v) {
                if (strcasecmp($k, 'Authorization') === 0) {
                    $auth = $v;
                    break;
                }
            }
        }
        if ($auth && preg_match('/Bearer\s+(.+)$/i', $auth, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    /** Return the authenticated user row, or null. */
    public static function user(): ?array
    {
        $token = self::bearerToken();
        if (!$token) {
            return null;
        }
        $payload = Jwt::decode($token);
        if (!$payload || !isset($payload['sub'])) {
            return null;
        }
        return Db::one('SELECT * FROM users WHERE id = ?', [(int) $payload['sub']]);
    }

    /** Require any authenticated user (mirrors @jwt_required). 401/404 on failure. */
    public static function requireAuth(): array
    {
        $token = self::bearerToken();
        if (!$token) {
            self::error('نیاز به ورود', 401);
        }
        $payload = Jwt::decode($token);
        if (!$payload || !isset($payload['sub'])) {
            self::error('توکن نامعتبر است', 401);
        }
        $user = Db::one('SELECT * FROM users WHERE id = ?', [(int) $payload['sub']]);
        if (!$user) {
            self::error('کاربر یافت نشد', 404);
        }
        return $user;
    }

    /** Require a doctor/secretary staff user. */
    public static function requireStaff(): array
    {
        $user = self::requireAuth();
        if (!in_array($user['role'], ['doctor', 'secretary'], true)) {
            self::error('دسترسی غیرمجاز', 403);
        }
        return $user;
    }

    /**
     * Normalized list of uploaded files for a field name (handles single + multiple).
     * Each item: ['name','tmp_name','error','size'].
     */
    public static function files(string $field): array
    {
        if (!isset($_FILES[$field])) {
            return [];
        }
        $f = $_FILES[$field];
        $out = [];
        if (is_array($f['name'])) {
            $count = count($f['name']);
            for ($i = 0; $i < $count; $i++) {
                if (($f['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                    $out[] = [
                        'name'     => $f['name'][$i],
                        'tmp_name' => $f['tmp_name'][$i],
                        'error'    => $f['error'][$i],
                        'size'     => $f['size'][$i],
                    ];
                }
            }
        } elseif (($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
            $out[] = $f;
        }
        return $out;
    }

    public static function uploadDir(): string
    {
        $dir = (string) Config::get('UPLOAD_DIR', __DIR__ . '/../uploads');
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return rtrim($dir, '/');
    }
}
