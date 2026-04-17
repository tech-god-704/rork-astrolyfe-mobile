import { fetchWithRetry, parseResponseOrThrow } from '@/lib/network';

const STRIPE_ENDPOINT = process.env.EXPO_PUBLIC_STRIPE_ENDPOINT || 'https://astrolyfe.co/assets/includes/stripe/create-pay.php';

interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId?: string;
}

/**
 * Create a Stripe payment intent via the backend.
 * Returns the client secret needed for the payment sheet.
 */
export async function createPaymentIntent(amountInCents: number): Promise<PaymentIntentResponse> {
  if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
    throw new Error('Invalid payment amount');
  }
  if (amountInCents > 99999999) {
    throw new Error('Payment amount too large');
  }

  // Stable key so retries hit the same Stripe PaymentIntent instead of creating duplicates
  const idempotencyKey = `pi_${amountInCents}_${Date.now()}`;

  const res = await fetchWithRetry(
    STRIPE_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ items: [{ id: amountInCents }] }),
    },
    { timeout: 20000, maxRetries: 3, retryOnStatus: [429, 502, 503, 504] },
  );

  const data = await parseResponseOrThrow<Record<string, unknown>>(res, 'Payment server');

  if (!data.clientSecret || typeof data.clientSecret !== 'string') {
    throw new Error('No client secret returned from payment server');
  }

  // Extract payment intent ID from client secret (pi_xxx_secret_yyy → pi_xxx)
  const clientSecret = data.clientSecret as string;
  const paymentIntentId = (data.paymentIntentId as string) ?? clientSecret.split('_secret_')[0] ?? '';

  return { clientSecret, paymentIntentId };
}
