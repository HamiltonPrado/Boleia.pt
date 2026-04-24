<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('GET');

$payload = require_auth();
$db = db();

$st = $db->prepare('SELECT id, email, full_name, phone, avatar_url, role, status, created_at FROM users WHERE id = ?');
$st->execute([$payload['userId']]);
$user = $st->fetch();

if (!$user) json_out(['success' => false, 'message' => 'Utilizador não encontrado'], 404);

json_out(['success' => true, 'user' => $user]);
