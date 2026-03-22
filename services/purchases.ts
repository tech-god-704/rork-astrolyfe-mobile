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
  const { data, error } = await supabase
    .from('products')
    .select('slug, name, price, description, category, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.log('[Purchases] Products fetch error:', error.message);
    return [];
  }
  return (data ?? []) as Product[];
}

/**
 * Fetch slugs of all products the user has purchased (completed).
 */
export async function fetchUnlockedSlugs(userEmail: string): Promise<string[]> {
  if (!userEmail) return [];

  const { data: rows, error } = await supabase
    .from('purchases')
    .select('product_id, products(slug)')
    .eq('user_email', userEmail)
    .eq('status', 'completed');

  if (error) {
    console.log('[Purchases] Unlocked fetch error:', error.message);
    return [];
  }

  if (!rows || rows.length === 0) return [];

  return rows
    .map((r: Record<string, unknown>) => {
      const p = r.products;
      if (!p) return null;
      if (Array.isArray(p)) {
        const first = p[0];
        return first && typeof first === 'object' && 'slug' in first
          ? String((first as Record<string, unknown>).slug)
          : null;
      }
      if (typeof p === 'object' && 'slug' in (p as Record<string, unknown>)) {
        return String((p as Record<string, unknown>).slug);
      }
      return null;
    })
    .filter((slug): slug is string => slug !== null);
}

/**
 * Record a completed purchase in the database.
 * Validates that the product exists before inserting.
 */
export async function recordPurchase(
  userEmail: string,
  productSlug: string,
  stripePaymentIntentId: string,
): Promise<void> {
  if (!userEmail || !productSlug || !stripePaymentIntentId) {
    throw new Error('Missing required purchase fields');
  }

  // Verify the product exists
  const { data: product, error: lookupError } = await supabase
    .from('products')
    .select('slug, price')
    .eq('slug', productSlug)
    .single();

  if (lookupError || !product) throw new Error('Product not found');

  // Check if this payment intent was already recorded (prevent duplicates)
  const { data: existing } = await supabase
    .from('purchases')
    .select('id')
    .eq('stripe_payment_intent_id', stripePaymentIntentId)
    .maybeSingle();

  if (existing) {
    console.log('[Purchases] Purchase already recorded for this payment intent');
    return; // idempotent — don't insert again
  }

  const { error } = await supabase.from('purchases').insert({
    user_email: userEmail,
    product_id: product.slug,
    status: 'completed',
    stripe_payment_intent_id: stripePaymentIntentId,
  });

  if (error) throw error;
}
