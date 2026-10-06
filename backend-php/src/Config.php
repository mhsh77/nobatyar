<?php
declare(strict_types=1);

final class Config
{
    private static array $data = [];

    public static function init(array $data): void
    {
        self::$data = $data;
    }

    /** @return mixed */
    public static function get(string $key, $default = null)
    {
        return array_key_exists($key, self::$data) ? self::$data[$key] : $default;
    }
}
