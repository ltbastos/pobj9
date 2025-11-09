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

    // --- [POBJ] helpers de filtros ---
    function envArray($key, $default = []) {
      $v = getenv($key);
      if (!$v) return $default;
      return array_values(array_filter(array_map('trim', explode(',', $v))));
    }

    function q(PDO $pdo, $sql, $params = []) {
      $st = $pdo->prepare($sql);
      foreach ($params as $k => $v) $st->bindValue(is_int($k)?$k+1:$k, $v);
      $st->execute();
      return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    function buildWhereEstrutura(array $get, &$params) {
      $where = ['1=1'];
      if (!empty($get['segmento_id']))   { $where[] = 'e.id_segmento = :segmento_id';   $params[':segmento_id']   = $get['segmento_id']; }
      if (!empty($get['diretoria_id']))  { $where[] = 'e.id_diretoria = :diretoria_id'; $params[':diretoria_id']  = $get['diretoria_id']; }
      if (!empty($get['regional_id']))   { $where[] = 'e.id_regional  = :regional_id';  $params[':regional_id']   = $get['regional_id']; }
      if (!empty($get['agencia_id']))    { $where[] = 'e.id_agencia   = :agencia_id';   $params[':agencia_id']    = $get['agencia_id']; }
      return 'WHERE '.implode(' AND ', $where);
    }

    function sqlIsGG() {
      $ids = envArray('GG_IDS', ['GG','GERENTE_GESTAO']);
      $in = implode(',', array_fill(0, count($ids), '?'));
      // retorna [sql, params]
      return ['(e.id_cargo IN ('.$in.') OR e.cargo LIKE ?)', array_merge($ids, ['%gest%'])];
    }

    function sqlIsGerente() {
      $ids = envArray('GERENTE_IDS', ['GERENTE']);
      $in = implode(',', array_fill(0, count($ids), '?'));
      return ['(e.id_cargo IN ('.$in.') OR e.cargo LIKE ?)', array_merge($ids, ['gerente%'])];
    }

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

    switch ($endpoint) {
        case 'health':
            $json(['status' => 'ok']);

        case 'filtros':
            $nivel = $_GET['nivel'] ?? '';
            $params = [];
            $where = buildWhereEstrutura($_GET, $params);

            if ($nivel === 'diretorias') {
                $rows = q($pdo, "SELECT DISTINCT e.id_diretoria AS id, e.diretoria AS label
                     FROM d_estrutura e $where
                     AND e.id_diretoria IS NOT NULL AND e.diretoria IS NOT NULL
                     ORDER BY label", $params);
                echo json_encode(['diretorias' => $rows]); exit;
            }

            if ($nivel === 'regionais') {
                $rows = q($pdo, "SELECT DISTINCT e.id_regional AS id, e.regional AS label, e.id_diretoria
                     FROM d_estrutura e $where
                     AND e.id_regional IS NOT NULL AND e.regional IS NOT NULL
                     ORDER BY label", $params);
                echo json_encode(['regionais' => $rows]); exit;
            }

            if ($nivel === 'agencias') {
                $rows = q($pdo, "SELECT DISTINCT e.id_agencia AS id, e.agencia AS label, e.id_regional
                     FROM d_estrutura e $where
                     AND e.id_agencia IS NOT NULL AND e.agencia IS NOT NULL
                     ORDER BY label", $params);
                echo json_encode(['agencias' => $rows]); exit;
            }

            if ($nivel === 'subindicadores') {
                $rows = q($pdo, "
                    SELECT DISTINCT p.id_subindicador AS id, p.subindicador AS label
                    FROM d_produto p
                    WHERE p.id_indicador = :indicador_id
                      AND p.id_subindicador IS NOT NULL
                    ORDER BY label
                ", [':indicador_id' => $_GET['indicador_id'] ?? 0]);
                echo json_encode(['subindicadores' => $rows]); exit;
            }

            if ($nivel === 'ggestoes') {
                // lista GG no escopo filtrado
                list($isGGsql, $isGGparams) = sqlIsGG();
                $rows = q($pdo, "SELECT DISTINCT e.funcional, e.nome AS label, e.id_agencia
                     FROM d_estrutura e $where AND $isGGsql
                     ORDER BY label", array_merge($params, $isGGparams));
                echo json_encode(['ggestoes' => $rows]); exit;
            }

            if ($nivel === 'gerentes') {
                // Se veio gg_funcional: limitar às agências do GG
                $extra = '';
                $pp = $params;
                if (!empty($_GET['gg_funcional'])) {
                    $agenciasDoGG = q($pdo, "SELECT DISTINCT id_agencia FROM d_estrutura WHERE funcional = :gg", [':gg'=>$_GET['gg_funcional']]);
                    if ($agenciasDoGG) {
                        $in = implode(',', array_fill(0, count($agenciasDoGG), '?'));
                        $extra = " AND e.id_agencia IN ($in) ";
                        foreach ($agenciasDoGG as $a) $pp[] = $a['id_agencia'];
                    }
                }
                list($isGersql, $isGerparams) = sqlIsGerente();
                $rows = q($pdo, "SELECT DISTINCT e.funcional, e.nome AS label, e.id_agencia
                     FROM d_estrutura e $where $extra AND $isGersql
                     ORDER BY label", array_merge(is_array($pp)?$pp:[], $isGerparams));
                echo json_encode(['gerentes' => $rows]); exit;
            }

            http_response_code(400);
            echo json_encode(['error'=>'nivel inválido']); exit;

        case 'status_indicadores':
            $rows = q($pdo, 'SELECT id, status FROM d_status_indicadores ORDER BY id');
            if (!$rows) {
                $rows = [
                    ['id' => '01', 'status' => 'Atingido'],
                    ['id' => '02', 'status' => 'Não Atingido'],
                    ['id' => '03', 'status' => 'Todos'],
                ];
            }
            $json(['rows' => $rows]);

        case 'bootstrap': {
            $params = [];
            $where = buildWhereEstrutura($_GET, $params);

            $segmentos = q($pdo, "SELECT DISTINCT e.id_segmento AS id, e.segmento AS label
                        FROM d_estrutura e
                        WHERE e.id_segmento IS NOT NULL AND e.segmento IS NOT NULL
                        ORDER BY label");

            $diretorias = q($pdo, "SELECT DISTINCT e.id_diretoria AS id, e.diretoria AS label
                         FROM d_estrutura e
                         WHERE e.id_diretoria IS NOT NULL AND e.diretoria IS NOT NULL
                         ORDER BY label");

            $regionais = q($pdo, "SELECT DISTINCT e.id_regional AS id, e.regional AS label, e.id_diretoria
                        FROM d_estrutura e
                        WHERE e.id_regional IS NOT NULL AND e.regional IS NOT NULL
                        ORDER BY label");

            $agencias = q($pdo, "SELECT DISTINCT e.id_agencia AS id, e.agencia AS label, e.id_regional
                       FROM d_estrutura e
                       WHERE e.id_agencia IS NOT NULL AND e.agencia IS NOT NULL
                       ORDER BY label");

            $indicadores = q($pdo, "
                SELECT DISTINCT p.id_indicador AS id, p.indicador AS label
                FROM d_produto p
                ORDER BY label
            ");

            // GG
            list($isGGsql, $isGGparams) = sqlIsGG();
            $ggestoes = q($pdo, "SELECT DISTINCT e.funcional, e.nome AS label, e.id_agencia
                       FROM d_estrutura e
                       WHERE $isGGsql
                       ORDER BY label", $isGGparams);

            // Gerentes
            list($isGersql, $isGerparams) = sqlIsGerente();
            $gerentes = q($pdo, "SELECT DISTINCT e.funcional, e.nome AS label, e.id_agencia
                       FROM d_estrutura e
                       WHERE $isGersql
                       ORDER BY label", $isGerparams);

            echo json_encode([
                'segmentos'        => $segmentos,
                'diretorias'       => $diretorias,
                'regionais'        => $regionais,
                'agencias'         => $agencias,
                'ggestoes'         => $ggestoes,
                'gerentes'         => $gerentes,
                'indicadores'      => $indicadores,
                'subindicadores'   => [],
                'updated_at'       => date('c'),
            ]);
            exit;
        }

        case 'resumo':
            $seg = trim($_GET['segmento_id'] ?? '');
            $dir = trim($_GET['diretoria_id'] ?? '');
            $reg = trim($_GET['regional_id'] ?? '');
            $age = trim($_GET['agencia_id'] ?? '');
            $gg  = trim($_GET['gg_funcional'] ?? '');
            $ger = trim($_GET['gerente_funcional'] ?? '');
            $ini = trim($_GET['data_ini'] ?? '');
            $fim = trim($_GET['data_fim'] ?? '');
            $indicadorParam = trim((string)($_GET['indicador_id'] ?? $_GET['id_indicador'] ?? ''));
            $subIndicadorParam = trim((string)($_GET['subindicador_id'] ?? $_GET['id_subindicador'] ?? ''));

            if ($ini === '' || $fim === '') {
                $jsonError('data_ini/data_fim obrigatórios');
            }

            $filters = [];
            $params = [
                ':ini' => $ini,
                ':fim' => $fim,
            ];

            if ($seg !== '') {
                $filters[] = 'e.id_segmento = :segmento_id';
                $params[':segmento_id'] = $seg;
            }
            if ($dir !== '') {
                $filters[] = 'e.id_diretoria = :diretoria_id';
                $params[':diretoria_id'] = $dir;
            }
            if ($reg !== '') {
                $filters[] = 'e.id_regional = :regional_id';
                $params[':regional_id'] = $reg;
            }
            if ($age !== '') {
                $filters[] = 'e.id_agencia = :agencia_id';
                $params[':agencia_id'] = $age;
            }
            if ($gg !== '') {
                $filters[] = 'e.funcional = :gg_funcional';
                $params[':gg_funcional'] = $gg;
            }
            if ($ger !== '') {
                $filters[] = 'e.funcional = :gerente_funcional';
                $params[':gerente_funcional'] = $ger;
            }

            $estruturaWhere = $filters ? ' AND ' . implode(' AND ', $filters) : '';

            $prodCondReal = '1=1';
            $prodCondMeta = '1=1';

            if ($subIndicadorParam !== '') {
                $params[':sid'] = (int) $subIndicadorParam;
                $params[':iid'] = (int) ($indicadorParam !== '' ? $indicadorParam : ($_GET['indicador_id'] ?? $_GET['id_indicador'] ?? 0));
                $prodCondReal = 'p.id_indicador = :iid AND p.id_subindicador = :sid';
                $prodCondMeta = $prodCondReal;
            } elseif ($indicadorParam !== '') {
                $params[':iid'] = (int) $indicadorParam;
                $prodCondReal = 'p.id_indicador = :iid';
                $prodCondMeta = $prodCondReal;
            }

            $sqlReal = "
                SELECT SUM(fr.realizado) AS realizado
                FROM f_realizado fr
                JOIN d_calendario c ON c.data = fr.data_realizado
                JOIN d_produto p
                  ON p.id_indicador = fr.id_indicador
                 AND p.id_subindicador <=> fr.id_subindicador
                JOIN d_estrutura e ON e.funcional = fr.funcional
                WHERE c.data BETWEEN :ini AND :fim
                  AND ($prodCondReal)
                  $estruturaWhere
            ";
            $real = q($pdo, $sqlReal, $params);

            $sqlMeta = "
                SELECT SUM(fm.meta_mensal) AS meta
                FROM f_meta fm
                JOIN d_calendario c ON c.data = fm.data_meta
                JOIN d_produto p
                  ON p.id_indicador = fm.id_indicador
                 AND p.id_subindicador <=> fm.id_subindicador
                JOIN d_estrutura e ON e.funcional = fm.funcional
                WHERE c.data BETWEEN DATE_FORMAT(:fim,'%Y-%m-01') AND :fim
                  AND ($prodCondMeta)
                  $estruturaWhere
            ";
            $meta = q($pdo, $sqlMeta, $params);

            $realizado_total = (float) ($real[0]['realizado'] ?? 0);
            $meta_total = (float) ($meta[0]['meta'] ?? 0);

            echo json_encode([
                'kpi' => [
                    'realizado_total' => $realizado_total,
                    'meta_total' => $meta_total,
                ],
                'updated_at' => date('c'),
            ]);
            exit;

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