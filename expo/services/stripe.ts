const STRIPE_ENDPOINT = process.env.EXPO_PUBLIC_STRIPE_ENDPOINT!;

export async function createPaymentIntent(amountInCents: number): Promise<string> {
  const res = await fetch(STRIPE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ id: amountInCents }] }),
  });
  if (!res.ok) {
    throw new Error(`Payment server error: ${res.status}`);
  }
  const data = await res.json();
  if (!data.clientSecret) {
    throw new Error('No client secret returned from payment server');
  }
  return data.clientSecret as string;
}
