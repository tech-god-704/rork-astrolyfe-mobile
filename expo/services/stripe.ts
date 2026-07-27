interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
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

  // This app currently has no native Stripe payment-sheet confirmation. Sending a
  // request to the retired endpoint and treating an alert as payment would be both
  // misleading and unsafe. The purchase UI routes to the verified web checkout.
  void amountInCents;
  throw new Error('Native payments are not configured. Use the secure web checkout.');
}
