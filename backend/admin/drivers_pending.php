<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('GET');
require_admin();

$rows = db()->query(
    "SELECT dp.id, dp.tier, dp.verification_status, dp.created_at,
            u.id AS user_id, u.email, u.full_name, u.phone,
            dp.car_make, dp.car_model, dp.car_year, dp.car_plate
     FROM driver_profiles dp INNER JOIN users u ON dp.user_id = u.id
     WHERE dp.verification_status = 'PENDING' ORDER BY dp.created_at ASC"
)->fetchAll();

json_out(['success' => true, 'drivers' => $rows]);
