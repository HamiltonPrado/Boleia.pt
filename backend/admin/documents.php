<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('GET');
require_admin();

$rows = db()->query(
    "SELECT dd.id, dd.type, dd.file_url, dd.status, dd.uploaded_at, dd.rejection_note,
            u.id AS user_id, u.full_name, u.email, u.avatar_url,
            dp.id AS driver_profile_id, dp.tier, dp.verification_status
     FROM driver_documents dd
     INNER JOIN driver_profiles dp ON dd.driver_id = dp.id
     INNER JOIN users u ON dp.user_id = u.id
     WHERE dd.status = 'PENDING'
     ORDER BY dd.uploaded_at DESC"
)->fetchAll();

json_out(['success' => true, 'documents' => $rows]);
