<?php
require_once __DIR__ . '/db.php';

function session_init(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params(['samesite' => 'Lax', 'path' => '/']);
        session_start();
    }
}

function require_auth(): array {
    session_init();
    if (empty($_SESSION['userId'])) {
        json_out(['success' => false, 'message' => 'Não autenticado'], 401);
    }
    return ['userId' => $_SESSION['userId'], 'role' => $_SESSION['role']];
}

function require_admin(): array {
    $payload = require_auth();
    if ($payload['role'] !== 'ADMIN') {
        json_out(['success' => false, 'message' => 'Acesso negado'], 403);
    }
    return $payload;
}

function require_method(string ...$methods): void {
    if (!in_array($_SERVER['REQUEST_METHOD'], $methods))
        json_out(['success' => false, 'message' => 'Método não permitido'], 405);
}

function cors(): void {
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
}
