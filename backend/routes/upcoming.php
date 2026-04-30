<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('GET');

$limit = min((int)($_GET['limit'] ?? 6), 20);
$db    = db();

$st = $db->prepare(
    "SELECT ro.id AS occurrence_id, ro.date, ro.seats_taken,
            r.id AS route_id, r.total_seats, r.price_per_seat, r.depart_time,
            u.full_name AS driver_name, u.avatar_url,
            dp.avg_rating, dp.total_trips,
            (SELECT rs.address FROM route_stops rs WHERE rs.route_id = r.id ORDER BY rs.stop_order ASC  LIMIT 1) AS origem,
            (SELECT rs.address FROM route_stops rs WHERE rs.route_id = r.id ORDER BY rs.stop_order DESC LIMIT 1) AS destino
     FROM route_occurrences ro
     INNER JOIN routes r ON ro.route_id = r.id
     INNER JOIN driver_profiles dp ON r.driver_id = dp.id
     INNER JOIN users u ON dp.user_id = u.id
     WHERE ro.date >= CURDATE()
       AND ro.status = 'SCHEDULED'
       AND r.status = 'ACTIVE'
       AND (r.total_seats - ro.seats_taken) > 0
     ORDER BY ro.date ASC, r.depart_time ASC
     LIMIT ?"
);
$st->execute([$limit]);
json_out(['success' => true, 'routes' => $st->fetchAll()]);
