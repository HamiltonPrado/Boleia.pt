<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('GET');

$payload = require_auth();
$db = db();
try {
$st = $db->prepare(
    "SELECT b.id, b.status, ro.date, r.depart_time,
            u.full_name AS driver_name, u.avatar_url, dp.avg_rating, dp.tier,
            ps.address AS pickup_address, ds.address AS dropoff_address,
            rev.id AS review_id, rev.rating AS my_rating
     FROM bookings b
     INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
     INNER JOIN routes r ON ro.route_id = r.id
     INNER JOIN driver_profiles dp ON r.driver_id = dp.id
     INNER JOIN users u ON dp.user_id = u.id
     INNER JOIN route_stops ps ON b.pickup_stop_id = ps.id
     INNER JOIN route_stops ds ON b.dropoff_stop_id = ds.id
     LEFT JOIN reviews rev ON rev.booking_id = b.id AND rev.reviewer_id = b.passenger_id
     WHERE b.passenger_id = ? AND b.status = 'COMPLETED'
     ORDER BY ro.date DESC"
);
$st->execute([$payload['userId']]);
json_out(['success' => true, 'bookings' => $st->fetchAll()]);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage(), 'bookings' => []], 500);
}
