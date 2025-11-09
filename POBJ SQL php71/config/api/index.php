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
        $param = is_int($k) ? $k + 1 : $k;
        if ($v === null) {
          $st->bindValue($param, null, PDO::PARAM_NULL);
        } elseif (is_int($v)) {
          $st->bindValue($param, $v, PDO::PARAM_INT);
        } else {
          $st->bindValue($param, $v);
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

    function qnull(string $key) {
      if (!isset($_GET[$key])) {
        return null;
      }
      $value = trim((string) $_GET[$key]);
      return $value === '' ? null : $value;
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

            if ($nivel === 'familias') {
                $rows = q($pdo, "
                    SELECT DISTINCT
                        p.id_familia AS id,
                        TRIM(p.familia) AS label
                    FROM {$T_PROD} p
                    WHERE COALESCE(TRIM(p.familia),'') <> ''
                    ORDER BY label
                ");
                ok(['familias' => $rows]);
            }

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
                $familiaId = numOrNull('familia_id');
                $rows = q($pdo, "
                    SELECT DISTINCT
                        p.id_indicador AS id,
                        TRIM(p.indicador) AS label
                    FROM {$T_PROD} p
                    WHERE (:familia_id IS NULL OR p.id_familia = :familia_id)
                      AND COALESCE(TRIM(p.indicador),'') <> ''
                    ORDER BY label
                ", [':familia_id' => $familiaId]);
                ok(['indicadores' => $rows]);
            }

            if ($nivel === 'subindicadores') {
                $iid = numOrNull('indicador_id');
                if (!$iid) {
                    ok(['subindicadores' => []]);
                }
                $rows = q($pdo, "
                    SELECT DISTINCT p.id_subindicador AS id, TRIM(p.subindicador) AS label
                    FROM {$T_PROD} p
                    WHERE p.id_indicador = :iid
                      AND p.id_subindicador IS NOT NULL
                      AND COALESCE(TRIM(p.subindicador),'') <> ''
                    ORDER BY label
                ", [':iid' => $iid]);
                ok(['subindicadores' => $rows]);
            }

            if ($nivel === 'produto_info') {
                $iid = numOrNull('indicador_id');
                if (!$iid) {
                    ok(['familia_id' => null, 'has_sub' => false]);
                }
                $info = q($pdo, "
                    SELECT
                        MIN(id_familia) AS familia_id,
                        MAX(COALESCE(TRIM(familia), '')) AS familia_label,
                        MAX(CASE WHEN id_subindicador IS NOT NULL AND COALESCE(TRIM(subindicador),'') <> '' THEN 1 ELSE 0 END) AS has_sub
                    FROM {$T_PROD}
                    WHERE id_indicador = :iid
                ", [':iid' => $iid]);
                $row = $info[0] ?? [];
                ok([
                    'familia_id' => isset($row['familia_id']) ? (int) $row['familia_id'] : null,
                    'familia' => $row['familia_label'] ?? null,
                    'has_sub' => !empty($row['has_sub']),
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
                SELECT DISTINCT
                    p.id_familia AS id,
                    TRIM(p.familia) AS label
                FROM {$T_PROD} p
                WHERE COALESCE(TRIM(p.familia),'') <> ''
                ORDER BY label
            ");

            $indicadores = q($pdo, "
                SELECT DISTINCT p.id_indicador AS id, TRIM(p.indicador) AS label
                FROM {$T_PROD} p
                WHERE COALESCE(TRIM(p.indicador),'') <> ''
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
            $ini = qnull('data_ini');
            $fim = qnull('data_fim');
            if (!$ini || !$fim) {
                err('data_ini/data_fim obrigatórios');
            }

            $seg = qnull('segmento_id');
            $dir = qnull('diretoria_id');
            $reg = qnull('regional_id');
            $age = qnull('agencia_id');
            $gg  = qnull('gg_funcional');
            $ger = qnull('gerente_funcional');

            $fid = numOrNull('familia_id');
            $iid = numOrNull('indicador_id');
            $sid = numOrNull('subindicador_id');

            $params = [
                ':data_ini' => $ini,
                ':data_fim' => $fim,
                ':segmento_id' => $seg,
                ':diretoria_id' => $dir,
                ':regional_id' => $reg,
                ':agencia_id' => $age,
                ':gg_funcional' => $gg,
                ':gerente_funcional' => $ger,
                ':familia_id' => $fid,
                ':indicador_id' => $iid,
                ':subindicador_id' => $sid,
            ];

            $sqlResumo = "
                WITH escopo AS (
                    SELECT e.funcional
                    FROM {$T_ESTR} e
                    WHERE 1=1
                      AND (:segmento_id IS NULL OR e.id_segmento = :segmento_id)
                      AND (:diretoria_id IS NULL OR e.id_diretoria = :diretoria_id)
                      AND (:regional_id IS NULL OR e.id_regional = :regional_id)
                      AND (:agencia_id IS NULL OR e.id_agencia = :agencia_id)
                      AND (
                        :gg_funcional IS NULL OR e.funcional IN (
                          SELECT g.funcional
                          FROM {$T_ESTR} gg
                          JOIN {$T_ESTR} g ON g.id_agencia = gg.id_agencia
                          WHERE gg.funcional = :gg_funcional
                        )
                      )
                      AND (:gerente_funcional IS NULL OR e.funcional = :gerente_funcional)
                ),
                prod AS (
                    SELECT id_familia, familia, id_indicador, indicador, id_subindicador, subindicador
                    FROM {$T_PROD}
                ),
                r AS (
                    SELECT fr.funcional, SUM(fr.realizado) AS realizado
                    FROM {$T_FR} fr
                    JOIN {$T_CAL} c ON c.data = fr.data_realizado
                    JOIN prod p ON p.id_indicador = fr.id_indicador
                               AND (p.id_subindicador <=> fr.id_subindicador)
                    JOIN escopo s ON s.funcional = fr.funcional
                    WHERE c.data BETWEEN :data_ini AND :data_fim
                      AND (:familia_id IS NULL OR p.id_familia = :familia_id)
                      AND (:indicador_id IS NULL OR p.id_indicador = :indicador_id)
                      AND (:subindicador_id IS NULL OR p.id_subindicador = :subindicador_id)
                    GROUP BY fr.funcional
                ),
                m AS (
                    SELECT fm.funcional, SUM(fm.meta_mensal) AS meta
                    FROM {$T_FM} fm
                    JOIN {$T_CAL} c ON c.data = fm.data_meta
                    JOIN prod p ON p.id_indicador = fm.id_indicador
                               AND (p.id_subindicador <=> fm.id_subindicador)
                    JOIN escopo s ON s.funcional = fm.funcional
                    WHERE c.data BETWEEN DATE_FORMAT(:data_fim,'%Y-%m-01') AND :data_fim
                      AND (:familia_id IS NULL OR p.id_familia = :familia_id)
                      AND (:indicador_id IS NULL OR p.id_indicador = :indicador_id)
                      AND (:subindicador_id IS NULL OR p.id_subindicador = :subindicador_id)
                    GROUP BY fm.funcional
                )
                SELECT
                    COALESCE(SUM(r.realizado), 0) AS realizado_total,
                    COALESCE(SUM(m.meta), 0) AS meta_total
                FROM escopo s
                LEFT JOIN r ON r.funcional = s.funcional
                LEFT JOIN m ON m.funcional = s.funcional
            ";

            $resumo = q($pdo, $sqlResumo, $params);
            $payload = $resumo[0] ?? ['realizado_total' => 0, 'meta_total' => 0];

            ok([
                'kpi' => [
                    'realizado_total' => (float) ($payload['realizado_total'] ?? 0),
                    'meta_total' => (float) ($payload['meta_total'] ?? 0),
                ],
                'updated_at' => date('c'),
            ]);

        case 'linhas_classicas':
            $ini = qnull('data_ini');
            $fim = qnull('data_fim');
            if (!$ini || !$fim) {
                err('data_ini/data_fim obrigatórios');
            }

            $seg = qnull('segmento_id');
            $dir = qnull('diretoria_id');
            $reg = qnull('regional_id');
            $age = qnull('agencia_id');
            $gg  = qnull('gg_funcional');
            $ger = qnull('gerente_funcional');

            $fid = numOrNull('familia_id');
            $iid = numOrNull('indicador_id');
            $sid = numOrNull('subindicador_id');

            $params = [
                ':data_ini' => $ini,
                ':data_fim' => $fim,
                ':segmento_id' => $seg,
                ':diretoria_id' => $dir,
                ':regional_id' => $reg,
                ':agencia_id' => $age,
                ':gg_funcional' => $gg,
                ':gerente_funcional' => $ger,
                ':familia_id' => $fid,
                ':indicador_id' => $iid,
                ':subindicador_id' => $sid,
            ];

            $sqlClassica = "
                WITH escopo AS (
                    SELECT e.funcional
                    FROM {$T_ESTR} e
                    WHERE 1=1
                      AND (:segmento_id IS NULL OR e.id_segmento = :segmento_id)
                      AND (:diretoria_id IS NULL OR e.id_diretoria = :diretoria_id)
                      AND (:regional_id IS NULL OR e.id_regional = :regional_id)
                      AND (:agencia_id IS NULL OR e.id_agencia = :agencia_id)
                      AND (
                        :gg_funcional IS NULL OR e.funcional IN (
                          SELECT g.funcional
                          FROM {$T_ESTR} gg
                          JOIN {$T_ESTR} g ON g.id_agencia = gg.id_agencia
                          WHERE gg.funcional = :gg_funcional
                        )
                      )
                      AND (:gerente_funcional IS NULL OR e.funcional = :gerente_funcional)
                ),
                base AS (
                    SELECT
                        p.id_familia,
                        TRIM(p.familia) AS familia,
                        p.id_indicador,
                        TRIM(p.indicador) AS indicador,
                        p.id_subindicador,
                        NULLIF(TRIM(p.subindicador),'') AS subindicador,
                        SUM(fr.realizado) AS realizado,
                        0 AS meta
                    FROM {$T_PROD} p
                    JOIN {$T_FR} fr ON p.id_indicador = fr.id_indicador
                                   AND (p.id_subindicador <=> fr.id_subindicador)
                    JOIN {$T_CAL} c ON c.data = fr.data_realizado
                    JOIN escopo s ON s.funcional = fr.funcional
                    WHERE c.data BETWEEN :data_ini AND :data_fim
                      AND (:familia_id IS NULL OR p.id_familia = :familia_id)
                      AND (:indicador_id IS NULL OR p.id_indicador = :indicador_id)
                      AND (:subindicador_id IS NULL OR p.id_subindicador = :subindicador_id)
                    GROUP BY p.id_familia, p.familia, p.id_indicador, p.indicador, p.id_subindicador, p.subindicador

                    UNION ALL

                    SELECT
                        p.id_familia,
                        TRIM(p.familia) AS familia,
                        p.id_indicador,
                        TRIM(p.indicador) AS indicador,
                        p.id_subindicador,
                        NULLIF(TRIM(p.subindicador),'') AS subindicador,
                        0 AS realizado,
                        SUM(fm.meta_mensal) AS meta
                    FROM {$T_PROD} p
                    JOIN {$T_FM} fm ON p.id_indicador = fm.id_indicador
                                   AND (p.id_subindicador <=> fm.id_subindicador)
                    JOIN {$T_CAL} c ON c.data = fm.data_meta
                    JOIN escopo s ON s.funcional = fm.funcional
                    WHERE c.data BETWEEN DATE_FORMAT(:data_fim,'%Y-%m-01') AND :data_fim
                      AND (:familia_id IS NULL OR p.id_familia = :familia_id)
                      AND (:indicador_id IS NULL OR p.id_indicador = :indicador_id)
                      AND (:subindicador_id IS NULL OR p.id_subindicador = :subindicador_id)
                    GROUP BY p.id_familia, p.familia, p.id_indicador, p.indicador, p.id_subindicador, p.subindicador
                ),
                agg AS (
                    SELECT
                        id_familia,
                        familia,
                        id_indicador,
                        indicador,
                        id_subindicador,
                        subindicador,
                        SUM(realizado) AS realizado_total,
                        SUM(meta) AS meta_total
                    FROM base
                    GROUP BY id_familia, familia, id_indicador, indicador, id_subindicador, subindicador
                ),
                fam AS (
                    SELECT
                        'familia' AS nivel,
                        id_familia,
                        NULL AS id_indicador,
                        NULL AS id_subindicador,
                        familia AS label,
                        SUM(realizado_total) AS realizado_total,
                        SUM(meta_total) AS meta_total
                    FROM agg
                    GROUP BY id_familia, familia
                ),
                ind AS (
                    SELECT
                        'indicador' AS nivel,
                        id_familia,
                        id_indicador,
                        NULL AS id_subindicador,
                        indicador AS label,
                        SUM(realizado_total) AS realizado_total,
                        SUM(meta_total) AS meta_total
                    FROM agg
                    GROUP BY id_familia, id_indicador, indicador
                ),
                sub AS (
                    SELECT
                        'sub' AS nivel,
                        id_familia,
                        id_indicador,
                        id_subindicador,
                        subindicador AS label,
                        SUM(realizado_total) AS realizado_total,
                        SUM(meta_total) AS meta_total
                    FROM agg
                    WHERE subindicador IS NOT NULL
                    GROUP BY id_familia, id_indicador, id_subindicador, subindicador
                )
                SELECT * FROM fam
                UNION ALL
                SELECT * FROM ind
                UNION ALL
                SELECT * FROM sub
                ORDER BY
                    CASE nivel WHEN 'familia' THEN 1 WHEN 'indicador' THEN 2 ELSE 3 END,
                    label
            ";

            $rows = q($pdo, $sqlClassica, $params);
            ok($rows);


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