<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('GET', 'POST');

$payload = require_auth();
$method  = $_SERVER['REQUEST_METHOD'];
$db      = db();

$dpSt = $db->prepare('SELECT id, verification_status, tier FROM driver_profiles WHERE user_id = ?');
$dpSt->execute([$payload['userId']]);
$dp = $dpSt->fetch();

if ($method === 'GET') {
    if (!$dp) json_out(['success' => true, 'documents' => [], 'verification_status' => null, 'tier' => null]);
    $docs = $db->prepare('SELECT id, type, file_url, status, rejection_note, uploaded_at FROM driver_documents WHERE driver_id = ? ORDER BY uploaded_at ASC');
    $docs->execute([$dp['id']]);
    json_out(['success' => true, 'documents' => $docs->fetchAll(), 'verification_status' => $dp['verification_status'], 'tier' => $dp['tier']]);
}

$b        = body();
$type     = $b['type'] ?? '';
$file_url = $b['file_url'] ?? '';

if (!in_array($type, ['LICENSE', 'INSURANCE', 'ID']))
    json_out(['success' => false, 'message' => 'Tipo inválido. Use LICENSE, INSURANCE ou ID'], 400);
if (!$file_url) json_out(['success' => false, 'message' => 'file_url é obrigatório'], 400);
if (!$dp) json_out(['success' => false, 'message' => 'Perfil de motorista não encontrado'], 403);

$ex = $db->prepare('SELECT id FROM driver_documents WHERE driver_id = ? AND type = ?');
$ex->execute([$dp['id'], $type]);
$existing = $ex->fetch();

if ($existing) {
    $db->prepare("UPDATE driver_documents SET file_url = ?, status = 'PENDING', rejection_note = NULL, reviewed_at = NULL, uploaded_at = NOW() WHERE id = ?")
       ->execute([$file_url, $existing['id']]);
} else {
    $db->prepare("INSERT INTO driver_documents (id, driver_id, type, file_url, status) VALUES (?, ?, ?, ?, 'PENDING')")
       ->execute([uuid(), $dp['id'], $type, $file_url]);
}

$db->prepare("UPDATE driver_profiles SET verification_status = 'PENDING' WHERE id = ? AND verification_status IN ('NONE','REJECTED')")
   ->execute([$dp['id']]);

json_out(['success' => true, 'message' => 'Documento submetido com sucesso']);
