<?php
declare(strict_types=1);

require_once __DIR__ . '/env.php';
/**
 * Retorna (singleton) uma conexão PDO com o banco MySQL configurado.
 */
function pobj_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = pobj_db_config();

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['port'],
        $config['database']
    );

    try {
        $pdo = new PDO($dsn, $config['user'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $exception) {
        throw new RuntimeException('Não foi possível conectar ao MySQL: ' . $exception->getMessage(), 0, $exception);
    }

    return $pdo;
}

/**
 * Lê as variáveis de ambiente referentes ao banco.
 */
function pobj_db_config(): array
{
    return [
        'host' => (string) pobj_env('DB_HOST', '127.0.0.1'),
        'port' => (int) pobj_env('DB_PORT', 3306),
        'user' => (string) pobj_env('DB_USER', 'root'),
        'password' => (string) pobj_env('DB_PASSWORD', ''),
        'database' => (string) pobj_env('DB_NAME', 'POBJ'),
    ];
}
