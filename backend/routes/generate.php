<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('POST');

$payload = require_auth();
$id = $_GET['id'] ?? '';
if (!$id) json_out(['success' => false, 'message' => 'id em falta'], 400);

$db = db();
$st = $db->prepare(
    "SELECT r.* FROM routes r INNER JOIN driver_profiles dp ON r.driver_id = dp.id
     WHERE r.id = ? AND dp.user_id = ?"
);
$st->execute([$id, $payload['userId']]);
$route = $st->fetch();
if (!$route) json_out(['success' => false, 'message' => 'Rota não encontrada ou sem permissão'], 404);

$recurrence = is_string($route['recurrence'])
    ? json_decode($route['recurrence'], true)
    : $route['recurrence'];

$daysOfWeek = $recurrence['days_of_week'] ?? [];
$validFrom  = $route['valid_from']  ? new DateTime($route['valid_from'])  : null;
$validUntil = $route['valid_until'] ? new DateTime($route['valid_until']) : null;
$created = 0;

for ($i = 0; $i <= 30; $i++) {
    $date   = new DateTime("+$i days");
    $dayNum = (int)$date->format('w');
    if (!in_array($dayNum, $daysOfWeek)) continue;
    if ($validFrom  && $date < $validFrom)  continue;
    if ($validUntil && $date > $validUntil) break;

    $dateStr = $date->format('Y-m-d');
    $ex = $db->prepare('SELECT id FROM route_occurrences WHERE route_id = ? AND date = ?');
    $ex->execute([$id, $dateStr]);
    if ($ex->fetch()) continue;

    $db->prepare(
        "INSERT INTO route_occurrences (id, route_id, date, status, seats_taken) VALUES (?, ?, ?, 'SCHEDULED', 0)"
    )->execute([uuid(), $id, $dateStr]);
    $created++;
}

json_out(['success' => true, 'message' => "$created ocorrências criadas"]);
