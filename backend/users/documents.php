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

if (!$dp) json_out(['success' => false, 'message' => 'Perfil de motorista não encontrado'], 403);

$type = $_POST['type'] ?? '';
if (!in_array($type, ['LICENSE', 'INSURANCE', 'ID']))
    json_out(['success' => false, 'message' => 'Tipo inválido'], 400);

if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK)
    json_out(['success' => false, 'message' => 'Ficheiro em falta ou erro no upload'], 400);

$file     = $_FILES['file'];
$maxBytes = 5 * 1024 * 1024;
if ($file['size'] > $maxBytes)
    json_out(['success' => false, 'message' => 'O ficheiro não pode ultrapassar 5 MB'], 400);

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['jpg', 'jpeg', 'png', 'pdf']))
    json_out(['success' => false, 'message' => 'Formato inválido. Aceites: JPG, PNG, PDF'], 400);

$magic  = file_get_contents($file['tmp_name'], false, null, 0, 12);
$isJpeg = substr($magic, 0, 3) === "\xFF\xD8\xFF";
$isPng  = substr($magic, 0, 8) === "\x89PNG\r\n\x1A\n";
$isPdf  = substr($magic, 0, 4) === '%PDF';
if (!$isJpeg && !$isPng && !$isPdf)
    json_out(['success' => false, 'message' => 'Tipo de ficheiro não permitido'], 400);

$filename = uuid() . '.' . $ext;
$destDir  = __DIR__ . '/../../uploads/documents/';
$destPath = $destDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $destPath))
    json_out(['success' => false, 'message' => 'Erro ao guardar o ficheiro'], 500);

$fileUrl = 'uploads/documents/' . $filename;

$ex = $db->prepare('SELECT id, file_url FROM driver_documents WHERE driver_id = ? AND type = ?');
$ex->execute([$dp['id'], $type]);
$existing = $ex->fetch();

if ($existing) {
    $old = __DIR__ . '/../../' . $existing['file_url'];
    if (file_exists($old)) @unlink($old);
    $db->prepare("UPDATE driver_documents SET file_url = ?, status = 'PENDING', rejection_note = NULL, reviewed_at = NULL, uploaded_at = NOW() WHERE id = ?")
       ->execute([$fileUrl, $existing['id']]);
} else {
    $db->prepare("INSERT INTO driver_documents (id, driver_id, type, file_url, status) VALUES (?, ?, ?, ?, 'PENDING')")
       ->execute([uuid(), $dp['id'], $type, $fileUrl]);
}

$db->prepare("UPDATE driver_profiles SET verification_status = 'PENDING' WHERE id = ? AND verification_status IN ('NONE','REJECTED')")
   ->execute([$dp['id']]);

json_out(['success' => true, 'message' => 'Documento enviado com sucesso']);
