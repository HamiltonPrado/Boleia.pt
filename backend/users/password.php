<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('PATCH');

$payload          = require_auth();
$b                = body();
$current_password = $b['current_password'] ?? '';
$new_password     = $b['new_password'] ?? '';

if (!$current_password || !$new_password) json_out(['success' => false, 'message' => 'Passwords obrigatórias'], 400);
if (strlen($new_password) < 8) json_out(['success' => false, 'message' => 'Nova password deve ter pelo menos 8 caracteres'], 400);

$db = db();
$st = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
$st->execute([$payload['userId']]);
$user = $st->fetch();

if (!$user) json_out(['success' => false, 'message' => 'Utilizador não encontrado'], 404);

if (!password_verify($current_password, $user['password_hash']))
    json_out(['success' => false, 'message' => 'Password atual incorreta'], 401);

$db->prepare("UPDATE users SET password_hash = ? WHERE id = ?")
   ->execute([password_hash($new_password, PASSWORD_BCRYPT, ['cost' => 10]), $payload['userId']]);

json_out(['success' => true, 'message' => 'Password alterada com sucesso']);
