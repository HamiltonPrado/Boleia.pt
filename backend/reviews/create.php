<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('POST');

$payload    = require_auth();
$b          = body();
$booking_id = $b['booking_id'] ?? '';
$rating     = (int)($b['rating'] ?? 0);
$comment    = $b['comment'] ?? null;
$tags       = $b['tags'] ?? null;

if (!$booking_id || $rating < 1 || $rating > 5)
    json_out(['success' => false, 'message' => 'booking_id e rating (1-5) obrigatórios'], 400);

$db = db();
$st = $db->prepare(
    "SELECT b.*, dp.user_id AS driver_user_id FROM bookings b
     INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
     INNER JOIN routes r ON ro.route_id = r.id
     INNER JOIN driver_profiles dp ON r.driver_id = dp.id
     WHERE b.id = ? AND b.passenger_id = ? AND b.status = 'COMPLETED'"
);
$st->execute([$booking_id, $payload['userId']]);
$booking = $st->fetch();
if (!$booking) json_out(['success' => false, 'message' => 'Reserva não encontrada ou não pode ser avaliada'], 404);

$ex = $db->prepare("SELECT id FROM reviews WHERE booking_id = ? AND reviewer_id = ?");
$ex->execute([$booking_id, $payload['userId']]);
if ($ex->fetch()) json_out(['success' => false, 'message' => 'Já avaliaste esta reserva'], 409);

$reviewId = uuid();
$db->prepare(
    "INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, direction, rating, comment, tags)
     VALUES (?, ?, ?, ?, 'PASSENGER_TO_DRIVER', ?, ?, ?)"
)->execute([$reviewId, $booking_id, $payload['userId'], $booking['driver_user_id'], $rating, $comment, $tags ? json_encode($tags) : null]);

$db->prepare(
    "UPDATE driver_profiles SET avg_rating = (
        SELECT ROUND(AVG(rating), 2) FROM reviews
        WHERE reviewee_id = ? AND direction = 'PASSENGER_TO_DRIVER'
     ) WHERE user_id = ?"
)->execute([$booking['driver_user_id'], $booking['driver_user_id']]);

json_out(['success' => true, 'message' => 'Avaliação submetida com sucesso', 'reviewId' => $reviewId], 201);
