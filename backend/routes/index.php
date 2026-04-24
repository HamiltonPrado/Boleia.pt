<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('GET', 'POST');

$method  = $_SERVER['REQUEST_METHOD'];
$payload = require_auth();
$db      = db();

if ($method === 'GET') {
    $st = $db->prepare(
        "SELECT r.*,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                    'id', rs.id, 'stop_order', rs.stop_order, 'label', rs.label,
                    'address', rs.address, 'lat', rs.lat, 'lng', rs.lng, 'is_optional', rs.is_optional
                ) ORDER BY rs.stop_order ASC) FROM route_stops rs WHERE rs.route_id = r.id) AS stops,
                (SELECT MIN(ro.date) FROM route_occurrences ro
                 WHERE ro.route_id = r.id AND ro.date >= CURDATE() AND ro.status = 'SCHEDULED') AS next_occurrence
         FROM routes r
         INNER JOIN driver_profiles dp ON r.driver_id = dp.id
         WHERE dp.user_id = ?
         ORDER BY r.created_at DESC"
    );
    $st->execute([$payload['userId']]);
    json_out(['success' => true, 'routes' => $st->fetchAll()]);
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

json_out(['success' => true, 'message' => 'Rota criada com sucesso', 'routeId' => $routeId], 201);
