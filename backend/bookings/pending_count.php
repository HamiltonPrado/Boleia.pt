<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('GET');

$payload = require_auth();
$uid     = $payload['userId'];
$role    = $payload['role'];
$db      = db();

if ($role === 'DRIVER' || $role === 'BOTH') {
    $st = $db->prepare(
        "SELECT COUNT(*) FROM bookings b
         INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
         INNER JOIN routes r ON ro.route_id = r.id
         INNER JOIN driver_profiles dp ON r.driver_id = dp.id
         WHERE dp.user_id = ? AND b.status = 'PENDING'"
    );
} else {
    $st = $db->prepare(
        "SELECT COUNT(*) FROM bookings b
         INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
         WHERE b.passenger_id = ? AND b.status = 'PENDING'
           AND ro.date >= CURDATE()"
    );
}

$st->execute([$uid]);
json_out(['count' => (int)$st->fetchColumn()]);
