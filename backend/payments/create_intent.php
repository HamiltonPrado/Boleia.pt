<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth_helper.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../stripe/client.php';
cors();
require_method('POST');

$payload = require_auth();
$uid     = $payload['userId'];
$db      = db();
$b       = body();

$bookingId = $b['booking_id'] ?? '';
if (!$bookingId)
    json_out(['success' => false, 'message' => 'booking_id em falta'], 400);

$st = $db->prepare(
    "SELECT b.id, b.total_amount, b.status, b.passenger_id
     FROM bookings b
     WHERE b.id = ? AND b.passenger_id = ?"
);
$st->execute([$bookingId, $uid]);
$booking = $st->fetch();

if (!$booking)
    json_out(['success' => false, 'message' => 'Reserva não encontrada'], 404);

if (!in_array($booking['status'], ['PENDING', 'CONFIRMED']))
    json_out(['success' => false, 'message' => 'Esta reserva não pode ser paga (estado: ' . $booking['status'] . ')'], 409);

$stPay = $db->prepare(
    "SELECT id, stripe_payment_intent_id, status FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1"
);
$stPay->execute([$bookingId]);
$existingPayment = $stPay->fetch();

$stripe      = new StripeClient(STRIPE_SECRET_KEY);
$amountCents = (int)round((float)$booking['total_amount'] * 100);

try {
    if ($existingPayment && $existingPayment['stripe_payment_intent_id']) {
        $pi = $stripe->retrievePaymentIntent($existingPayment['stripe_payment_intent_id']);
    } else {
        $pi = $stripe->createPaymentIntent($amountCents, STRIPE_CURRENCY, [
            'booking_id' => $bookingId,
            'user_id'    => $uid,
        ]);

        $paymentId = uuid();
        $db->prepare(
            "INSERT INTO payments (id, booking_id, stripe_payment_intent_id, amount, status, created_at)
             VALUES (?, ?, ?, ?, 'PENDING', NOW())"
        )->execute([$paymentId, $bookingId, $pi['id'], $booking['total_amount']]);
    }
} catch (RuntimeException $e) {
    json_out(['success' => false, 'message' => 'Erro Stripe: ' . $e->getMessage()], 502);
}

json_out([
    'success'           => true,
    'client_secret'     => $pi['client_secret'],
    'publishable_key'   => STRIPE_PUBLISHABLE_KEY,
    'amount'            => $booking['total_amount'],
    'currency'          => STRIPE_CURRENCY,
    'payment_intent_id' => $pi['id'],
]);
