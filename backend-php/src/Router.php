<?php
declare(strict_types=1);

/** Tiny path router. Patterns use {name} to capture a single path segment. */
final class Router
{
    /** @var array<int,array{method:string,regex:string,params:string[],handler:callable}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $params = [];
        $regex = preg_replace_callback('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', function ($m) use (&$params) {
            $params[] = $m[1];
            return '([^/]+)';
        }, $pattern);
        $regex = '#^' . $regex . '/?$#';
        $this->routes[] = [
            'method'  => strtoupper($method),
            'regex'   => $regex,
            'params'  => $params,
            'handler' => $handler,
        ];
    }

    public function get(string $p, callable $h): void    { $this->add('GET', $p, $h); }
    public function post(string $p, callable $h): void   { $this->add('POST', $p, $h); }
    public function put(string $p, callable $h): void    { $this->add('PUT', $p, $h); }
    public function patch(string $p, callable $h): void  { $this->add('PATCH', $p, $h); }
    public function delete(string $p, callable $h): void { $this->add('DELETE', $p, $h); }

    /**
     * Dispatch. $path is the route path (entry prefix already stripped).
     * First matching route wins, so register specific routes before parametric ones.
     */
    public function dispatch(string $method, string $path): void
    {
        $method = strtoupper($method);
        $pathMatchedButMethodNot = false;

        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $path, $m)) {
                continue;
            }
            if ($route['method'] !== $method) {
                $pathMatchedButMethodNot = true;
                continue;
            }
            $args = [];
            foreach ($route['params'] as $i => $name) {
                $args[$name] = urldecode($m[$i + 1]);
            }
            ($route['handler'])($args);
            return;
        }

        if ($pathMatchedButMethodNot) {
            Http::error('متد مجاز نیست', 405);
        }
        Http::error('یافت نشد', 404);
    }
}
