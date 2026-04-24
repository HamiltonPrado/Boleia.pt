<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('GET');
require_admin();

$rows = db()->query(
    "SELECT DATE(ro.date) AS day, COUNT(b.id) AS trips
     FROM bookings b
     INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
     WHERE b.status IN ('CONFIRMED','COMPLETED')
       AND ro.date >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
     GROUP BY DATE(ro.date) ORDER BY day ASC"
)->fetchAll();

json_out(['success' => true, 'rows' => $rows]);
