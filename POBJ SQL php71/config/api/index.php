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
    function env(string $key, $default = null) {
      $value = getenv($key);
      return $value === false ? $default : $value;
    }

    function envArray($key, $default = []) {
      $v = getenv($key);
      if (!$v) return $default;
      return array_values(array_filter(array_map('trim', explode(',', $v))));
    }

    function q(PDO $pdo, string $sql, array $p = []) {
      $st = $pdo->prepare($sql);
      foreach ($p as $k => $v) {
        if (is_int($k)) {
          $st->bindValue($k + 1, $v);
        } else {
          $st->bindValue($k, $v);
        }
      }
      $st->execute();
      return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    function ok($data) {
      echo json_encode($data, JSON_UNESCAPED_UNICODE);
      exit;
    }

    function err(string $message, int $status = 400) {
      http_response_code($status);
      ok(['error' => $message]);
    }

    function numOrNull(string $k): ?int {
      if (!isset($_GET[$k])) return null;
      $n = (int) $_GET[$k];
      return $n > 0 ? $n : null;
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
      $placeholders = [];
      $params = [];
      foreach ($ids as $idx => $id) {
        $key = ':gg_id_' . $idx;
        $placeholders[] = $key;
        $params[$key] = $id;
      }
      $params[':gg_like'] = '%gest%';
      $inSql = $placeholders ? 'e.id_cargo IN (' . implode(',', $placeholders) . ')' : '1=0';
      return ['(' . $inSql . ' OR e.cargo LIKE :gg_like)', $params];
    }

    function sqlIsGerente() {
      $ids = envArray('GERENTE_IDS', ['GERENTE']);
      $placeholders = [];
      $params = [];
      foreach ($ids as $idx => $id) {
        $key = ':ger_id_' . $idx;
        $placeholders[] = $key;
        $params[$key] = $id;
      }
      $params[':ger_like'] = 'gerente%';
      $inSql = $placeholders ? 'e.id_cargo IN (' . implode(',', $placeholders) . ')' : '1=0';
      return ['(' . $inSql . ' OR e.cargo LIKE :ger_like)', $params];
    }

    $T_ESTR   = env('DB_TABLE_ESTRUTURA', 'd_estrutura');
    $T_PROD   = env('DB_TABLE_PRODUTOS', 'd_produto');
    $T_FR     = env('DB_TABLE_REALIZADOS', 'f_realizado');
    $T_FM     = env('DB_TABLE_METAS', 'f_meta');
    $T_CAL    = env('DB_TABLE_CALENDARIO', 'd_calendario');
    $T_STATUS = env('DB_TABLE_STATUS_INDICADORES', 'd_status_indicadores');

    $endpoint = $_GET['endpoint'] ?? '';

    switch ($endpoint) {
        case 'health':
            ok(['status' => 'ok']);

        case 'filtros':
            $nivel = $_GET['nivel'] ?? '';
            $params = [];
            $where = buildWhereEstrutura($_GET, $params);

            if ($nivel === 'diretorias') {
                $rows = q($pdo, "SELECT DISTINCT e.id_diretoria AS id, e.diretoria AS label
                     FROM {$T_ESTR} e $where
                     AND e.id_diretoria IS NOT NULL AND e.diretoria IS NOT NULL
                     ORDER BY label", $params);
                ok(['diretorias' => $rows]);
            }

            if ($nivel === 'regionais') {
                $rows = q($pdo, "SELECT DISTINCT e.id_regional AS id, e.regional AS label, e.id_diretoria
                     FROM {$T_ESTR} e $where
                     AND e.id_regional IS NOT NULL AND e.regional IS NOT NULL
                     ORDER BY label", $params);
                ok(['regionais' => $rows]);
            }

            if ($nivel === 'agencias') {
                $rows = q($pdo, "SELECT DISTINCT e.id_agencia AS id, e.agencia AS label, e.id_regional
                     FROM {$T_ESTR} e $where
                     AND e.id_agencia IS NOT NULL AND e.agencia IS NOT NULL
                     ORDER BY label", $params);
                ok(['agencias' => $rows]);
            }

            if ($nivel === 'indicadores') {
                $prodParams = [];
                $where = "NULLIF(TRIM(p.indicador),'') IS NOT NULL";
                if (!empty($_GET['familia_id'])) {
                    $famKey = q($pdo, "SELECT UPPER(TRIM(MAX(familia))) AS fam_key FROM {$T_PROD} WHERE id_familia = :fid", [':fid' => (int) $_GET['familia_id']]);
                    if (!empty($famKey[0]['fam_key'])) {
                        $where .= ' AND UPPER(TRIM(p.familia)) = :famk';
                        $prodParams[':famk'] = $famKey[0]['fam_key'];
                    }
                }
                $rows = q($pdo, "
                    SELECT DISTINCT p.id_indicador AS id, p.indicador AS label
                    FROM {$T_PROD} p
                    WHERE $where
                    ORDER BY label
                ", $prodParams);
                ok(['indicadores' => $rows]);
            }

            if ($nivel === 'subindicadores') {
                $iid = (int) ($_GET['indicador_id'] ?? 0);
                $rows = q($pdo, "
                    SELECT DISTINCT p.id_subindicador AS id, p.subindicador AS label
                    FROM {$T_PROD} p
                    WHERE p.id_indicador = :iid
                      AND p.id_subindicador IS NOT NULL
                      AND NULLIF(TRIM(p.subindicador),'') IS NOT NULL
                    ORDER BY label
                ", [':iid' => $iid]);
                ok(['subindicadores' => $rows]);
            }

            if ($nivel === 'produto_info') {
                $iid = (int) ($_GET['indicador_id'] ?? 0);
                $info = q($pdo, "
                    SELECT MIN(id_familia) AS familia_id, MAX(familia) AS familia_label
                    FROM {$T_PROD}
                    WHERE id_indicador = :iid
                ", [':iid' => $iid]);
                $subs = q($pdo, "
                    SELECT DISTINCT id_subindicador AS id, subindicador AS label
                    FROM {$T_PROD}
                    WHERE id_indicador = :iid
                      AND id_subindicador IS NOT NULL
                      AND NULLIF(TRIM(subindicador),'') IS NOT NULL
                    ORDER BY label
                ", [':iid' => $iid]);
                ok([
                    'familia_id' => $info[0]['familia_id'] ?? null,
                    'familia' => $info[0]['familia_label'] ?? null,
                    'subindicadores' => $subs,
                ]);
            }

            if ($nivel === 'ggestoes') {
                // lista GG no escopo filtrado
                list($isGGsql, $isGGparams) = sqlIsGG();
                $rows = q($pdo, "SELECT DISTINCT e.funcional, e.nome AS label, e.id_agencia
                     FROM {$T_ESTR} e $where AND $isGGsql
                     ORDER BY label", array_merge($params, $isGGparams));
                ok(['ggestoes' => $rows]);
            }

            if ($nivel === 'gerentes') {
                // Se veio gg_funcional: limitar às agências do GG
                $extra = '';
                $pp = $params;
                if (!empty($_GET['gg_funcional'])) {
                    $agenciasDoGG = q($pdo, "SELECT DISTINCT id_agencia FROM {$T_ESTR} WHERE funcional = :gg", [':gg'=>$_GET['gg_funcional']]);
                    if ($agenciasDoGG) {
                        $ph = [];
                        foreach ($agenciasDoGG as $idx => $a) {
                            $key = ':agencia_' . $idx;
                            $ph[] = $key;
                            $pp[$key] = $a['id_agencia'];
                        }
                        if ($ph) {
                            $extra = ' AND e.id_agencia IN (' . implode(',', $ph) . ') ';
                        }
                    }
                }
                list($isGersql, $isGerparams) = sqlIsGerente();
                $rows = q($pdo, "SELECT DISTINCT e.funcional, e.nome AS label, e.id_agencia
                     FROM {$T_ESTR} e $where $extra AND $isGersql
                     ORDER BY label", array_merge($pp, $isGerparams));
                ok(['gerentes' => $rows]);
            }

            err('nivel inválido');

        case 'status_indicadores':
            $rows = [];
            try {
                if ($T_STATUS) {
                    $rows = q($pdo, "SELECT id, status FROM {$T_STATUS} ORDER BY id");
                }
            } catch (Throwable $ignored) {
                $rows = [];
            }
            if (!$rows) {
                $rows = [
                    ['id' => '01', 'status' => 'Atingido'],
                    ['id' => '02', 'status' => 'Não Atingido'],
                    ['id' => '03', 'status' => 'Todos'],
                ];
            }
            ok(['rows' => $rows]);

        case 'bootstrap': {
            $params = [];
            $where = buildWhereEstrutura($_GET, $params);

            $segmentos = q($pdo, "SELECT DISTINCT e.id_segmento AS id, e.segmento AS label
                        FROM {$T_ESTR} e
                        WHERE e.id_segmento IS NOT NULL AND e.segmento IS NOT NULL
                        ORDER BY label");

            $diretorias = q($pdo, "SELECT DISTINCT e.id_diretoria AS id, e.diretoria AS label
                         FROM {$T_ESTR} e
                         WHERE e.id_diretoria IS NOT NULL AND e.diretoria IS NOT NULL
                         ORDER BY label");

            $regionais = q($pdo, "SELECT DISTINCT e.id_regional AS id, e.regional AS label, e.id_diretoria
                        FROM {$T_ESTR} e
                        WHERE e.id_regional IS NOT NULL AND e.regional IS NOT NULL
                        ORDER BY label");

            $agencias = q($pdo, "SELECT DISTINCT e.id_agencia AS id, e.agencia AS label, e.id_regional
                       FROM {$T_ESTR} e
                       WHERE e.id_agencia IS NOT NULL AND e.agencia IS NOT NULL
                       ORDER BY label");

            $familias = q($pdo, "
                SELECT MIN(p.id_familia) AS id, MAX(p.familia) AS label
                FROM {$T_PROD} p
                WHERE NULLIF(TRIM(p.familia),'') IS NOT NULL
                GROUP BY UPPER(TRIM(p.familia))
                ORDER BY label
            ");

            $indicadores = q($pdo, "
                SELECT DISTINCT p.id_indicador AS id, p.indicador AS label
                FROM {$T_PROD} p
                WHERE NULLIF(TRIM(p.indicador),'') IS NOT NULL
                ORDER BY label
            ");

            // GG
            list($isGGsql, $isGGparams) = sqlIsGG();
            $ggestoes = q($pdo, "SELECT DISTINCT e.funcional, e.nome AS label, e.id_agencia
                       FROM {$T_ESTR} e
                       WHERE $isGGsql
                       ORDER BY label", $isGGparams);

            // Gerentes
            list($isGersql, $isGerparams) = sqlIsGerente();
            $gerentes = q($pdo, "SELECT DISTINCT e.funcional, e.nome AS label, e.id_agencia
                       FROM {$T_ESTR} e
                       WHERE $isGersql
                       ORDER BY label", $isGerparams);

            $response = [
                'segmentos'        => $segmentos,
                'diretorias'       => $diretorias,
                'regionais'        => $regionais,
                'agencias'         => $agencias,
                'ggestoes'         => $ggestoes,
                'gerentes'         => $gerentes,
                'updated_at'       => date('c'),
            ];

            $response['familias'] = $familias;
            $response['indicadores'] = $indicadores;
            $response['subindicadores'] = [];

            ok($response);
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

            if ($ini === '' || $fim === '') {
                err('data_ini/data_fim obrigatórios');
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

            $fid = numOrNull('familia_id');
            $iid = numOrNull('indicador_id');
            $sid = numOrNull('subindicador_id');

            $prodCond = '1=1';
            if ($sid) {
                $params[':iid'] = $iid ?? 0;
                $params[':sid'] = $sid;
                $prodCond = 'p.id_indicador = :iid AND p.id_subindicador = :sid';
            } elseif ($iid) {
                $params[':iid'] = $iid;
                $prodCond = 'p.id_indicador = :iid';
            }

            if ($fid) {
                $famKey = q($pdo, "SELECT UPPER(TRIM(MAX(familia))) AS fam_key FROM {$T_PROD} WHERE id_familia = :fid", [':fid' => $fid]);
                if (!empty($famKey[0]['fam_key'])) {
                    $prodCond .= ' AND UPPER(TRIM(p.familia)) = :famk';
                    $params[':famk'] = $famKey[0]['fam_key'];
                }
            }

            $sqlR = "
                SELECT SUM(fr.realizado) AS realizado
                FROM {$T_FR} fr
                JOIN {$T_CAL} c ON c.data = fr.data_realizado
                JOIN {$T_PROD} p
                  ON p.id_indicador = fr.id_indicador
                 AND p.id_subindicador <=> fr.id_subindicador
                JOIN {$T_ESTR} e ON e.funcional = fr.funcional
                WHERE c.data BETWEEN :ini AND :fim
                  AND ($prodCond)
                  $estruturaWhere
            ";
            $realizado_total = (float) (q($pdo, $sqlR, $params)[0]['realizado'] ?? 0);

            $sqlM = "
                SELECT SUM(fm.meta_mensal) AS meta
                FROM {$T_FM} fm
                JOIN {$T_CAL} c ON c.data = fm.data_meta
                JOIN {$T_PROD} p
                  ON p.id_indicador = fm.id_indicador
                 AND p.id_subindicador <=> fm.id_subindicador
                JOIN {$T_ESTR} e ON e.funcional = fm.funcional
                WHERE c.data BETWEEN DATE_FORMAT(:fim,'%Y-%m-01') AND :fim
                  AND ($prodCond)
                  $estruturaWhere
            ";
            $meta_total = (float) (q($pdo, $sqlM, $params)[0]['meta'] ?? 0);

            ok([
                'kpi' => [
                    'realizado_total' => $realizado_total,
                    'meta_total' => $meta_total,
                ],
                'updated_at' => date('c'),
            ]);

        default:
            err('endpoint não encontrado', 404);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'server_error',
        'message' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}