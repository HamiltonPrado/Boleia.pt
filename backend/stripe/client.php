<?php
class StripeClient {

    private string $secretKey;
    private string $apiVersion = '2024-06-20';

    public function __construct(string $secretKey) {
        if (!extension_loaded('curl'))
            throw new RuntimeException('A extensão cURL do PHP é necessária para o Stripe.');
        $this->secretKey = $secretKey;
    }

    public function createPaymentIntent(int $amountCents, string $currency, array $metadata = []): array {
        $params = [
            'amount'                    => $amountCents,
            'currency'                  => $currency,
            'automatic_payment_methods' => ['enabled' => 'true'],
            'metadata'                  => $metadata,
        ];
        return $this->request('POST', 'payment_intents', $params);
    }

    public function retrievePaymentIntent(string $id): array {
        return $this->request('GET', "payment_intents/$id");
    }

    public function constructWebhookEvent(string $payload, string $sigHeader, string $secret): array {
        $parts = [];
        foreach (explode(',', $sigHeader) as $chunk) {
            [$k, $v] = array_pad(explode('=', $chunk, 2), 2, '');
            $parts[trim($k)][] = trim($v);
        }

        $timestamp  = $parts['t'][0]  ?? '';
        $signatures = $parts['v1']    ?? [];

        if (!$timestamp || empty($signatures))
            throw new RuntimeException('Cabeçalho Stripe-Signature mal formado.');

        if (abs(time() - (int)$timestamp) > 300)
            throw new RuntimeException('Webhook expirado (timestamp demasiado antigo).');

        $expected = hash_hmac('sha256', "$timestamp.$payload", $secret);
        if (!in_array($expected, $signatures, true))
            throw new RuntimeException('Assinatura do webhook inválida.');

        $event = json_decode($payload, true);
        if (!$event)
            throw new RuntimeException('Payload do webhook não é JSON válido.');

        return $event;
    }

    private function request(string $method, string $endpoint, array $params = []): array {
        $url = 'https://api.stripe.com/v1/' . $endpoint;
        $ch  = curl_init();

        $curlOpts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERPWD        => $this->secretKey . ':',
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER     => ['Stripe-Version: ' . $this->apiVersion],
        ];

        if ($method === 'POST') {
            $curlOpts[CURLOPT_URL]        = $url;
            $curlOpts[CURLOPT_POST]       = true;
            $curlOpts[CURLOPT_POSTFIELDS] = http_build_query($params);
        } else {
            $curlOpts[CURLOPT_URL] = $params ? $url . '?' . http_build_query($params) : $url;
        }

        curl_setopt_array($ch, $curlOpts);
        $body     = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($body === false)
            throw new RuntimeException("Erro cURL ao contactar o Stripe: $curlErr");

        $data = json_decode($body, true);
        if ($httpCode >= 400) {
            $msg = $data['error']['message'] ?? "Stripe API error (HTTP $httpCode)";
            throw new RuntimeException($msg);
        }

        return $data;
    }
}
