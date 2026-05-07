<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('POST');
require_admin();

$id     = $_GET['id'] ?? '';
$b      = body();
$status = $b['status'] ?? '';

$allowed = ['PENDING', 'REVIEWED', 'CLOSED'];
if (!$id || !in_array($status, $allowed))
    json_out(['success' => false, 'message' => 'Dados inválidos.'], 400);

$db = db();
$st = $db->prepare("UPDATE complaints SET status = ? WHERE id = ?");
$st->execute([$status, $id]);

if ($st->rowCount() === 0)
    json_out(['success' => false, 'message' => 'Reclamação não encontrada.'], 404);

json_out(['success' => true, 'message' => 'Estado atualizado.']);
