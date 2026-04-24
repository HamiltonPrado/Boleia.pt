<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('GET');
require_admin();

$db = db();
$q  = fn($sql) => $db->query($sql)->fetchColumn();

json_out(['success' => true, 'stats' => [
    'total_users'          => (int)$q('SELECT COUNT(*) FROM users WHERE role != "ADMIN"'),
    'total_drivers'        => (int)$q('SELECT COUNT(*) FROM driver_profiles'),
    'verified_drivers'     => (int)$q('SELECT COUNT(*) FROM driver_profiles WHERE tier = "VERIFIED"'),
    'pending_verification' => (int)$q('SELECT COUNT(*) FROM driver_profiles WHERE verification_status = "PENDING"'),
    'total_bookings'       => (int)$q('SELECT COUNT(*) FROM bookings'),
    'completed_bookings'   => (int)$q('SELECT COUNT(*) FROM bookings WHERE status = "COMPLETED"'),
]]);
