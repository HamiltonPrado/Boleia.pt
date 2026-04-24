<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('GET');

$payload = require_auth();
$db = db();
$uid = $payload['userId'];

$e = $db->prepare(
    "SELECT COALESCE(SUM(p.amount), 0) AS total_earnings,
            COALESCE(SUM(CASE WHEN p.completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN p.amount ELSE 0 END), 0) AS week_earnings
     FROM payments p
     INNER JOIN bookings b ON p.booking_id = b.id
     INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
     INNER JOIN routes r ON ro.route_id = r.id
     INNER JOIN driver_profiles dp ON r.driver_id = dp.id
     WHERE dp.user_id = ? AND p.status = 'COMPLETED'"
);
$e->execute([$uid]);
$earnings = $e->fetch();

$t = $db->prepare(
    "SELECT COUNT(*) AS total_trips FROM bookings b
     INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
     INNER JOIN routes r ON ro.route_id = r.id
     INNER JOIN driver_profiles dp ON r.driver_id = dp.id
     WHERE dp.user_id = ? AND b.status IN ('CONFIRMED','COMPLETED')"
);
$t->execute([$uid]);
$trips = $t->fetch();

$r = $db->prepare("SELECT avg_rating FROM driver_profiles WHERE user_id = ?");
$r->execute([$uid]);
$rating = $r->fetch();

$w = $db->prepare(
    "SELECT FLOOR(DATEDIFF(NOW(), p.completed_at) / 7) AS weeks_ago, COALESCE(SUM(p.amount), 0) AS amount
     FROM payments p
     INNER JOIN bookings b ON p.booking_id = b.id
     INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
     INNER JOIN routes r ON ro.route_id = r.id
     INNER JOIN driver_profiles dp ON r.driver_id = dp.id
     WHERE dp.user_id = ? AND p.status = 'COMPLETED'
       AND p.completed_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
     GROUP BY weeks_ago ORDER BY weeks_ago DESC"
);
$w->execute([$uid]);
$weekly = $w->fetchAll();
$weeklyMap = array_column($weekly, 'amount', 'weeks_ago');
$bars = array_map(fn($i) => (float)($weeklyMap[$i] ?? 0), [3, 2, 1, 0]);

json_out(['success' => true, 'stats' => [
    'week_earnings'  => number_format((float)$earnings['week_earnings'], 2, '.', ''),
    'total_earnings' => number_format((float)$earnings['total_earnings'], 2, '.', ''),
    'total_trips'    => (int)$trips['total_trips'],
    'avg_rating'     => $rating['avg_rating'] ?? null,
    'weekly_bars'    => $bars,
]]);
