<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('PATCH');
require_admin();

$id     = $_GET['id'] ?? '';
$b      = body();
$status = $b['status'] ?? '';

if (!$id) json_out(['success' => false, 'message' => 'id em falta'], 400);
if (!in_array($status, ['ACTIVE', 'SUSPENDED'])) json_out(['success' => false, 'message' => 'Status inválido'], 400);

$db = db();
$st = $db->prepare("UPDATE users SET status = ? WHERE id = ? AND role != 'ADMIN'");
$st->execute([$status, $id]);
if ($st->rowCount() === 0) json_out(['success' => false, 'message' => 'Utilizador não encontrado'], 404);

$msg = $status === 'ACTIVE' ? 'Utilizador reativado com sucesso' : 'Utilizador suspenso com sucesso';
json_out(['success' => true, 'message' => $msg]);
