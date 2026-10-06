<?php
declare(strict_types=1);

final class PostController
{
    private const ALLOWED = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

    public static function register(Router $r): void
    {
        $r->get('/posts/admin', [self::class, 'adminList']);
        $r->get('/posts', [self::class, 'list']);
        $r->post('/posts', [self::class, 'create']);
        $r->get('/posts/{id}', [self::class, 'get']);
        $r->put('/posts/{id}', [self::class, 'update']);
        $r->delete('/posts/{id}', [self::class, 'delete']);
    }

    private static function saveImage(): ?string
    {
        $files = Http::files('image');
        if (!$files) {
            return null;
        }
        $file = $files[0];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, self::ALLOWED, true)) {
            return null;
        }
        $fname = 'post_' . bin2hex(random_bytes(16)) . '.' . $ext;
        move_uploaded_file($file['tmp_name'], Http::uploadDir() . '/' . $fname);
        return '/api/uploads/' . $fname;
    }

    public static function list(): void
    {
        $posts = Db::all('SELECT * FROM posts WHERE published = 1 ORDER BY created_at DESC');
        Http::json(['posts' => array_map([self::class, 'publicRow'], $posts)]);
    }

    public static function adminList(): void
    {
        Http::requireAuth();
        $posts = Db::all('SELECT * FROM posts ORDER BY created_at DESC');
        $result = [];
        foreach ($posts as $p) {
            $author = Db::one('SELECT full_name FROM users WHERE id = ?', [(int) $p['author_id']]);
            $result[] = [
                'id'          => (int) $p['id'],
                'title'       => $p['title'],
                'content'     => $p['content'],
                'image'       => $p['image'] ?? '',
                'author_name' => $author['full_name'] ?? '',
                'published'   => (bool) $p['published'],
                'created_at'  => Util::fmtDateTime($p['created_at']),
            ];
        }
        Http::json(['posts' => $result]);
    }

    private static function publicRow(array $p): array
    {
        $author = Db::one('SELECT full_name FROM users WHERE id = ?', [(int) $p['author_id']]);
        return [
            'id'          => (int) $p['id'],
            'title'       => $p['title'],
            'content'     => $p['content'],
            'image'       => $p['image'] ?? '',
            'author_name' => $author['full_name'] ?? '',
            'created_at'  => Util::fmtDateTime($p['created_at']),
        ];
    }

    public static function get(array $args): void
    {
        $p = Db::one('SELECT * FROM posts WHERE id = ?', [(int) $args['id']]);
        if (!$p) {
            Http::error('یافت نشد', 404);
        }
        $author = Db::one('SELECT full_name FROM users WHERE id = ?', [(int) $p['author_id']]);
        Http::json([
            'id'          => (int) $p['id'],
            'title'       => $p['title'],
            'content'     => $p['content'],
            'image'       => $p['image'] ?? '',
            'author_name' => $author['full_name'] ?? '',
            'created_at'  => Util::fmtDateTime($p['created_at']),
            'updated_at'  => Util::fmtDateTime($p['updated_at']),
        ]);
    }

    public static function create(): void
    {
        $user = Http::requireStaff();
        $title = Http::str('title');
        $content = Http::str('content');
        $published = Util::truthy(Http::raw('published', 'true'));

        if ($title === '' || $content === '') {
            Http::error('عنوان و متن پست الزامی است', 400);
        }
        $image = self::saveImage();
        $id = Db::insert(
            'INSERT INTO posts (title, content, image, author_id, published, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$title, $content, $image, (int) $user['id'], $published ? 1 : 0, Db::nowUtc(), Db::nowUtc()]
        );
        Http::json(['message' => 'پست ایجاد شد', 'id' => $id], 201);
    }

    public static function update(array $args): void
    {
        Http::requireStaff();
        $p = Db::one('SELECT * FROM posts WHERE id = ?', [(int) $args['id']]);
        if (!$p) {
            Http::error('یافت نشد', 404);
        }
        $in = Http::input();
        $title = array_key_exists('title', $in) ? trim((string) $in['title']) : $p['title'];
        $content = array_key_exists('content', $in) ? trim((string) $in['content']) : $p['content'];
        $published = array_key_exists('published', $in) ? (Util::truthy($in['published']) ? 1 : 0) : (int) $p['published'];

        $image = self::saveImage();
        if ($image === null) {
            $image = $p['image'];
        }

        Db::exec('UPDATE posts SET title=?, content=?, published=?, image=?, updated_at=? WHERE id=?',
            [$title, $content, $published, $image, Db::nowUtc(), (int) $p['id']]);
        Http::json(['message' => 'پست به‌روزرسانی شد']);
    }

    public static function delete(array $args): void
    {
        Http::requireStaff();
        $p = Db::one('SELECT id FROM posts WHERE id = ?', [(int) $args['id']]);
        if (!$p) {
            Http::error('یافت نشد', 404);
        }
        // Legacy SQLAlchemy cascaded post -> comments on delete.
        Db::exec('DELETE FROM comments WHERE post_id = ?', [(int) $args['id']]);
        Db::exec('DELETE FROM posts WHERE id = ?', [(int) $args['id']]);
        Http::json(['message' => 'پست حذف شد']);
    }
}
