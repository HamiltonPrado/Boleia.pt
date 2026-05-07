<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('GET');
require_admin();

$db = db();
$MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

$rowsMeses = $db->query(
    "SELECT MONTH(ro.date) AS mes, YEAR(ro.date) AS ano, COUNT(b.id) AS total
     FROM bookings b
     INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
     WHERE b.status IN ('CONFIRMED','COMPLETED')
       AND ro.date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY YEAR(ro.date), MONTH(ro.date)
     ORDER BY ano, mes"
)->fetchAll();

$mesesLabels = [];
$mesesData   = [];
foreach ($rowsMeses as $r) {
    $mesesLabels[] = $MESES_PT[(int)$r['mes'] - 1];
    $mesesData[]   = (int)$r['total'];
}

$rowEstados = $db->query(
    "SELECT
       SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END)                                 AS confirmadas,
       SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END)                                 AS concluidas,
       SUM(CASE WHEN status IN ('CANCELLED_PASSENGER','CANCELLED_DRIVER') THEN 1 ELSE 0 END) AS canceladas,
       SUM(CASE WHEN status = 'PENDING'   THEN 1 ELSE 0 END)                                 AS pendentes
     FROM bookings"
)->fetch();

$rowsSemana = $db->query(
    "SELECT DAYOFWEEK(ro.date) AS dow, COUNT(b.id) AS total
     FROM bookings b
     INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
     WHERE b.status IN ('CONFIRMED','COMPLETED')
     GROUP BY DAYOFWEEK(ro.date)"
)->fetchAll();

$dowMap = [];
foreach ($rowsSemana as $r) { $dowMap[(int)$r['dow']] = (int)$r['total']; }
$semanaOrder  = [2, 3, 4, 5, 6, 7, 1];
$semanaLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
$semanaData   = array_map(fn($d) => $dowMap[$d] ?? 0, $semanaOrder);

$rowsRotas = $db->query(
    "SELECT s1.label AS origem, s2.label AS destino, COUNT(DISTINCT b.id) AS viagens
     FROM bookings b
     INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
     INNER JOIN routes r ON ro.route_id = r.id
     INNER JOIN (SELECT route_id, MIN(stop_order) AS min_o FROM route_stops GROUP BY route_id) t1
       ON t1.route_id = r.id
     INNER JOIN route_stops s1 ON s1.route_id = r.id AND s1.stop_order = t1.min_o
     INNER JOIN (SELECT route_id, MAX(stop_order) AS max_o FROM route_stops GROUP BY route_id) t2
       ON t2.route_id = r.id
     INNER JOIN route_stops s2 ON s2.route_id = r.id AND s2.stop_order = t2.max_o
     WHERE b.status IN ('CONFIRMED','COMPLETED')
     GROUP BY r.id, s1.label, s2.label
     ORDER BY viagens DESC
     LIMIT 5"
)->fetchAll();

$rotasLabels = [];
$rotasData   = [];
foreach ($rowsRotas as $r) {
    $rotasLabels[] = trim(explode(',', $r['origem'])[0]) . ' → ' . trim(explode(',', $r['destino'])[0]);
    $rotasData[]   = (int)$r['viagens'];
}

$metricas = $db->query(
    "SELECT
       ROUND(AVG(price_per_seat),  2)  AS preco_medio,
       ROUND(STDDEV(price_per_seat), 2) AS desvio_padrao,
       ROUND(SUM(CASE WHEN status IN ('CONFIRMED','COMPLETED') THEN 1 ELSE 0 END)
             / NULLIF(COUNT(*), 0) * 100) AS taxa_confirmacao,
       ROUND(SUM(CASE WHEN status IN ('CANCELLED_PASSENGER','CANCELLED_DRIVER') THEN 1 ELSE 0 END)
             / NULLIF(COUNT(*), 0) * 100) AS taxa_cancelamento
     FROM bookings"
)->fetch();

$metricasExtra = $db->query(
    "SELECT
       ROUND(AVG(avg_rating), 1)                             AS avaliacao_media,
       (SELECT COUNT(*) FROM routes WHERE status = 'ACTIVE') AS total_rotas
     FROM driver_profiles WHERE avg_rating IS NOT NULL"
)->fetch();

json_out([
    'success'   => true,
    'meses'     => ['labels' => $mesesLabels, 'data' => $mesesData],
    'estados'   => [
        'confirmadas' => (int)($rowEstados['confirmadas'] ?? 0),
        'concluidas'  => (int)($rowEstados['concluidas']  ?? 0),
        'canceladas'  => (int)($rowEstados['canceladas']  ?? 0),
        'pendentes'   => (int)($rowEstados['pendentes']   ?? 0),
    ],
    'semana'    => ['labels' => $semanaLabels, 'data' => $semanaData],
    'top_rotas' => ['labels' => $rotasLabels,  'data' => $rotasData],
    'metricas'  => [
        'preco_medio'       => (float)($metricas['preco_medio']          ?? 0),
        'desvio_padrao'     => (float)($metricas['desvio_padrao']        ?? 0),
        'taxa_confirmacao'  => (int)  ($metricas['taxa_confirmacao']     ?? 0),
        'taxa_cancelamento' => (int)  ($metricas['taxa_cancelamento']    ?? 0),
        'avaliacao_media'   => (float)($metricasExtra['avaliacao_media'] ?? 0),
        'total_rotas'       => (int)  ($metricasExtra['total_rotas']     ?? 0),
    ],
]);
