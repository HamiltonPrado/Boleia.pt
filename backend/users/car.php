<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('GET', 'POST');

$payload = require_auth();
$method  = $_SERVER['REQUEST_METHOD'];
$db      = db();

if ($method === 'GET') {
    $st = $db->prepare('SELECT car_make, car_model, car_year, car_plate FROM driver_profiles WHERE user_id = ?');
    $st->execute([$payload['userId']]);
    $dp = $st->fetch();
    if (!$dp) json_out(['success' => false, 'message' => 'Perfil de motorista não encontrado'], 404);
    json_out(['success' => true, ...$dp]);
}

$b = body();
$st = $db->prepare('SELECT id FROM driver_profiles WHERE user_id = ?');
$st->execute([$payload['userId']]);
if (!$st->fetch()) json_out(['success' => false, 'message' => 'Apenas motoristas podem atualizar dados do carro'], 403);

$db->prepare("UPDATE driver_profiles SET car_make = ?, car_model = ?, car_year = ?, car_plate = ? WHERE user_id = ?")
   ->execute([$b['car_make'] ?? null, $b['car_model'] ?? null, $b['car_year'] ?? null,
              $b['car_plate'] ? strtoupper($b['car_plate']) : null, $payload['userId']]);
json_out(['success' => true, 'message' => 'Dados do carro atualizados']);
