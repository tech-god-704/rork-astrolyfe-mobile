import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Lock, Unlock, BookOpen, ShoppingCart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { fetchProducts, fetchUnlockedSlugs, type Product } from '@/services/purchases';
import { createPaymentIntent } from '@/services/stripe';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/GlassCard';

export default function InsightsScreen() {
  const { user, isAdmin } = useAuth();

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const unlockedQuery = useQuery({
    queryKey: ['unlockedSlugs', user?.email],
    queryFn: () => fetchUnlockedSlugs(user!.email!),
    enabled: !!user?.email,
  });

  const products = productsQuery.data ?? [];
  const unlockedSlugs = unlockedQuery.data ?? [];

  const handlePurchase = useCallback(async (product: Product) => {
    if (!user?.email) {
      Alert.alert('Sign In Required', 'Please sign in to purchase insights.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const amountInCents = Math.round(product.price * 100);
      const clientSecret = await createPaymentIntent(amountInCents);

      // For now, record the purchase with the client secret as PI ID
      // In production, integrate with @stripe/stripe-react-native initPaymentSheet + presentPaymentSheet
      const piId = clientSecret.split('_secret_')[0] ?? clientSecret;

      const { error } = await supabase.from('purchases').insert({
        user_email: user.email,
        product_id: product.slug,
        status: 'completed',
        stripe_payment_intent_id: piId,
      });

      if (error) throw error;

      await unlockedQuery.refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Success', `You've unlocked ${product.name}!`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Payment failed';
      Alert.alert('Error', message);
    }
  }, [user, unlockedQuery]);

  const onRefresh = useCallback(() => {
    void productsQuery.refetch();
    void unlockedQuery.refetch();
  }, [productsQuery, unlockedQuery]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a103d', '#120d2e', '#0a0a1a']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={productsQuery.isRefetching} onRefresh={onRefresh} tintColor={Colors.purple} />}
        >
          <Text style={styles.title}>Cosmic Insights</Text>
          <Text style={styles.subtitle}>Unlock deep astrological readings</Text>

          {productsQuery.isLoading ? (
            <ActivityIndicator color={Colors.purple} style={styles.loader} />
          ) : products.length > 0 ? (
            <View style={styles.productList}>
              {products.map((product) => {
                const isUnlocked = isAdmin || unlockedSlugs.includes(product.slug);
                return (
                  <GlassCard key={product.slug} style={styles.productCard}>
                    <View style={styles.productHeader}>
                      <View style={[styles.productIcon, isUnlocked && styles.productIconUnlocked]}>
                        {isUnlocked ? (
                          <Unlock size={20} color={Colors.success} />
                        ) : (
                          <Lock size={20} color={Colors.textMuted} />
                        )}
                      </View>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{product.name}</Text>
                        {product.category && (
                          <Text style={styles.productCategory}>{product.category}</Text>
                        )}
                      </View>
                      {!isUnlocked && (
                        <Text style={styles.productPrice}>${product.price}</Text>
                      )}
                    </View>
                    <Text style={styles.productDesc}>{product.description}</Text>

                    {isUnlocked ? (
                      <Pressable
                        style={({ pressed }) => [styles.viewBtn, pressed && { opacity: 0.8 }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        }}
                      >
                        <BookOpen size={16} color={Colors.success} />
                        <Text style={styles.viewBtnText}>View Content</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [styles.purchaseBtn, pressed && { opacity: 0.8 }]}
                        onPress={() => handlePurchase(product)}
                      >
                        <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.purchaseBtnInner}>
                          <ShoppingCart size={16} color="#fff" />
                          <Text style={styles.purchaseBtnText}>Unlock for ${product.price}</Text>
                        </LinearGradient>
                      </Pressable>
                    )}
                  </GlassCard>
                );
              })}
            </View>
          ) : (
            <GlassCard style={styles.emptyCard}>
              <BookOpen size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Coming Soon</Text>
              <Text style={styles.emptyDesc}>Premium insights and readings are being prepared by our astrologers.</Text>
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginTop: 4, marginBottom: 24 },
  loader: { marginTop: 40 },
  productList: { gap: 16 },
  productCard: { gap: 12 },
  productHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  productIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  productIconUnlocked: { backgroundColor: 'rgba(34,197,94,0.1)' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  productCategory: { fontSize: 12, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  productPrice: { fontSize: 18, fontWeight: '800', color: Colors.gold },
  productDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 12, alignSelf: 'flex-start' },
  viewBtnText: { fontSize: 14, fontWeight: '600', color: Colors.success },
  purchaseBtn: { borderRadius: 12, overflow: 'hidden' },
  purchaseBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  purchaseBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
});
