<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('GET');
require_admin();

$page   = max(1, (int)($_GET['page']  ?? 1));
$limit  = min(100, max(1, (int)($_GET['limit'] ?? 20)));
$search = trim($_GET['search'] ?? '');
$offset = ($page - 1) * $limit;

try {
    $db = db();

    if ($search) {
        $like  = "%$search%";
        $total = $db->prepare("SELECT COUNT(*) FROM users WHERE role != 'ADMIN' AND (full_name LIKE ? OR email LIKE ?)");
        $total->execute([$like, $like]);
        $st    = $db->prepare(
            "SELECT u.id, u.email, u.full_name, u.phone, u.role, u.status, u.created_at,
                    dp.tier, dp.verification_status, dp.avg_rating, dp.total_trips
             FROM users u LEFT JOIN driver_profiles dp ON u.id = dp.user_id
             WHERE u.role != 'ADMIN' AND (u.full_name LIKE ? OR u.email LIKE ?)
             ORDER BY u.created_at DESC LIMIT $limit OFFSET $offset"
        );
        $st->execute([$like, $like]);
    } else {
        $total = $db->query("SELECT COUNT(*) FROM users WHERE role != 'ADMIN'");
        $st    = $db->prepare(
            "SELECT u.id, u.email, u.full_name, u.phone, u.role, u.status, u.created_at,
                    dp.tier, dp.verification_status, dp.avg_rating, dp.total_trips
             FROM users u LEFT JOIN driver_profiles dp ON u.id = dp.user_id
             WHERE u.role != 'ADMIN' ORDER BY u.created_at DESC LIMIT $limit OFFSET $offset"
        );
        $st->execute();
    }

    $totalCount = (int)$total->fetchColumn();
    json_out(['success' => true, 'users' => $st->fetchAll(),
        'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $totalCount, 'pages' => (int)ceil($totalCount / $limit)]]);

} catch (Exception $e) {
    json_out(['success' => false, 'error' => $e->getMessage()], 500);
}
