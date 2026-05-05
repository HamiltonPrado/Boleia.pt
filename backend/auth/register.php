<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();

require_method('POST');

$b = body();
$email     = trim($b['email'] ?? '');
$password  = $b['password'] ?? '';
$full_name = trim($b['full_name'] ?? '');
$phone     = trim($b['phone'] ?? '');
$role      = $b['role'] ?? 'PASSENGER';
$car_make  = trim($b['car_make']  ?? '') ?: null;
$car_model = trim($b['car_model'] ?? '') ?: null;
$car_year  = !empty($b['car_year']) ? (int)$b['car_year'] : null;
$car_plate = trim($b['car_plate'] ?? '') ?: null;

if (!$email || !$password || !$full_name || !$phone)
    json_out(['success' => false, 'message' => 'email, password, full_name e phone são obrigatórios'], 400);

if (!filter_var($email, FILTER_VALIDATE_EMAIL))
    json_out(['success' => false, 'message' => 'Formato de email inválido'], 400);

if (strlen($password) < 8)
    json_out(['success' => false, 'message' => 'A password deve ter pelo menos 8 caracteres'], 400);

$db = db();

$st = $db->prepare('SELECT id FROM users WHERE email = ?');
$st->execute([$email]);
if ($st->fetch()) json_out(['success' => false, 'message' => 'Email já registado'], 409);

$id           = uuid();
$passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
$userRole     = in_array($role, ['DRIVER', 'BOTH']) ? $role : 'PASSENGER';

$db->prepare(
    "INSERT INTO users (id, email, phone, full_name, password_hash, role, status)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')"
)->execute([$id, $email, $phone ?: null, $full_name, $passwordHash, $userRole]);

if ($userRole === 'DRIVER' || $userRole === 'BOTH') {
    $db->prepare(
        "INSERT INTO driver_profiles (id, user_id, tier, verification_status, car_make, car_model, car_year, car_plate)
         VALUES (?, ?, 'BASIC', 'NONE', ?, ?, ?, ?)"
    )->execute([uuid(), $id, $car_make, $car_model, $car_year, $car_plate]);
}

session_init();
$_SESSION['userId'] = $id;
$_SESSION['role']   = $userRole;

json_out(['success' => true, 'message' => 'Conta criada com sucesso',
    'user' => ['id' => $id, 'email' => $email, 'full_name' => $full_name, 'role' => $userRole]], 201);
