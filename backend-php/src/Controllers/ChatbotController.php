<?php
declare(strict_types=1);

final class ChatbotController
{
    private const RESPONSES = [
        'سلام'     => 'سلام! من دستیار هوشمند مطب دکتر حسین مرادی هستم. چطور می‌توانم به شما کمک کنم؟',
        'خوبی'     => 'خوب هستم، ممنون! چطور می‌توانم کمکتان کنم؟',
        'نوبت'     => 'برای رزرو نوبت می‌توانید از بخش «رزرو نوبت» در سایت استفاده کنید. اگر نیاز به راهنمایی دارید، بپرسید.',
        'دکتر'     => 'دکتر حسین مرادی، روانشناس بالینی هستند. برای اطلاعات بیشتر به بخش «درباره ما» مراجعه کنید.',
        'روانشناس' => 'دکتر حسین مرادی، روانشناس بالینی هستند. برای اطلاعات بیشتر به بخش «درباره ما» مراجعه کنید.',
        'آدرس'     => 'برای مشاهده آدرس و اطلاعات تماس لطفاً به بخش «ارتباط با ما» در سایت مراجعه کنید.',
        'تلفن'     => 'برای شماره تماس لطفاً به بخش «ارتباط با ما» در سایت مراجعه کنید.',
        'ساعت'     => 'ساعات کاری مطب در بخش «ارتباط با ما» و صفحه اصلی سایت درج شده است.',
        'هزینه'    => 'برای اطلاع از هزینه ویزیت لطفاً با مطب تماس بگیرید.',
        'بیمه'     => 'برای اطلاع از وضعیت بیمه لطفاً با مطب تماس بگیرید.',
        'تشکر'     => 'خواهش می‌کنم! همیشه در خدمت شما هستیم.',
        'خداحافظ'  => 'خداحافظ! روز خوبی داشته باشید و سلامت باشید.',
    ];

    public static function register(Router $r): void
    {
        $r->get('/chatbot/settings', [self::class, 'getSettings']);
        $r->put('/chatbot/settings', [self::class, 'updateSettings']);
        $r->get('/chatbot/messages', [self::class, 'getMessages']);
        $r->post('/chatbot/messages', [self::class, 'sendMessage']);
    }

    private static function keywordResponse(string $message): string
    {
        $norm = str_replace([' ', '‌'], '', $message);
        foreach (self::RESPONSES as $keyword => $response) {
            if (mb_strpos($norm, $keyword) !== false) {
                return $response;
            }
        }
        return 'متوجه شدم. لطفاً سوالتان را دقیق‌تر بپرسید یا با مطب تماس بگیرید. در صورت نیاز به رزرو نوبت می‌توانید از بخش رزرو نوبت استفاده کنید.';
    }

    /** chatbot_* settings as an assoc array without the prefix. */
    private static function settingsMap(): array
    {
        $rows = Db::all("SELECT `key`, `value` FROM site_settings WHERE `key` LIKE 'chatbot_%'");
        $map = [];
        foreach ($rows as $s) {
            $map[substr($s['key'], strlen('chatbot_'))] = $s['value'];
        }
        return $map;
    }

    public static function getSettings(): void
    {
        $s = self::settingsMap();
        $user = Http::user();
        $showKey = $user && in_array($user['role'], ['doctor', 'secretary'], true);
        Http::json([
            'enabled'  => ($s['enabled'] ?? 'false') === 'true',
            'prompt'   => $s['prompt'] ?? '',
            'title'    => $s['title'] ?? 'چت با دستیار هوشمند',
            'greeting' => $s['greeting'] ?? 'سلام! من دستیار هوشمند مطب دکتر هستم. چطور می‌توانم به شما کمک کنم؟',
            'api_key'  => $showKey ? ($s['api_key'] ?? '') : '',
        ]);
    }

    public static function updateSettings(): void
    {
        Http::requireStaff();
        $data = Http::input();
        if (!$data) {
            Http::error('داده‌ای ارسال نشده', 400);
        }
        foreach ($data as $key => $value) {
            $dbKey = 'chatbot_' . $key;
            Db::exec(
                'INSERT INTO site_settings (`key`, `value`) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
                [$dbKey, (string) $value]
            );
        }
        Http::json(['message' => 'تنظیمات چت‌بات ذخیره شد']);
    }

    public static function getMessages(): void
    {
        $rows = Db::all('SELECT * FROM chatbot_messages ORDER BY created_at ASC LIMIT 50');
        Http::json([
            'messages' => array_map(fn($m) => [
                'id'         => (int) $m['id'],
                'sender'     => $m['sender'],
                'message'    => $m['message'],
                'created_at' => Util::fmtTime($m['created_at']),
            ], $rows),
        ]);
    }

    public static function sendMessage(): void
    {
        $userMessage = Http::str('message');
        if ($userMessage === '') {
            Http::error('پیام الزامی است', 400);
        }

        $s = self::settingsMap();
        if (($s['enabled'] ?? 'false') !== 'true') {
            Http::error('چت‌بات در حال حاضر غیرفعال است', 403);
        }

        $now = Db::nowUtc();
        $userId = Db::insert('INSERT INTO chatbot_messages (sender, message, created_at) VALUES (?, ?, ?)',
            ['user', $userMessage, $now]);

        $apiKey = trim($s['api_key'] ?? '');
        $prompt = trim($s['prompt'] ?? '');
        $aiResponse = null;

        if ($apiKey !== '') {
            $aiResponse = self::askOpenAI($apiKey, $prompt);
        }
        if (!$aiResponse) {
            $aiResponse = self::keywordResponse($userMessage);
        }

        $botNow = Db::nowUtc();
        $botId = Db::insert('INSERT INTO chatbot_messages (sender, message, created_at) VALUES (?, ?, ?)',
            ['bot', $aiResponse, $botNow]);

        $userRow = Db::one('SELECT * FROM chatbot_messages WHERE id = ?', [$userId]);
        $botRow = Db::one('SELECT * FROM chatbot_messages WHERE id = ?', [$botId]);
        Http::json([
            'user_message' => [
                'id'         => $userId,
                'sender'     => 'user',
                'message'    => $userMessage,
                'created_at' => Util::fmtTime($userRow['created_at']),
            ],
            'bot_message' => [
                'id'         => $botId,
                'sender'     => 'bot',
                'message'    => $aiResponse,
                'created_at' => Util::fmtTime($botRow['created_at']),
            ],
            'prompt_used' => $s['prompt'] ?? '',
        ]);
    }

    /** Best-effort OpenAI chat completion; null on any failure (caller falls back to keywords). */
    private static function askOpenAI(string $apiKey, string $prompt): ?string
    {
        $systemPrompt = $prompt !== '' ? $prompt
            : 'شما دستیار هوشمند مطب پزشکی هستید و به سوالات بیماران به زبان فارسی پاسخ می‌دهید.';
        $messages = [['role' => 'system', 'content' => $systemPrompt]];
        $recent = Db::all('SELECT sender, message FROM chatbot_messages ORDER BY created_at DESC LIMIT 10');
        foreach (array_reverse($recent) as $m) {
            $messages[] = [
                'role'    => $m['sender'] === 'bot' ? 'assistant' : 'user',
                'content' => $m['message'],
            ];
        }
        $body = json_encode([
            'model'       => 'gpt-4o-mini',
            'messages'    => $messages,
            'max_tokens'  => 500,
            'temperature' => 0.7,
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init('https://api.openai.com/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
        ]);
        $resp = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($resp === false || $code >= 400) {
            error_log('[chatbot] OpenAI http ' . $code);
            return null;
        }
        $json = json_decode($resp, true);
        $content = $json['choices'][0]['message']['content'] ?? null;
        return $content ? trim($content) : null;
    }
}
