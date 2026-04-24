<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('GET', 'PATCH', 'DELETE');

$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id'] ?? '';
if (!$id) json_out(['success' => false, 'message' => 'id em falta'], 400);

$db = db();

if ($method === 'GET') {
    require_auth();
    $st = $db->prepare(
        "SELECT r.*, u.full_name AS driver_name, u.avatar_url,
                dp.tier, dp.avg_rating, dp.total_trips,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                    'id', rs.id, 'stop_order', rs.stop_order, 'label', rs.label,
                    'address', rs.address, 'lat', rs.lat, 'lng', rs.lng, 'is_optional', rs.is_optional
                )) FROM (SELECT * FROM route_stops WHERE route_id = r.id ORDER BY stop_order ASC) rs) AS stops
         FROM routes r
         INNER JOIN driver_profiles dp ON r.driver_id = dp.id
         INNER JOIN users u ON dp.user_id = u.id
         WHERE r.id = ?"
    );
    $st->execute([$id]);
    $route = $st->fetch();
    if (!$route) json_out(['success' => false, 'message' => 'Rota não encontrada'], 404);
    json_out(['success' => true, 'route' => $route]);
}

if ($method === 'PATCH') {
    $payload = require_auth();
    $b      = body();
    $status = $b['status'] ?? '';
    if (!in_array($status, ['ACTIVE', 'PAUSED', 'ARCHIVED']))
        json_out(['success' => false, 'message' => 'Status inválido'], 400);

    $st = $db->prepare(
        "UPDATE routes r INNER JOIN driver_profiles dp ON r.driver_id = dp.id
         SET r.status = ? WHERE r.id = ? AND dp.user_id = ?"
    );
    $st->execute([$status, $id, $payload['userId']]);
    if ($st->rowCount() === 0) json_out(['success' => false, 'message' => 'Rota não encontrada ou sem permissão'], 404);
    json_out(['success' => true, 'message' => 'Estado da rota atualizado']);
}

$payload = require_auth();
$st = $db->prepare(
    "SELECT r.id FROM routes r INNER JOIN driver_profiles dp ON r.driver_id = dp.id
     WHERE r.id = ? AND dp.user_id = ?"
);
$st->execute([$id, $payload['userId']]);
if (!$st->fetch()) json_out(['success' => false, 'message' => 'Rota não encontrada ou sem permissão'], 404);

transaction(function($db) use ($id) {
    $db->prepare("DELETE FROM reviews WHERE booking_id IN (SELECT id FROM bookings WHERE occurrence_id IN (SELECT id FROM route_occurrences WHERE route_id = ?))")->execute([$id]);
    $db->prepare("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE occurrence_id IN (SELECT id FROM route_occurrences WHERE route_id = ?))")->execute([$id]);
    $db->prepare("DELETE FROM bookings WHERE occurrence_id IN (SELECT id FROM route_occurrences WHERE route_id = ?)")->execute([$id]);
    $db->prepare("DELETE FROM route_occurrences WHERE route_id = ?")->execute([$id]);
    $db->prepare("DELETE FROM route_stops WHERE route_id = ?")->execute([$id]);
    $db->prepare("DELETE FROM routes WHERE id = ?")->execute([$id]);
});

json_out(['success' => true, 'message' => 'Rota apagada com sucesso']);
