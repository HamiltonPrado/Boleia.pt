<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('DELETE');

$payload = require_auth();
$id      = $_GET['id'] ?? '';
if (!$id) json_out(['success' => false, 'message' => 'id em falta'], 400);

transaction(function($db) use ($id, $payload) {
    $st = $db->prepare(
        "SELECT b.* FROM bookings b
         INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
         INNER JOIN routes r ON ro.route_id = r.id
         INNER JOIN driver_profiles dp ON r.driver_id = dp.id
         WHERE b.id = ? AND dp.user_id = ? AND b.status = 'CONFIRMED'"
    );
    $st->execute([$id, $payload['userId']]);
    $booking = $st->fetch();
    if (!$booking) json_out(['success' => false, 'message' => 'Reserva não encontrada ou não pode ser cancelada'], 404);

    $db->prepare("UPDATE bookings SET status = 'CANCELLED_DRIVER', cancelled_at = NOW() WHERE id = ?")->execute([$id]);
    $db->prepare("UPDATE route_occurrences SET seats_taken = seats_taken - ? WHERE id = ?")
       ->execute([$booking['seats_booked'], $booking['occurrence_id']]);
});

json_out(['success' => true, 'message' => 'Reserva cancelada']);
