<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('POST');

$b        = body();
$email    = trim($b['email'] ?? '');
$password = $b['password'] ?? '';

if (!$email || !$password) json_out(['success' => false, 'message' => 'email e password são obrigatórios'], 400);

$db = db();
$st = $db->prepare('SELECT id, email, full_name, password_hash, role, status, avatar_url, phone FROM users WHERE email = ?');
$st->execute([$email]);
$user = $st->fetch();

if (!$user) json_out(['success' => false, 'message' => 'Credenciais inválidas'], 401);
if ($user['status'] === 'SUSPENDED') json_out(['success' => false, 'message' => 'Conta suspensa'], 403);
if (!password_verify($password, $user['password_hash'])) json_out(['success' => false, 'message' => 'Credenciais inválidas'], 401);

session_init();
$_SESSION['userId'] = $user['id'];
$_SESSION['role']   = $user['role'];

json_out(['success' => true, 'user' => [
    'id'         => $user['id'],
    'email'      => $user['email'],
    'full_name'  => $user['full_name'],
    'role'       => $user['role'],
    'avatar_url' => $user['avatar_url'],
    'phone'      => $user['phone'],
]]);
