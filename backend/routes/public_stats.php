<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('GET');

$db  = db();
$row = $db->query(
    "SELECT
        (SELECT COUNT(*) FROM bookings WHERE status = 'COMPLETED') AS total_trips,
        (SELECT COUNT(*) FROM routes   WHERE status = 'ACTIVE')    AS active_routes,
        (SELECT COUNT(*) FROM users    WHERE role  != 'ADMIN')     AS total_users"
)->fetch();

json_out(['total_trips' => (int)$row['total_trips'], 'active_routes' => (int)$row['active_routes'], 'total_users' => (int)$row['total_users']]);
