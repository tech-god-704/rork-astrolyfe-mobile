import { supabase } from '@/lib/supabase';

export interface Product {
  slug: string;
  name: string;
  price: number;
  description: string;
  category: string;
  is_active: boolean;
  sort_order: number;
}

/**
 * Fetch all active products from Supabase.
 */
export async function fetchProducts(): Promise<Product[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const { data, error } = await supabase
      .from('products')
      .select('slug, name, price, description, category, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .abortSignal(controller.signal);

    if (error) {
      console.log('[Purchases] Products fetch error:', error.message);
      return [];
    }
    return (data ?? []) as Product[];
  } catch (e) {
    console.log('[Purchases] Products fetch exception:', e);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch slugs of all products the user has purchased (completed).
 */
export async function fetchUnlockedSlugs(userEmail: string): Promise<string[]> {
  if (!userEmail) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let rows: Record<string, unknown>[] | null = null;
  try {
    const { data, error } = await supabase
      .from('purchases')
      // product_id already holds the slug — the backend writes it that way when
      // recording a purchase. The previous `products(slug)` was a PostgREST embed,
      // which has no equivalent on the current backend and was never needed.
      .select('product_id')
      .eq('user_email', userEmail)
      .eq('status', 'completed')
      .abortSignal(controller.signal);

    if (error) {
      console.log('[Purchases] Unlocked fetch error:', error.message);
      return [];
    }
    rows = data as Record<string, unknown>[] | null;
  } catch (e) {
    console.log('[Purchases] Unlocked fetch exception:', e);
    return [];
  } finally {
    clearTimeout(timer);
  }

  if (!rows || rows.length === 0) return [];

  return rows
    .map((r: Record<string, unknown>) => {
      const slug = r.product_id;
      return typeof slug === 'string' && slug !== '' ? slug : null;
    })
    .filter((slug): slug is string => slug !== null);
}

/**
 * Deliberately refuses client-side purchase recording. A verified Stripe webhook is
 * the only component allowed to mark a purchase completed.
 */
export async function recordPurchase(
  userEmail: string,
  productSlug: string,
  stripePaymentIntentId: string,
): Promise<void> {
  // A device must never grant premium access based on a client-controlled payment
  // intent identifier. Purchases are created only by the verified Stripe webhook.
  // Keep the exported function as a loud, safe guard for any future call site until
  // a native payment sheet plus server-side confirmation is intentionally built.
  void userEmail;
  void productSlug;
  void stripePaymentIntentId;
  throw new Error('Purchases are confirmed securely on the SoulSketch website.');
}
