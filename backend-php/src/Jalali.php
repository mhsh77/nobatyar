<?php
declare(strict_types=1);

/**
 * Hand-rolled Gregorian -> Jalali conversion, ported verbatim from the legacy
 * backend (routes/appointments.py::gregorian_to_jalali) so SMS dates stay identical.
 * Verified correct for the near future.
 */
final class Jalali
{
    public static function gregorianToJalali(string $dateStr): string
    {
        try {
            $parts = array_map('intval', explode('-', $dateStr));
            if (count($parts) !== 3) {
                return $dateStr;
            }
            [$gy, $gm, $gd] = $parts;

            $base   = new DateTimeImmutable('2025-03-21', new DateTimeZone('UTC'));
            $target = new DateTimeImmutable(sprintf('%04d-%02d-%02d', $gy, $gm, $gd), new DateTimeZone('UTC'));
            $diff   = (int) $base->diff($target)->format('%r%a'); // signed day difference

            $jy = 1404;
            $r  = $diff;
            while ($r >= 365) {
                $jy += 1;
                $yr = (((($jy + 11) % 33) % 4) === 0) ? 366 : 365;
                if ($r >= $yr) {
                    $r -= $yr;
                } else {
                    break;
                }
            }

            $md = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
            if (((($jy + 11) % 33) % 4) === 0) {
                $md[11] = 30;
            }

            $jm = 1;
            $jd = $r;
            foreach ($md as $m) {
                if ($jd >= $m) {
                    $jd -= $m;
                    $jm += 1;
                } else {
                    break;
                }
            }

            return $jy . '/' . str_pad((string) $jm, 2, '0', STR_PAD_LEFT)
                       . '/' . str_pad((string) ($jd + 1), 2, '0', STR_PAD_LEFT);
        } catch (Throwable $e) {
            return $dateStr;
        }
    }
}
