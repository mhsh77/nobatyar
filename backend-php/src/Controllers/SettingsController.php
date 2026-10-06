<?php
declare(strict_types=1);

final class SettingsController
{
    private const ALLOWED = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

    public static function register(Router $r): void
    {
        $r->get('/settings', [self::class, 'get']);
        $r->put('/settings', [self::class, 'update']);
        $r->post('/settings/upload/{key}', [self::class, 'uploadImage']);
    }

    public static function get(): void
    {
        $rows = Db::all('SELECT `key`, `value` FROM site_settings');
        $result = [];
        foreach ($rows as $s) {
            if (strpos($s['key'], 'chatbot_') === 0) {
                continue;
            }
            $result[$s['key']] = $s['value'];
        }
        Http::json(['settings' => $result]);
    }

    public static function update(): void
    {
        Http::requireAuth();
        $data = Http::input();
        if (!$data) {
            Http::error('داده‌ای ارسال نشده', 400);
        }
        foreach ($data as $key => $value) {
            $val = $value === null ? '' : (string) $value;
            self::upsert((string) $key, $val);
        }
        Http::json(['message' => 'تنظیمات ذخیره شد']);
    }

    public static function uploadImage(array $args): void
    {
        Http::requireAuth();
        $key = $args['key'];
        if (!in_array($key, ['hero_doctor_image', 'about_clinic_image'], true)) {
            Http::error('کلید نامعتبر است', 400);
        }
        $files = Http::files('image');
        if (!$files) {
            Http::error('فایلی ارسال نشده', 400);
        }
        $file = $files[0];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, self::ALLOWED, true)) {
            Http::error('فرمت فایل مجاز نیست (png, jpg, jpeg, gif, webp)', 400);
        }
        $fname = 'site_' . $key . '_' . bin2hex(random_bytes(16)) . '.' . $ext;
        move_uploaded_file($file['tmp_name'], Http::uploadDir() . '/' . $fname);
        $url = '/api/uploads/' . $fname;
        self::upsert($key, $url);
        Http::json(['message' => 'تصویر آپلود شد', 'url' => $url]);
    }

    public static function upsert(string $key, string $value): void
    {
        Db::exec(
            'INSERT INTO site_settings (`key`, `value`) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
            [$key, $value]
        );
    }
}
