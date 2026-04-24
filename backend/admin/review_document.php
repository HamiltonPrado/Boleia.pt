<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('PATCH');
require_admin();

$id     = $_GET['id'] ?? '';
$b      = body();
$action = $b['action'] ?? '';
$note   = $b['rejection_note'] ?? null;

if (!$id) json_out(['success' => false, 'message' => 'id em falta'], 400);
if (!in_array($action, ['approve', 'reject'])) json_out(['success' => false, 'message' => 'Ação inválida'], 400);

$db     = db();
$status = $action === 'approve' ? 'APPROVED' : 'REJECTED';

$st = $db->prepare("UPDATE driver_documents SET status = ?, rejection_note = ?, reviewed_at = NOW() WHERE id = ?");
$st->execute([$status, $note, $id]);
if ($st->rowCount() === 0) json_out(['success' => false, 'message' => 'Documento não encontrado'], 404);

if ($action === 'approve') {
    $doc = $db->prepare(
        "SELECT dp.user_id FROM driver_documents dd INNER JOIN driver_profiles dp ON dd.driver_id = dp.id WHERE dd.id = ?"
    );
    $doc->execute([$id]);
    $row = $doc->fetch();
    if ($row) {
        $allDocs = $db->prepare(
            "SELECT status FROM driver_documents dd INNER JOIN driver_profiles dp ON dd.driver_id = dp.id WHERE dp.user_id = ?"
        );
        $allDocs->execute([$row['user_id']]);
        $docs = $allDocs->fetchAll();
        $approved = array_filter($docs, fn($d) => $d['status'] === 'APPROVED');
        if (count($docs) === 3 && count($approved) === 3) {
            $db->prepare("UPDATE driver_profiles SET tier = 'VERIFIED', verification_status = 'APPROVED' WHERE user_id = ?")
               ->execute([$row['user_id']]);
        }
    }
}

json_out(['success' => true, 'message' => $action === 'approve' ? 'Documento aprovado' : 'Documento rejeitado']);
