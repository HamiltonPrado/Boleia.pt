<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('POST');

$payload = require_auth();
$id      = $_GET['id'] ?? '';
$b       = body();
$status  = $b['status'] ?? '';

if (!$id) json_out(['success' => false, 'message' => 'id em falta'], 400);
if (!in_array($status, ['COMPLETED', 'NO_SHOW']))
    json_out(['success' => false, 'message' => 'Status inválido'], 400);

$db = db();
$st = $db->prepare(
    "SELECT b.*, r.depart_time
     FROM bookings b
     INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
     INNER JOIN routes r ON ro.route_id = r.id
     INNER JOIN driver_profiles dp ON r.driver_id = dp.id
     WHERE b.id = ? AND dp.user_id = ? AND b.status = 'CONFIRMED'"
);
$st->execute([$id, $payload['userId']]);
$booking = $st->fetch();
if (!$booking) json_out(['success' => false, 'message' => 'Reserva não encontrada ou já concluída'], 404);

$db->prepare("UPDATE bookings SET status = ? WHERE id = ?")->execute([$status, $id]);

if ($status === 'COMPLETED') {
    $db->prepare("UPDATE driver_profiles SET total_trips = total_trips + 1 WHERE user_id = ?")
       ->execute([$payload['userId']]);

    $exists = $db->prepare("SELECT id FROM payments WHERE booking_id = ?");
    $exists->execute([$id]);
    if ($exists->fetch()) {
        $db->prepare("UPDATE payments SET status = 'COMPLETED', completed_at = NOW() WHERE booking_id = ?")
           ->execute([$id]);
    } else {
        $payId = uuid();
        $db->prepare(
            "INSERT INTO payments (id, booking_id, amount, status, created_at, completed_at)
             VALUES (?, ?, ?, 'COMPLETED', NOW(), NOW())"
        )->execute([$payId, $id, $booking['total_amount']]);
    }
}

json_out(['success' => true, 'message' => 'Estado atualizado']);
