<?php
declare(strict_types=1);

final class Util
{
    /** Format a stored "Y-m-d H:i:s" datetime string as the legacy API did. '' stays ''. */
    public static function fmtDateTime(?string $stored): string
    {
        if (!$stored) {
            return '';
        }
        // Stored as "YYYY-MM-DD HH:MM:SS"; legacy used strftime('%Y-%m-%d %H:%M').
        return substr($stored, 0, 16);
    }

    /** Format a stored datetime as just HH:MM (legacy strftime('%H:%M')). */
    public static function fmtTime(?string $stored): string
    {
        if (!$stored || strlen($stored) < 16) {
            return '';
        }
        return substr($stored, 11, 5);
    }

    /** Truthy form-value check matching the Python `in ('true','True','1','on',True)` idioms. */
    public static function truthy($v): bool
    {
        if (is_bool($v)) {
            return $v;
        }
        return in_array((string) $v, ['true', 'True', '1', 'on'], true);
    }
}
