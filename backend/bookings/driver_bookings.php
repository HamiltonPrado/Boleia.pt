<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('GET');

$payload = require_auth();
$status  = strtoupper($_GET['status'] ?? '');

if (!in_array($status, ['PENDING', 'CONFIRMED', 'COMPLETED']))
    json_out(['success' => false, 'message' => 'status inválido. Use PENDING, CONFIRMED ou COMPLETED'], 400);

$db    = db();
$order = $status === 'COMPLETED' ? 'DESC' : 'ASC';

$st = $db->prepare(
    "SELECT b.id, b.status, b.seats_booked, b.total_amount, b.note_to_driver,
            ro.date, r.depart_time, r.id AS route_id,
            u.id AS passenger_id, u.full_name AS passenger_name, u.avatar_url, u.phone,
            ps.address AS pickup_address, ds.address AS dropoff_address,
            rev.rating AS passenger_rating
     FROM bookings b
     INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
     INNER JOIN routes r ON ro.route_id = r.id
     INNER JOIN driver_profiles dp ON r.driver_id = dp.id
     INNER JOIN users u ON b.passenger_id = u.id
     INNER JOIN route_stops ps ON b.pickup_stop_id = ps.id
     INNER JOIN route_stops ds ON b.dropoff_stop_id = ds.id
     LEFT JOIN reviews rev ON rev.booking_id = b.id AND rev.direction = 'PASSENGER_TO_DRIVER'
     WHERE dp.user_id = ? AND b.status = ?
     ORDER BY ro.date $order, r.depart_time $order"
);
$st->execute([$payload['userId'], $status]);
json_out(['success' => true, 'bookings' => $st->fetchAll()]);
