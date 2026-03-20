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

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) {
    console.log('[Purchases] Products fetch error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchUnlockedSlugs(userEmail: string): Promise<string[]> {
  const { data: rows, error } = await supabase
    .from('purchases')
    .select('product_id, products(slug)')
    .eq('user_email', userEmail)
    .eq('status', 'completed');

  if (error) {
    console.log('[Purchases] Unlocked fetch error:', error.message);
    return [];
  }

  return (
    rows?.map((r: Record<string, unknown>) => {
      const p = r.products;
      if (!p) return null;
      if (Array.isArray(p)) return (p[0] as Record<string, unknown>)?.slug as string;
      return (p as Record<string, unknown>).slug as string;
    }).filter(Boolean) as string[]
  ) ?? [];
}

export async function recordPurchase(
  userEmail: string,
  productSlug: string,
  stripePaymentIntentId: string
): Promise<void> {
  // The products table uses slug as PK, but purchases.product_id may be UUID or text
  // Fetch the product row to use whatever identifier the FK expects
  const { data: product, error: lookupError } = await supabase
    .from('products')
    .select('slug')
    .eq('slug', productSlug)
    .single();

  if (lookupError || !product) throw new Error('Product not found');

  const { error } = await supabase.from('purchases').insert({
    user_email: userEmail,
    product_id: product.slug,
    status: 'completed',
    stripe_payment_intent_id: stripePaymentIntentId,
  });

  if (error) throw error;
}
