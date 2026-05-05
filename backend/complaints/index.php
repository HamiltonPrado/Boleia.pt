<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('GET');
require_admin();

$db     = db();
$status = $_GET['status'] ?? null;

$allowed = ['PENDING', 'REVIEWED', 'CLOSED'];
$where   = ($status && in_array($status, $allowed)) ? "WHERE c.status = '$status'" : "";

try {
    $st = $db->query(
        "SELECT c.id, c.type, c.description, c.status, c.created_at,
                ur.full_name AS reporter_name, ur.email AS reporter_email,
                ud.full_name AS reported_name, ud.email AS reported_email,
                c.booking_id
         FROM complaints c
         INNER JOIN users ur ON c.reporter_id      = ur.id
         INNER JOIN users ud ON c.reported_user_id = ud.id
         $where
         ORDER BY c.created_at DESC"
    );
    json_out(['success' => true, 'complaints' => $st->fetchAll()]);
} catch (\Throwable $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}
