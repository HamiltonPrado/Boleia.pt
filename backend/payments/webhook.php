<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../stripe/client.php';

header('Content-Type: application/json');

$rawPayload = file_get_contents('php://input');
$sigHeader  = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

if (!$sigHeader) {
    http_response_code(400);
    echo json_encode(['error' => 'Cabeçalho Stripe-Signature em falta']);
    exit;
}

$stripe = new StripeClient(STRIPE_SECRET_KEY);

try {
    $event = $stripe->constructWebhookEvent($rawPayload, $sigHeader, STRIPE_WEBHOOK_SECRET);
} catch (RuntimeException $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

$db        = db();
$eventType = $event['type']          ?? '';
$object    = $event['data']['object'] ?? [];
$piId      = $object['id']           ?? null;

switch ($eventType) {

    case 'payment_intent.succeeded':
        if (!$piId) break;
        $db->prepare(
            "UPDATE payments SET status = 'COMPLETED', completed_at = NOW() WHERE stripe_payment_intent_id = ?"
        )->execute([$piId]);
        break;

    case 'payment_intent.payment_failed':
        break;

    case 'charge.refunded':
        $piId = $object['payment_intent'] ?? null;
        if (!$piId) break;
        $db->prepare(
            "UPDATE payments SET status = 'REFUNDED' WHERE stripe_payment_intent_id = ?"
        )->execute([$piId]);
        break;
}

http_response_code(200);
echo json_encode(['received' => true]);
