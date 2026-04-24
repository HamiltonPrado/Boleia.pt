<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('DELETE');

$payload = require_auth();
$id      = $_GET['id'] ?? '';
if (!$id) json_out(['success' => false, 'message' => 'id em falta'], 400);

$refundPercent = transaction(function($db) use ($id, $payload) {
    $st = $db->prepare(
        "SELECT b.*, ro.date, r.depart_time
         FROM bookings b
         INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
         INNER JOIN routes r ON ro.route_id = r.id
         WHERE b.id = ? AND b.passenger_id = ? AND b.status IN ('PENDING','CONFIRMED')"
    );
    $st->execute([$id, $payload['userId']]);
    $booking = $st->fetch();
    if (!$booking) json_out(['success' => false, 'message' => 'Reserva não encontrada ou não pode ser cancelada'], 404);

    $departureAt   = new DateTime($booking['date'] . 'T' . $booking['depart_time']);
    $hoursUntil    = ($departureAt->getTimestamp() - time()) / 3600;
    $refundPercent = $hoursUntil > 3 ? 100 : 50;

    $db->prepare("UPDATE bookings SET status = 'CANCELLED_PASSENGER', cancelled_at = NOW() WHERE id = ?")
       ->execute([$id]);
    $db->prepare("UPDATE route_occurrences SET seats_taken = seats_taken - ? WHERE id = ?")
       ->execute([$booking['seats_booked'], $booking['occurrence_id']]);

    return $refundPercent;
});

json_out(['success' => true, 'message' => 'Reserva cancelada', 'refund_percent' => $refundPercent]);
