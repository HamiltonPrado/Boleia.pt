<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('GET', 'POST');

$method  = $_SERVER['REQUEST_METHOD'];
$payload = require_auth();
$db      = db();

if ($method === 'GET') {
    try {
        $st = $db->prepare(
            "SELECT r.*,
                    (SELECT MIN(ro.date) FROM route_occurrences ro
                     WHERE ro.route_id = r.id AND ro.date >= CURDATE() AND ro.status = 'SCHEDULED') AS next_occurrence
             FROM routes r
             INNER JOIN driver_profiles dp ON r.driver_id = dp.id
             WHERE dp.user_id = ?
             ORDER BY r.created_at DESC"
        );
        $st->execute([$payload['userId']]);
        $routes = $st->fetchAll();

        if (!empty($routes)) {
            $ids = array_column($routes, 'id');
            $ph  = implode(',', array_fill(0, count($ids), '?'));
            $ss  = $db->prepare(
                "SELECT id, route_id, stop_order, label, address, lat, lng, is_optional
                 FROM route_stops WHERE route_id IN ($ph) ORDER BY route_id, stop_order ASC"
            );
            $ss->execute($ids);
            $stopsByRoute = [];
            foreach ($ss->fetchAll() as $s) {
                $stopsByRoute[$s['route_id']][] = $s;
            }
            foreach ($routes as &$r) {
                $r['stops'] = json_encode($stopsByRoute[$r['id']] ?? []);
            }
            unset($r);
        }

        json_out(['success' => true, 'routes' => $routes]);
    } catch (Exception $e) {
        json_out(['success' => false, 'message' => 'Erro ao carregar rotas: ' . $e->getMessage()], 500);
    }
}

$b = body();
$total_seats    = $b['total_seats'] ?? null;
$price_per_seat = $b['price_per_seat'] ?? null;
$depart_time    = $b['depart_time'] ?? null;
$recurrence     = $b['recurrence'] ?? null;
$valid_from     = $b['valid_from'] ?? null;
$valid_until    = $b['valid_until'] ?? null;
$notes          = $b['notes'] ?? null;
$stops          = $b['stops'] ?? [];

if (!$total_seats || !$price_per_seat || !$depart_time || !$recurrence || !$valid_from || count($stops) < 2)
    json_out(['success' => false, 'message' => 'Campos obrigatórios em falta. São necessários pelo menos 2 paragens.'], 400);

$dpSt = $db->prepare('SELECT id FROM driver_profiles WHERE user_id = ?');
$dpSt->execute([$payload['userId']]);
$dp = $dpSt->fetch();
if (!$dp) json_out(['success' => false, 'message' => 'Apenas motoristas podem criar rotas'], 403);

$routeId = transaction(function($db) use ($dp, $total_seats, $price_per_seat, $depart_time, $recurrence, $valid_from, $valid_until, $notes, $stops) {
    $routeId = uuid();
    $db->prepare(
        "INSERT INTO routes (id, driver_id, total_seats, price_per_seat, depart_time, recurrence, valid_from, valid_until, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')"
    )->execute([$routeId, $dp['id'], $total_seats, $price_per_seat, $depart_time, json_encode($recurrence), $valid_from, $valid_until ?: null, $notes ?: null]);

    foreach ($stops as $stop) {
        $db->prepare(
            "INSERT INTO route_stops (id, route_id, stop_order, label, address, lat, lng, is_optional)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )->execute([uuid(), $routeId, $stop['stop_order'], $stop['label'] ?? null, $stop['address'], $stop['lat'], $stop['lng'], empty($stop['is_optional']) ? 0 : 1]);
    }

    return $routeId;
});

$daysOfWeek = $recurrence['days_of_week'] ?? [];
$validFrom  = $valid_from  ? new DateTime($valid_from)  : null;
$validUntil = $valid_until ? new DateTime($valid_until) : null;

for ($i = 0; $i <= 30; $i++) {
    $date   = new DateTime("+$i days");
    $dayNum = (int)$date->format('w');
    if (!in_array($dayNum, $daysOfWeek)) continue;
    if ($validFrom  && $date < $validFrom)  continue;
    if ($validUntil && $date > $validUntil) break;

    $db->prepare(
        "INSERT IGNORE INTO route_occurrences (id, route_id, date, status, seats_taken) VALUES (?, ?, ?, 'SCHEDULED', 0)"
    )->execute([uuid(), $routeId, $date->format('Y-m-d')]);
}

json_out(['success' => true, 'message' => 'Rota criada com sucesso', 'routeId' => $routeId], 201);
