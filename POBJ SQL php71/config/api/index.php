<?php
header('Content-Type: application/json; charset=utf-8');

try {
    $dbHost = getenv('DB_HOST') ?: '127.0.0.1';
    $dbName = getenv('DB_NAME') ?: 'pobj';
    $dbUser = getenv('DB_USER') ?: 'root';
    $dbPass = getenv('DB_PASS') ?: '';
    $dbCharset = 'utf8mb4';

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $dbHost, $dbName, $dbCharset);
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $endpoint = $_GET['endpoint'] ?? '';

    $json = static function ($data) {
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    };

    $jsonError = static function ($message, int $status = 400) {
        http_response_code($status);
        echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
        exit;
    };

    $q = static function (string $sql, array $bind = []) use ($pdo) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    };

    switch ($endpoint) {
        case 'health':
            $json(['status' => 'ok']);

        case 'filtros':
            $nivel = $_GET['nivel'] ?? '';
            switch ($nivel) {
                case 'segmentos':
                    $json($q(
                        'SELECT DISTINCT id_segmento AS id, segmento AS label
                         FROM d_estrutura
                         WHERE id_segmento IS NOT NULL AND segmento IS NOT NULL
                         ORDER BY label'
                    ));

                case 'diretorias':
                    $json($q(
                        'SELECT DISTINCT id_diretoria AS id, diretoria AS label
                         FROM d_estrutura
                         WHERE id_diretoria IS NOT NULL AND diretoria IS NOT NULL
                         ORDER BY label'
                    ));

                case 'regionais':
                    $json($q(
                        'SELECT DISTINCT id_regional AS id, regional AS label
                         FROM d_estrutura
                         WHERE id_regional IS NOT NULL AND regional IS NOT NULL
                         ORDER BY label'
                    ));

                case 'agencias':
                    $json($q(
                        'SELECT DISTINCT id_agencia AS id, agencia AS label, porte
                         FROM d_estrutura
                         WHERE id_agencia IS NOT NULL AND agencia IS NOT NULL
                         ORDER BY label'
                    ));

                case 'ggestoes':
                    $json($q(
                        "SELECT DISTINCT funcional AS id, nome AS label
                         FROM d_estrutura
                         WHERE cargo LIKE 'Gerente de Gestao%' OR cargo LIKE 'Gerente de Gestão%'
                         ORDER BY label"
                    ));

                case 'gerentes':
                    $json($q(
                        "SELECT DISTINCT funcional AS id, nome AS label
                         FROM d_estrutura
                         WHERE cargo LIKE 'Gerente%' AND cargo NOT LIKE 'Gerente de Gest%'
                         ORDER BY label"
                    ));

                case 'status_indicadores':
                    $rows = $q('SELECT id, status AS label FROM d_status_indicadores ORDER BY id');
                    if (!$rows) {
                        $rows = [
                            ['id' => '01', 'label' => 'Atingido'],
                            ['id' => '02', 'label' => 'Não Atingido'],
                            ['id' => '03', 'label' => 'Todos'],
                        ];
                    }
                    $json($rows);

                default:
                    $jsonError('nivel inválido');
            }
            break;

        case 'status_indicadores':
            $rows = $q('SELECT id, status FROM d_status_indicadores ORDER BY id');
            if (!$rows) {
                $rows = [
                    ['id' => '01', 'status' => 'Atingido'],
                    ['id' => '02', 'status' => 'Não Atingido'],
                    ['id' => '03', 'status' => 'Todos'],
                ];
            }
            $json(['rows' => $rows]);

        case 'bootstrap':
            $payload = [];
            $payload['segmentos'] = $q(
                'SELECT DISTINCT id_segmento AS id, segmento AS nome
                 FROM d_estrutura
                 WHERE id_segmento IS NOT NULL AND segmento IS NOT NULL
                 ORDER BY nome'
            );
            $payload['diretorias'] = $q(
                'SELECT DISTINCT id_diretoria AS id, diretoria AS nome
                 FROM d_estrutura
                 WHERE id_diretoria IS NOT NULL AND diretoria IS NOT NULL
                 ORDER BY nome'
            );
            $payload['regionais'] = $q(
                'SELECT DISTINCT id_regional AS id, regional AS nome
                 FROM d_estrutura
                 WHERE id_regional IS NOT NULL AND regional IS NOT NULL
                 ORDER BY nome'
            );
            $payload['agencias'] = $q(
                'SELECT DISTINCT id_agencia AS id, agencia AS nome, porte
                 FROM d_estrutura
                 WHERE id_agencia IS NOT NULL AND agencia IS NOT NULL
                 ORDER BY nome'
            );
            $payload['ggestoes'] = $q(
                "SELECT DISTINCT funcional AS id, nome
                 FROM d_estrutura
                 WHERE cargo LIKE 'Gerente de Gestao%' OR cargo LIKE 'Gerente de Gestão%'
                 ORDER BY nome"
            );
            $payload['gerentes'] = $q(
                "SELECT DISTINCT funcional AS id, nome
                 FROM d_estrutura
                 WHERE cargo LIKE 'Gerente%' AND cargo NOT LIKE 'Gerente de Gest%'
                 ORDER BY nome"
            );
            $payload['statusIndicadores'] = $q('SELECT id, status FROM d_status_indicadores ORDER BY id');
            $json($payload);

        case 'resumo':
            $seg = trim($_GET['segmento_id'] ?? '');
            $dir = trim($_GET['diretoria_id'] ?? '');
            $reg = trim($_GET['regional_id'] ?? '');
            $age = trim($_GET['agencia_id'] ?? '');
            $gg  = trim($_GET['gg_funcional'] ?? '');
            $ger = trim($_GET['gerente_funcional'] ?? '');
            $ini = trim($_GET['data_ini'] ?? '');
            $fim = trim($_GET['data_fim'] ?? '');
            $indicador = trim($_GET['id_indicador'] ?? '');

            if ($ini === '' || $fim === '') {
                $jsonError('data_ini/data_fim obrigatórios');
            }

            $filters = [];
            $bind = [
                ':ini' => $ini,
                ':fim' => $fim,
            ];

            if ($seg !== '') {
                $filters[] = 'e.id_segmento = :segmento_id';
                $bind[':segmento_id'] = $seg;
            }
            if ($dir !== '') {
                $filters[] = 'e.id_diretoria = :diretoria_id';
                $bind[':diretoria_id'] = $dir;
            }
            if ($reg !== '') {
                $filters[] = 'e.id_regional = :regional_id';
                $bind[':regional_id'] = $reg;
            }
            if ($age !== '') {
                $filters[] = 'e.id_agencia = :agencia_id';
                $bind[':agencia_id'] = $age;
            }
            if ($gg !== '') {
                $filters[] = 'e.funcional = :gg_funcional';
                $bind[':gg_funcional'] = $gg;
            }
            if ($ger !== '') {
                $filters[] = 'e.funcional = :gerente_funcional';
                $bind[':gerente_funcional'] = $ger;
            }

            $where = $filters ? ' AND ' . implode(' AND ', $filters) : '';

            $indicadorFilterReal = '';
            $indicadorFilterMeta = '';
            if ($indicador !== '') {
                $bind[':id_indicador'] = $indicador;
                $indicadorFilterReal = ' AND r.id_indicador = :id_indicador';
                $indicadorFilterMeta = ' AND m.id_indicador = :id_indicador';
            }

            $real = $q(
                "SELECT SUM(r.realizado) AS total_realizado
                 FROM f_realizado r
                 JOIN d_calendario c ON c.data = r.data_realizado
                 JOIN d_estrutura e ON e.funcional = r.funcional
                 WHERE c.data BETWEEN :ini AND :fim{$indicadorFilterReal}{$where}",
                $bind
            );

            $meta = $q(
                "SELECT SUM(m.meta_mensal) AS total_meta
                 FROM f_meta m
                 JOIN d_calendario c ON c.data = m.data_meta
                 JOIN d_estrutura e ON e.funcional = m.funcional
                 WHERE c.data BETWEEN :ini AND :fim{$indicadorFilterMeta}{$where}",
                $bind
            );

            $json([
                'realizado_total' => (float) ($real[0]['total_realizado'] ?? 0),
                'meta_total' => (float) ($meta[0]['total_meta'] ?? 0),
            ]);

        default:
            $jsonError('endpoint não encontrado', 404);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'server_error',
        'message' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}