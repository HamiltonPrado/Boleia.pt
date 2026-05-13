<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_helper.php';
cors();
require_method('POST');

$body = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$nome     = trim($body['nome']     ?? '');
$email    = trim($body['email']    ?? '');
$assunto  = trim($body['assunto']  ?? '');
$mensagem = trim($body['mensagem'] ?? '');

if (!$nome || !$email || !$mensagem) {
    json_out(['success' => false, 'message' => 'Preenche todos os campos obrigatórios.'], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_out(['success' => false, 'message' => 'Email inválido.'], 400);
}

$logDir  = __DIR__ . '/logs';
$logFile = $logDir . '/contacto.log';

if (!is_dir($logDir)) {
    @mkdir($logDir, 0755, true);
}

$linha = sprintf(
    "[%s] De: %s <%s> | Assunto: %s\n%s\n---\n",
    date('Y-m-d H:i:s'),
    $nome,
    $email,
    $assunto ?: '(sem assunto)',
    $mensagem
);

@file_put_contents($logFile, $linha, FILE_APPEND | LOCK_EX);

try {
    $db = db();
    $db->prepare(
        "CREATE TABLE IF NOT EXISTS contact_messages (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            nome        VARCHAR(120)  NOT NULL,
            email       VARCHAR(200)  NOT NULL,
            assunto     VARCHAR(120)  DEFAULT '',
            mensagem    TEXT          NOT NULL,
            created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    )->execute();

    $stmt = $db->prepare(
        "INSERT INTO contact_messages (nome, email, assunto, mensagem) VALUES (:nome, :email, :assunto, :mensagem)"
    );
    $stmt->execute([
        ':nome'     => $nome,
        ':email'    => $email,
        ':assunto'  => $assunto,
        ':mensagem' => $mensagem,
    ]);
} catch (Throwable $e) {
}

json_out(['success' => true, 'message' => 'Mensagem recebida! Respondemos em até 24 horas úteis.']);
