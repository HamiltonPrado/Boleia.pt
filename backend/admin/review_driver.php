<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('POST');
require_admin();

$id     = $_GET['id'] ?? '';
$b      = body();
$action = $b['action'] ?? '';

if (!$id) json_out(['success' => false, 'message' => 'id em falta'], 400);
if (!in_array($action, ['approve', 'reject']))
    json_out(['success' => false, 'message' => 'Ação inválida. Use "approve" ou "reject"'], 400);

$db     = db();
$vstatus = $action === 'approve' ? 'APPROVED' : 'REJECTED';
$tier    = $action === 'approve' ? 'VERIFIED'  : 'BASIC';

$st = $db->prepare(
    "UPDATE driver_profiles SET verification_status = ?, tier = ?
     WHERE (id = ? OR user_id = ?) AND verification_status = 'PENDING'"
);
$st->execute([$vstatus, $tier, $id, $id]);
if ($st->rowCount() === 0) json_out(['success' => false, 'message' => 'Motorista não encontrado ou já processado'], 404);

$msg = $action === 'approve' ? 'Motorista aprovado com sucesso' : 'Motorista rejeitado com sucesso';
json_out(['success' => true, 'message' => $msg]);
