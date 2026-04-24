<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('GET');

$payload = require_auth();
$db = db();
$st = $db->prepare(
    "SELECT r.id, r.rating, r.comment, r.tags, r.created_at, r.direction,
            u.full_name AS reviewer_name, u.avatar_url AS reviewer_avatar
     FROM reviews r INNER JOIN users u ON r.reviewer_id = u.id
     WHERE r.reviewee_id = ? ORDER BY r.created_at DESC"
);
$st->execute([$payload['userId']]);
json_out(['success' => true, 'reviews' => $st->fetchAll()]);
