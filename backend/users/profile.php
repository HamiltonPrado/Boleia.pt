<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('GET', 'PATCH');

$method = $_SERVER['REQUEST_METHOD'];
$db     = db();

if ($method === 'GET') {
    $id = $_GET['id'] ?? '';
    if (!$id) json_out(['success' => false, 'message' => 'id em falta'], 400);

    $st = $db->prepare(
        "SELECT u.full_name, u.avatar_url, dp.tier, dp.avg_rating, dp.total_trips, dp.car_make, dp.car_model, dp.car_year
         FROM users u INNER JOIN driver_profiles dp ON dp.user_id = u.id WHERE u.id = ?"
    );
    $st->execute([$id]);
    $profile = $st->fetch();
    if (!$profile) json_out(['success' => false, 'message' => 'Motorista não encontrado'], 404);

    $reviews = $db->prepare(
        "SELECT r.rating, r.comment, r.created_at, u.full_name AS reviewer_name, u.avatar_url AS reviewer_avatar
         FROM reviews r LEFT JOIN users u ON r.reviewer_id = u.id
         WHERE r.reviewee_id = ? AND r.direction = 'PASSENGER_TO_DRIVER'
         ORDER BY r.created_at DESC LIMIT 10"
    );
    $reviews->execute([$id]);
    json_out(['success' => true, 'profile' => $profile, 'reviews' => $reviews->fetchAll()]);
}

$payload   = require_auth();
$b         = body();
$full_name = trim($b['full_name'] ?? '');
$phone     = trim($b['phone'] ?? '');

if (!$full_name) json_out(['success' => false, 'message' => 'Nome é obrigatório'], 400);

$db->prepare("UPDATE users SET full_name = ?, phone = ? WHERE id = ?")
   ->execute([$full_name, $phone, $payload['userId']]);

$st = $db->prepare('SELECT id, email, full_name, phone, avatar_url, role, status FROM users WHERE id = ?');
$st->execute([$payload['userId']]);
json_out(['success' => true, 'message' => 'Perfil atualizado', 'user' => $st->fetch()]);
