<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
cors();
require_method('GET', 'POST');

$method  = $_SERVER['REQUEST_METHOD'];
$payload = require_auth();
$uid     = $payload['userId'];
$db      = db();

if ($method === 'GET') {
    $st = $db->prepare(
        "SELECT b.*, ro.date, r.depart_time,
                u.id AS driver_user_id, u.full_name AS driver_name, u.avatar_url AS driver_avatar,
                dp.tier, dp.avg_rating,
                ps.address AS pickup_address, ds.address AS dropoff_address
         FROM bookings b
         INNER JOIN route_occurrences ro ON b.occurrence_id = ro.id
         INNER JOIN routes r ON ro.route_id = r.id
         INNER JOIN driver_profiles dp ON r.driver_id = dp.id
         INNER JOIN users u ON dp.user_id = u.id
         INNER JOIN route_stops ps ON b.pickup_stop_id = ps.id
         INNER JOIN route_stops ds ON b.dropoff_stop_id = ds.id
         WHERE b.passenger_id = ?
         ORDER BY ro.date DESC"
    );
    $st->execute([$uid]);
    json_out(['success' => true, 'bookings' => $st->fetchAll()]);
}

$b               = body();
$occurrence_id   = $b['occurrence_id']   ?? '';
$pickup_stop_id  = $b['pickup_stop_id']  ?? '';
$dropoff_stop_id = $b['dropoff_stop_id'] ?? '';
$seats_booked    = (int)($b['seats_booked'] ?? 1);
$note            = $b['note_to_driver'] ?? null;

if (!$occurrence_id || !$pickup_stop_id || !$dropoff_stop_id)
    json_out(['success' => false, 'message' => 'occurrence_id, pickup_stop_id e dropoff_stop_id são obrigatórios'], 400);
if ($seats_booked < 1 || $seats_booked > 8)
    json_out(['success' => false, 'message' => 'Número de lugares inválido (1-8)'], 400);

$result = transaction(function($db) use ($occurrence_id, $pickup_stop_id, $dropoff_stop_id, $seats_booked, $note, $uid) {
    $st = $db->prepare(
        "SELECT ro.*, r.total_seats, r.price_per_seat, r.depart_time, dp.user_id AS driver_user_id
         FROM route_occurrences ro
         INNER JOIN routes r ON ro.route_id = r.id
         INNER JOIN driver_profiles dp ON r.driver_id = dp.id
         WHERE ro.id = ? AND ro.status = 'SCHEDULED'
         FOR UPDATE"
    );
    $st->execute([$occurrence_id]);
    $occ = $st->fetch();
    if (!$occ) json_out(['success' => false, 'message' => 'Ocorrência não encontrada'], 404);

    $seatsAvailable = $occ['total_seats'] - $occ['seats_taken'];
    if ($seats_booked > $seatsAvailable) json_out(['success' => false, 'message' => "Apenas $seatsAvailable lugar(es) disponível(is)"], 409);

    $ex = $db->prepare(
        "SELECT b.id, b.status, b.total_amount,
                (SELECT COUNT(*) FROM payments p WHERE p.booking_id = b.id AND p.status = 'COMPLETED') AS paid
         FROM bookings b
         WHERE b.occurrence_id = ? AND b.passenger_id = ? AND b.status NOT IN ('CANCELLED_PASSENGER','CANCELLED_DRIVER')"
    );
    $ex->execute([$occurrence_id, $uid]);
    $existing = $ex->fetch();
    if ($existing) {
        if ($existing['paid'] == 0 && $existing['status'] === 'PENDING')
            json_out(['success' => true, 'bookingId' => $existing['id'], 'total_amount' => $existing['total_amount'], 'resumed' => true]);
        json_out(['success' => false, 'message' => 'Já tens uma reserva nesta boleia'], 409);
    }

    $bookingId   = uuid();
    $price       = (float)$occ['price_per_seat'];
    $serviceFee  = round($price * $seats_booked * 0.10, 2);
    $totalAmount = round($price * $seats_booked + $serviceFee, 2);

    $db->prepare(
        "INSERT INTO bookings (id, occurrence_id, passenger_id, pickup_stop_id, dropoff_stop_id, status, seats_booked, price_per_seat, total_amount, service_fee, note_to_driver)
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)"
    )->execute([$bookingId, $occurrence_id, $uid, $pickup_stop_id, $dropoff_stop_id, $seats_booked, $price, $totalAmount, $serviceFee, $note]);

    $db->prepare("UPDATE route_occurrences SET seats_taken = seats_taken + ? WHERE id = ?")
       ->execute([$seats_booked, $occurrence_id]);

    return ['bookingId' => $bookingId, 'total_amount' => $totalAmount, 'service_fee' => $serviceFee];
});

json_out(['success' => true, 'message' => 'Reserva criada com sucesso', ...$result], 201);
