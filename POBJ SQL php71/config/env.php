<?php
declare(strict_types=1);

require_once __DIR__ . '/../database.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não suportado. Utilize GET.'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo = pobj_db();
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Falha ao conectar ao banco de dados',
        'details' => $exception->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$endpoint = pobj_resolve_endpoint();
$queryParams = pobj_collect_query_params();

try {
    $response = pobj_dispatch($pdo, $endpoint, $queryParams);
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (PobjEndpointNotFound $exception) {
    http_response_code(404);
    echo json_encode(['error' => $exception->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro interno do servidor',
        'details' => $exception->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}

function pobj_collect_query_params(): array
{
    $params = [];
    foreach ($_GET as $key => $value) {
        if ($key === 'endpoint') {
            continue;
        }
        $params[$key] = $value;
    }

    return $params;
}

function pobj_resolve_endpoint(): string
{
    if (isset($_GET['endpoint'])) {
        return trim((string) $_GET['endpoint'], '/');
    }

    if (!empty($_SERVER['PATH_INFO'])) {
        return trim((string) $_SERVER['PATH_INFO'], '/');
    }

    $uri = (string) ($_SERVER['REQUEST_URI'] ?? '');
    $path = (string) parse_url($uri, PHP_URL_PATH);

    return trim($path, '/');
}

function pobj_dispatch(PDO $pdo, string $endpoint, array $params): array
{
    if ($endpoint === '' || $endpoint === 'bootstrap') {
        return pobj_handle_bootstrap($pdo);
    }

    if ($endpoint === 'health') {
        return ['status' => 'ok'];
    }

    if (str_starts_with($endpoint, 'filters/')) {
        return pobj_handle_filters($pdo, substr($endpoint, 8), $params);
    }

    if ($endpoint === 'resumo/cards') {
        return pobj_handle_cards($pdo, $params);
    }

    if ($endpoint === 'classica') {
        return pobj_handle_classica($pdo, $params);
    }

    throw new PobjEndpointNotFound('Endpoint não encontrado: ' . $endpoint);
}

function pobj_handle_bootstrap(PDO $pdo): array
{
    [$start, $end] = pobj_default_period($pdo);

    return [
        'period' => ['from' => $start, 'to' => $end],
        'options' => [
            'segmentos' => pobj_fetch_structure_options($pdo, 'segmento'),
            'diretorias' => pobj_fetch_structure_options($pdo, 'diretoria'),
            'regionais' => pobj_fetch_structure_options($pdo, 'regional'),
            'agencias' => pobj_fetch_structure_options($pdo, 'agencia'),
            'ggs' => pobj_fetch_structure_options($pdo, 'gg'),
            'gerentes' => pobj_fetch_structure_options($pdo, 'gerente'),
        ],
    ];
}

function pobj_handle_filters(PDO $pdo, string $resource, array $params): array
{
    $segmento = pobj_query_value($params, 'segmento');
    $diretoria = pobj_query_value($params, 'diretoria');
    $regional = pobj_query_value($params, 'regional');
    $agencia = pobj_query_value($params, 'agencia');
    $gg = pobj_query_value($params, 'gg');

    return match ($resource) {
        'segmentos' => pobj_fetch_structure_options($pdo, 'segmento'),
        'diretorias' => pobj_fetch_structure_options($pdo, 'diretoria', [
            'segmento' => $segmento,
        ]),
        'regionais' => pobj_fetch_structure_options($pdo, 'regional', [
            'segmento' => $segmento,
            'diretoria' => $diretoria,
        ]),
        'agencias' => pobj_fetch_structure_options($pdo, 'agencia', [
            'segmento' => $segmento,
            'diretoria' => $diretoria,
            'regional' => $regional,
        ]),
        'ggs' => pobj_fetch_structure_options($pdo, 'gg', [
            'segmento' => $segmento,
            'diretoria' => $diretoria,
            'regional' => $regional,
            'agencia' => $agencia,
        ]),
        'gerentes' => pobj_fetch_structure_options($pdo, 'gerente', [
            'segmento' => $segmento,
            'diretoria' => $diretoria,
            'regional' => $regional,
            'agencia' => $agencia,
            'gg' => $gg,
        ]),
        default => throw new PobjEndpointNotFound('Filtro não encontrado: ' . $resource),
    };
}

function pobj_handle_cards(PDO $pdo, array $params): array
{
    $filters = pobj_collect_filters($params);
    [$start, $end] = pobj_resolve_period($pdo, $filters['date_from'], $filters['date_to']);

    [$cteSql, $cteParams] = pobj_build_population_cte($pdo, $filters);
    $indicatorClause = '';
    $indicatorParams = [];
    if (!empty($filters['indicadores'])) {
        $indicatorClause = ' AND r.id_indicador IN (' . pobj_placeholders($filters['indicadores'], $indicatorParams, 'ind') . ')';
    }

    $realTable = pobj_table('REALIZADOS', 'f_realizado');
    $metaTable = pobj_table('METAS', 'f_meta');

    $realSql = $cteSql . '\nSELECT r.id_indicador AS indicador, COALESCE(r.id_subindicador, 0) AS subindicador,'
        . ' SUM(r.realizado) AS valor, MAX(r.data_realizado) AS atualizado_em'
        . " FROM `{$realTable}` r"
        . ' JOIN filtro f ON f.funcional = r.funcional'
        . ' WHERE r.data_realizado BETWEEN :date_from AND :date_to'
        . $indicatorClause
        . ' GROUP BY indicador, subindicador';

    $metaClause = '';
    $metaParams = [];
    if (!empty($filters['indicadores'])) {
        $metaClause = ' AND m.id_indicador IN (' . pobj_placeholders($filters['indicadores'], $metaParams, 'mind') . ')';
    }

    $metaSql = $cteSql . '\nSELECT m.id_indicador AS indicador, SUM(m.meta_mensal) AS valor'
        . " FROM `{$metaTable}` m"
        . ' JOIN filtro f ON f.funcional = m.funcional'
        . ' WHERE m.data_meta BETWEEN :meta_from AND :meta_to'
        . $metaClause
        . ' GROUP BY indicador';

    $statementReal = $pdo->prepare($realSql);
    $statementReal->execute(array_merge($cteParams, $indicatorParams, [
        ':date_from' => $start,
        ':date_to' => $end,
    ]));
    $realRows = $statementReal->fetchAll(PDO::FETCH_ASSOC);

    $metaFrom = (new DateTimeImmutable($start))->modify('first day of this month')->format('Y-m-d');
    $metaTo = (new DateTimeImmutable($end))->format('Y-m-d');

    $statementMeta = $pdo->prepare($metaSql);
    $statementMeta->execute(array_merge($cteParams, $metaParams, [
        ':meta_from' => $metaFrom,
        ':meta_to' => $metaTo,
    ]));
    $metaRows = $statementMeta->fetchAll(PDO::FETCH_ASSOC);

    $cards = [];
    $totaisMeta = 0.0;
    $totaisReal = 0.0;

    foreach ($metaRows as $row) {
        $indicador = (string) $row['indicador'];
        $meta = (float) ($row['valor'] ?? 0);
        $cards[$indicador] = [
            'indicador' => $indicador,
            'meta' => $meta,
            'realizado' => 0.0,
            'atualizado_em' => null,
        ];
        $totaisMeta += $meta;
    }

    foreach ($realRows as $row) {
        $indicador = (string) $row['indicador'];
        $valor = (float) ($row['valor'] ?? 0);
        $data = $row['atualizado_em'] ?? null;

        if (!isset($cards[$indicador])) {
            $cards[$indicador] = [
                'indicador' => $indicador,
                'meta' => 0.0,
                'realizado' => 0.0,
                'atualizado_em' => null,
            ];
        }

        $cards[$indicador]['realizado'] += $valor;
        if ($data && ($cards[$indicador]['atualizado_em'] === null || $cards[$indicador]['atualizado_em'] < $data)) {
            $cards[$indicador]['atualizado_em'] = $data;
        }
        $totaisReal += $valor;
    }

    ksort($cards, SORT_NATURAL);

    return [
        'cards' => array_values($cards),
        'totais' => [
            'meta' => $totaisMeta,
            'realizado' => $totaisReal,
        ],
    ];
}

function pobj_handle_classica(PDO $pdo, array $params): array
{
    $filters = pobj_collect_filters($params);
    [$start, $end] = pobj_resolve_period($pdo, $filters['date_from'], $filters['date_to']);

    [$cteSql, $cteParams] = pobj_build_population_cte($pdo, $filters);

    $realTable = pobj_table('REALIZADOS', 'f_realizado');
    $metaTable = pobj_table('METAS', 'f_meta');

    $indicatorClause = '';
    $indicatorParams = [];
    if (!empty($filters['indicadores'])) {
        $indicatorClause = ' AND r.id_indicador IN (' . pobj_placeholders($filters['indicadores'], $indicatorParams, 'cind') . ')';
    }

    $realSql = $cteSql . '\nSELECT r.id_indicador AS indicador, COALESCE(r.id_subindicador, 0) AS subindicador,'
        . ' SUM(r.realizado) AS realizado, MAX(r.data_realizado) AS atualizado_em'
        . " FROM `{$realTable}` r"
        . ' JOIN filtro f ON f.funcional = r.funcional'
        . ' WHERE r.data_realizado BETWEEN :date_from AND :date_to'
        . $indicatorClause
        . ' GROUP BY indicador, subindicador';

    $metaClause = '';
    $metaParams = [];
    if (!empty($filters['indicadores'])) {
        $metaClause = ' AND m.id_indicador IN (' . pobj_placeholders($filters['indicadores'], $metaParams, 'cindm') . ')';
    }

    $metaSql = $cteSql . '\nSELECT m.id_indicador AS indicador, SUM(m.meta_mensal) AS meta'
        . " FROM `{$metaTable}` m"
        . ' JOIN filtro f ON f.funcional = m.funcional'
        . ' WHERE m.data_meta BETWEEN :meta_from AND :meta_to'
        . $metaClause
        . ' GROUP BY indicador';

    $stmtReal = $pdo->prepare($realSql);
    $stmtReal->execute(array_merge($cteParams, $indicatorParams, [
        ':date_from' => $start,
        ':date_to' => $end,
    ]));
    $realRows = $stmtReal->fetchAll(PDO::FETCH_ASSOC);

    $metaFrom = (new DateTimeImmutable($start))->modify('first day of this month')->format('Y-m-d');
    $metaTo = (new DateTimeImmutable($end))->format('Y-m-d');

    $stmtMeta = $pdo->prepare($metaSql);
    $stmtMeta->execute(array_merge($cteParams, $metaParams, [
        ':meta_from' => $metaFrom,
        ':meta_to' => $metaTo,
    ]));
    $metaRows = $stmtMeta->fetchAll(PDO::FETCH_ASSOC);

    $metaIndex = [];
    foreach ($metaRows as $row) {
        $indicador = (string) $row['indicador'];
        $metaIndex[$indicador] = (float) ($row['meta'] ?? 0);
    }

    $daysInMonth = (int) (new DateTimeImmutable($end))->format('t');

    $lines = [];
    foreach ($metaIndex as $indicador => $meta) {
        $lines["$indicador:0"] = [
            'indicador' => $indicador,
            'subindicador' => 0,
            'meta' => $meta,
            'realizado' => 0.0,
            'ref_do_dia' => 0.0,
            'forecast' => 0.0,
            'meta_diaria_nec' => $daysInMonth > 0 ? $meta / $daysInMonth : 0.0,
            'atualizado_em' => null,
        ];
    }

    foreach ($realRows as $row) {
        $indicador = (string) $row['indicador'];
        $sub = (string) $row['subindicador'];
        $key = $indicador . ':' . $sub;
        $realizado = (float) ($row['realizado'] ?? 0);
        $atualizado = $row['atualizado_em'] ?? null;

        if (!isset($lines[$key])) {
            $lines[$key] = [
                'indicador' => $indicador,
                'subindicador' => (int) $sub,
                'meta' => $metaIndex[$indicador] ?? 0.0,
                'realizado' => 0.0,
                'ref_do_dia' => 0.0,
                'forecast' => 0.0,
                'meta_diaria_nec' => $daysInMonth > 0 ? ($metaIndex[$indicador] ?? 0.0) / $daysInMonth : 0.0,
                'atualizado_em' => null,
            ];
        }

        $lines[$key]['realizado'] += $realizado;
        if ($atualizado && ($lines[$key]['atualizado_em'] === null || $lines[$key]['atualizado_em'] < $atualizado)) {
            $lines[$key]['atualizado_em'] = $atualizado;
        }
    }

    uasort($lines, static function (array $a, array $b): int {
        return [$a['indicador'], $a['subindicador']] <=> [$b['indicador'], $b['subindicador']];
    });

    return array_values($lines);
}

function pobj_fetch_structure_options(PDO $pdo, string $type, array $deps = []): array
{
    $table = pobj_table('ESTRUTURA', 'd_estrutura');

    $columnMap = [
        'segmento' => ['id_segmento', 'segmento'],
        'diretoria' => ['id_diretoria', 'diretoria'],
        'regional' => ['id_regional', 'regional'],
        'agencia' => ['id_agencia', 'agencia'],
        'gg' => ['funcional', 'nome'],
        'gerente' => ['funcional', 'nome'],
    ];

    if (!isset($columnMap[$type])) {
        throw new InvalidArgumentException('Filtro inválido: ' . $type);
    }

    [$idColumn, $nameColumn] = $columnMap[$type];

    $sql = "SELECT DISTINCT $idColumn AS id, $nameColumn AS nome FROM `{$table}` WHERE $idColumn IS NOT NULL";
    $params = [];

    if (!empty($deps['segmento'])) {
        $sql .= ' AND id_segmento = :dep_segmento';
        $params[':dep_segmento'] = $deps['segmento'];
    }
    if (!empty($deps['diretoria'])) {
        $sql .= ' AND id_diretoria = :dep_diretoria';
        $params[':dep_diretoria'] = $deps['diretoria'];
    }
    if (!empty($deps['regional'])) {
        $sql .= ' AND id_regional = :dep_regional';
        $params[':dep_regional'] = $deps['regional'];
    }
    if (!empty($deps['agencia'])) {
        $sql .= ' AND id_agencia = :dep_agencia';
        $params[':dep_agencia'] = $deps['agencia'];
    }

    if ($type === 'gg') {
        [$cargoIdField, $cargoValue] = pobj_cargo_condition('GG');
        $sql .= $cargoValue !== null
            ? " AND ($cargoIdField = :cargoGG OR cargo = 'Gerente de Gestão')"
            : " AND cargo = 'Gerente de Gestão'";
        if ($cargoValue !== null) {
            $params[':cargoGG'] = $cargoValue;
        }
    }

    if ($type === 'gerente') {
        [$cargoIdField, $cargoValue] = pobj_cargo_condition('GERENTE');
        $sql .= $cargoValue !== null
            ? " AND ($cargoIdField = :cargoGerente OR cargo = 'Gerente')"
            : " AND cargo = 'Gerente'";
        if ($cargoValue !== null) {
            $params[':cargoGerente'] = $cargoValue;
        }

        if (!empty($deps['gg'])) {
            $sql .= ' AND id_agencia = (SELECT id_agencia FROM `'.$table.'` WHERE funcional = :dep_gg LIMIT 1)';
            $params[':dep_gg'] = $deps['gg'];
        }
    }

    $sql .= ' ORDER BY nome';

    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    return $statement->fetchAll(PDO::FETCH_ASSOC);
}

function pobj_collect_filters(array $params): array
{
    return [
        'segmento' => pobj_query_value($params, 'segmento_id'),
        'diretoria' => pobj_query_value($params, 'diretoria_id'),
        'regional' => pobj_query_value($params, 'regional_id'),
        'agencia' => pobj_query_value($params, 'agencia_id'),
        'gg' => pobj_query_value($params, 'gg_funcional'),
        'gerente' => pobj_query_value($params, 'gerente_funcional'),
        'indicadores' => pobj_query_list($params, 'indicadores'),
        'date_from' => pobj_query_value($params, 'date_from'),
        'date_to' => pobj_query_value($params, 'date_to'),
    ];
}

function pobj_query_value(array $params, string $key): ?string
{
    if (!array_key_exists($key, $params)) {
        return null;
    }
    $value = trim((string) $params[$key]);
    return $value === '' ? null : $value;
}

function pobj_query_list(array $params, string $key): array
{
    $value = pobj_query_value($params, $key);
    if ($value === null) {
        return [];
    }
    $items = array_filter(array_map(static fn($item) => trim($item), explode(',', $value)), static fn($item) => $item !== '');
    return array_values(array_unique($items));
}

function pobj_resolve_period(PDO $pdo, ?string $from, ?string $to): array
{
    [$defaultFrom, $defaultTo] = pobj_default_period($pdo);

    $start = $from && preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) ? $from : $defaultFrom;
    $end = $to && preg_match('/^\d{4}-\d{2}-\d{2}$/', $to) ? $to : $defaultTo;

    if ($start > $end) {
        [$start, $end] = [$end, $start];
    }

    return [$start, $end];
}

function pobj_default_period(PDO $pdo): array
{
    $calendar = pobj_table('CALENDARIO', 'd_calendario');
    $sql = "SELECT MIN(data) AS min_data, MAX(data) AS max_data FROM `{$calendar}`";
    $statement = $pdo->query($sql);
    $row = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

    $minData = $row['min_data'] ?? null;
    $maxData = $row['max_data'] ?? null;

    $today = new DateTimeImmutable('today');
    if ($maxData) {
        $cap = new DateTimeImmutable($maxData);
        if ($today > $cap) {
            $today = $cap;
        }
    }

    $start = $today->modify('first day of this month');
    if ($minData) {
        $min = new DateTimeImmutable($minData);
        if ($start < $min) {
            $start = $min;
        }
    }

    return [$start->format('Y-m-d'), $today->format('Y-m-d')];
}

function pobj_build_population_cte(PDO $pdo, array $filters): array
{
    $table = pobj_table('ESTRUTURA', 'd_estrutura');
    $conditions = ['1=1'];
    $params = [];

    if ($filters['segmento']) {
        $conditions[] = 'e.id_segmento = :f_segmento';
        $params[':f_segmento'] = $filters['segmento'];
    }
    if ($filters['diretoria']) {
        $conditions[] = 'e.id_diretoria = :f_diretoria';
        $params[':f_diretoria'] = $filters['diretoria'];
    }
    if ($filters['regional']) {
        $conditions[] = 'e.id_regional = :f_regional';
        $params[':f_regional'] = $filters['regional'];
    }
    if ($filters['agencia']) {
        $conditions[] = 'e.id_agencia = :f_agencia';
        $params[':f_agencia'] = $filters['agencia'];
    }

    if ($filters['gg']) {
        [$cargoIdField, $cargoValue] = pobj_cargo_condition('GERENTE');
        $cargoFilter = $cargoValue !== null
            ? "(e.cargo = 'Gerente' OR e.$cargoIdField = :cargoGerenteFilter)"
            : "e.cargo = 'Gerente'";
        $conditions[] = $cargoFilter;
        if ($cargoValue !== null) {
            $params[':cargoGerenteFilter'] = $cargoValue;
        }
        $conditions[] = 'e.id_agencia = (SELECT id_agencia FROM `'.$table.'` WHERE funcional = :f_gg LIMIT 1)';
        $params[':f_gg'] = $filters['gg'];
    }

    if ($filters['gerente']) {
        $conditions[] = 'e.funcional = :f_gerente';
        $params[':f_gerente'] = $filters['gerente'];
    }

    $sql = 'WITH filtro AS (SELECT e.funcional FROM `' . $table . '` e WHERE ' . implode(' AND ', $conditions) . ')';

    return [$sql, $params];
}

function pobj_table(string $alias, string $default): string
{
    $envKey = 'DB_TABLE_' . strtoupper($alias);
    $table = (string) pobj_env($envKey, $default);
    if ($table === '') {
        throw new RuntimeException('Tabela não configurada para o alias ' . $alias);
    }
    return $table;
}

function pobj_placeholders(array $values, array &$params, string $prefix): string
{
    $placeholders = [];
    foreach (array_values($values) as $index => $value) {
        $key = ':' . $prefix . $index;
        $placeholders[] = $key;
        $params[$key] = $value;
    }

    return implode(',', $placeholders);
}

function pobj_cargo_condition(string $type): array
{
    if ($type === 'GG') {
        $id = pobj_query_value(['value' => pobj_env('DB_ID_CARGO_GG', '')], 'value');
    } else {
        $id = pobj_query_value(['value' => pobj_env('DB_ID_CARGO_GERENTE', '')], 'value');
    }

    return ['id_cargo', $id !== null && $id !== '' ? $id : null];
}

class PobjEndpointNotFound extends RuntimeException {}
