<?php
declare(strict_types=1);

/**
 * Minimal HS256 JWT, compatible with the token shape the old Flask-JWT-Extended
 * backend issued (identity string in `sub`, `exp` expiry). No external deps.
 */
final class Jwt
{
    private static function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function b64urlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/')) ?: '';
    }

    private static function secret(): string
    {
        return (string) Config::get('JWT_SECRET', '');
    }

    /** Create a signed access token for a user id (identity stored as a string in `sub`). */
    public static function createAccessToken($identity): string
    {
        $now = time();
        $ttl = (int) Config::get('JWT_TTL_HOURS', 24) * 3600;
        $payload = [
            'fresh' => false,
            'iat'   => $now,
            'nbf'   => $now,
            'jti'   => bin2hex(random_bytes(16)),
            'type'  => 'access',
            'sub'   => (string) $identity,
            'exp'   => $now + $ttl,
        ];
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];

        $segments = [
            self::b64url(json_encode($header, JSON_UNESCAPED_SLASHES)),
            self::b64url(json_encode($payload, JSON_UNESCAPED_SLASHES)),
        ];
        $signingInput = implode('.', $segments);
        $signature = hash_hmac('sha256', $signingInput, self::secret(), true);
        $segments[] = self::b64url($signature);

        return implode('.', $segments);
    }

    /**
     * Verify and decode a token. Returns the payload array, or null if invalid/expired.
     */
    public static function decode(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$h, $p, $s] = $parts;

        $header = json_decode(self::b64urlDecode($h), true);
        if (!is_array($header) || ($header['alg'] ?? '') !== 'HS256') {
            return null;
        }

        $expected = hash_hmac('sha256', $h . '.' . $p, self::secret(), true);
        $provided = self::b64urlDecode($s);
        if (!hash_equals($expected, $provided)) {
            return null;
        }

        $payload = json_decode(self::b64urlDecode($p), true);
        if (!is_array($payload)) {
            return null;
        }
        if (isset($payload['exp']) && time() >= (int) $payload['exp']) {
            return null;
        }
        if (isset($payload['nbf']) && time() < (int) $payload['nbf']) {
            return null;
        }
        return $payload;
    }
}
