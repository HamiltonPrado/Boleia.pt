<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('POST');

$payload = require_auth();
$uid     = $payload['userId'];

if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK)
    json_out(['success' => false, 'message' => 'Ficheiro em falta ou erro no upload'], 400);

$file     = $_FILES['file'];
$maxBytes = 2 * 1024 * 1024;
if ($file['size'] > $maxBytes)
    json_out(['success' => false, 'message' => 'A foto não pode ultrapassar 2 MB'], 400);

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['jpg', 'jpeg', 'png']))
    json_out(['success' => false, 'message' => 'Formato inválido. Aceites: JPG, PNG'], 400);

$magic  = file_get_contents($file['tmp_name'], false, null, 0, 12);
$isJpeg = substr($magic, 0, 3) === "\xFF\xD8\xFF";
$isPng  = substr($magic, 0, 8) === "\x89PNG\r\n\x1A\n";
if (!$isJpeg && !$isPng)
    json_out(['success' => false, 'message' => 'Tipo de ficheiro não permitido'], 400);

$db = db();
$st = $db->prepare('SELECT avatar_url FROM users WHERE id = ?');
$st->execute([$uid]);
$user = $st->fetch();

if ($user && $user['avatar_url']) {
    $old = __DIR__ . '/../../' . $user['avatar_url'];
    if (file_exists($old)) @unlink($old);
}

$filename = uuid() . '.' . $ext;
$destPath = __DIR__ . '/../../uploads/avatars/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $destPath))
    json_out(['success' => false, 'message' => 'Erro ao guardar a foto'], 500);

$avatarUrl = 'uploads/avatars/' . $filename;
$stmt = $db->prepare('UPDATE users SET avatar_url = ? WHERE id = ?');
$stmt->execute([$avatarUrl, $uid]);
$affected = $stmt->rowCount();

error_log("[avatar.php] uid=$uid affected=$affected url=$avatarUrl");

json_out(['success' => true, 'avatar_url' => $avatarUrl, '_debug' => ['uid' => $uid, 'affected' => $affected]]);
