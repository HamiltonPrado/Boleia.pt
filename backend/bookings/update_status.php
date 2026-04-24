<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('PATCH');

$payload = require_auth();
$id      = $_GET['id'] ?? '';
$b       = body();
$status  = $b['status'] ?? '';

if (!$id) json_out(['success' => false, 'message' => 'id em falta'], 400);
if (!in_array($status, ['CONFIRMED', 'CANCELLED_DRIVER']))
    json_out(['success' => false, 'message' => 'Status inválido'], 400);

transaction(function($db) use ($id, $payload, $status) {
    $st = $db->prepare(
        "SELECT b.*, r.depart_time
         FROM bookings b
         INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
         INNER JOIN routes r ON ro.route_id = r.id
         INNER JOIN driver_profiles dp ON r.driver_id = dp.id
         WHERE b.id = ? AND dp.user_id = ? AND b.status = 'PENDING'"
    );
    $st->execute([$id, $payload['userId']]);
    $booking = $st->fetch();
    if (!$booking) json_out(['success' => false, 'message' => 'Reserva não encontrada'], 404);

    $db->prepare("UPDATE bookings SET status = ? WHERE id = ?")->execute([$status, $id]);

    if ($status === 'CANCELLED_DRIVER') {
        $db->prepare("UPDATE route_occurrences SET seats_taken = seats_taken - ? WHERE id = ?")
           ->execute([$booking['seats_booked'], $booking['occurrence_id']]);
    }
});

json_out(['success' => true, 'message' => 'Estado da reserva atualizado']);
