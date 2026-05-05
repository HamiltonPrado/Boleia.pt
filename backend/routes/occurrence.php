<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('GET');
$payload = require_auth();

$id = $_GET['id'] ?? '';
if (!$id) json_out(['success' => false, 'message' => 'id em falta'], 400);

$db = db();

$st = $db->prepare(
    "SELECT ro.id AS occurrence_id, ro.date, ro.seats_taken,
            r.id AS route_id, r.total_seats, r.price_per_seat, r.depart_time, r.notes,
            u.id AS driver_id, u.full_name AS driver_name, u.avatar_url,
            dp.avg_rating, dp.total_trips, dp.car_make, dp.car_model, dp.car_year
     FROM route_occurrences ro
     INNER JOIN routes r ON ro.route_id = r.id
     INNER JOIN driver_profiles dp ON r.driver_id = dp.id
     INNER JOIN users u ON dp.user_id = u.id
     WHERE ro.id = ?"
);
$st->execute([$id]);
$row = $st->fetch();

if (!$row) json_out(['success' => false, 'message' => 'Viagem não encontrada'], 404);

$ss = $db->prepare(
    "SELECT id, stop_order, label, address, lat, lng
     FROM route_stops WHERE route_id = ? ORDER BY stop_order ASC"
);
$ss->execute([$row['route_id']]);
$row['stops'] = json_encode($ss->fetchAll());

$bk = $db->prepare(
    "SELECT id, status FROM bookings
     WHERE occurrence_id = ? AND passenger_id = ?
       AND status NOT IN ('CANCELLED_PASSENGER','CANCELLED_DRIVER')
     LIMIT 1"
);
$bk->execute([$id, $payload['userId']]);
$row['user_booking'] = $bk->fetch() ?: null;

json_out(['success' => true, 'viagem' => $row]);
