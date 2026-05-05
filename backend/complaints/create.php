<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('POST');
$payload = require_auth();

$b    = body();
$type = $b['type']        ?? null;
$desc = trim($b['description'] ?? '');
$bookingId = $b['booking_id'] ?? null;

if (!$type || !$desc || !$bookingId)
    json_out(['success' => false, 'message' => 'Campos obrigatórios em falta.'], 400);

$allowed = ['NO_SHOW', 'BEHAVIOR', 'PAYMENT', 'OTHER'];
if (!in_array($type, $allowed))
    json_out(['success' => false, 'message' => 'Tipo de reclamação inválido.'], 400);

$db = db();

$bkSt = $db->prepare(
    "SELECT b.id, b.passenger_id, b.status,
            r.driver_id AS dp_id,
            u.id AS driver_user_id
     FROM bookings b
     INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
     INNER JOIN routes r ON ro.route_id = r.id
     INNER JOIN driver_profiles dp ON r.driver_id = dp.id
     INNER JOIN users u ON dp.user_id = u.id
     WHERE b.id = ?"
);
$bkSt->execute([$bookingId]);
$booking = $bkSt->fetch();

if (!$booking)
    json_out(['success' => false, 'message' => 'Reserva não encontrada.'], 404);

if ($booking['passenger_id'] !== $payload['userId'])
    json_out(['success' => false, 'message' => 'Sem permissão para reclamar desta reserva.'], 403);

$pastStatuses = ['COMPLETED', 'CANCELLED_DRIVER', 'NO_SHOW'];
if (!in_array($booking['status'], $pastStatuses))
    json_out(['success' => false, 'message' => 'Só é possível reclamar após a viagem.'], 400);

$existSt = $db->prepare("SELECT id FROM complaints WHERE booking_id = ? AND reporter_id = ?");
$existSt->execute([$bookingId, $payload['userId']]);
if ($existSt->fetch())
    json_out(['success' => false, 'message' => 'Já submeteste uma reclamação para esta reserva.'], 409);

$db->prepare(
    "INSERT INTO complaints (id, reporter_id, reported_user_id, booking_id, type, description, status)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING')"
)->execute([uuid(), $payload['userId'], $booking['driver_user_id'], $bookingId, $type, $desc]);

json_out(['success' => true, 'message' => 'Reclamação submetida. Iremos analisar em breve.']);
