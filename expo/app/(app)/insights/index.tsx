import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Lock, Unlock, BookOpen, ShoppingCart, Sparkles, Star, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { fetchProducts, fetchUnlockedSlugs, recordPurchase, type Product } from '@/services/purchases';
import { createPaymentIntent } from '@/services/stripe';
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
      const piId = clientSecret.split('_secret_')[0] ?? clientSecret;

      Alert.alert(
        'Confirm Purchase',
        `Unlock "${product.name}" for $${product.price}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Purchase',
            onPress: async () => {
              try {
                await recordPurchase(user.email!, product.slug, piId);
                await unlockedQuery.refetch();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                Alert.alert('Success', `You've unlocked ${product.name}!`);
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Purchase recording failed';
                Alert.alert('Error', msg);
              }
            },
          },
        ]
      );
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
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={productsQuery.isRefetching} onRefresh={onRefresh} tintColor={Colors.purple} />}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Cosmic Insights</Text>
              <Text style={styles.subtitle}>Unlock deep astrological readings</Text>
            </View>
            <View style={styles.headerIcon}>
              <Sparkles size={24} color={Colors.gold} />
            </View>
          </View>

          {productsQuery.isLoading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={Colors.purple} />
              <Text style={styles.loaderText}>Loading insights...</Text>
            </View>
          ) : products.length > 0 ? (
            <View style={styles.productList}>
              {products.map((product, index) => {
                const isUnlocked = isAdmin || unlockedSlugs.includes(product.slug);
                return (
                  <GlassCard
                    key={product.slug}
                    variant={isUnlocked ? 'glow' : 'default'}
                    glowColor={isUnlocked ? Colors.success : undefined}
                    style={styles.productCard}
                  >
                    {/* Accent line */}
                    <View style={[styles.productAccent, { backgroundColor: isUnlocked ? Colors.success : Colors.purple }]} />

                    <View style={styles.productHeader}>
                      <View style={[styles.productIcon, isUnlocked ? styles.productIconUnlocked : styles.productIconLocked]}>
                        {isUnlocked ? (
                          <Unlock size={18} color={Colors.success} />
                        ) : (
                          <Lock size={18} color={Colors.purpleLight} />
                        )}
                      </View>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{product.name}</Text>
                        {product.category && (
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{product.category}</Text>
                          </View>
                        )}
                      </View>
                      {!isUnlocked && (
                        <Text style={styles.productPrice}>${product.price}</Text>
                      )}
                      {isUnlocked && (
                        <View style={styles.unlockedBadge}>
                          <Text style={styles.unlockedText}>Unlocked</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.productDesc}>{product.description}</Text>

                    {isUnlocked ? (
                      <Pressable
                        style={({ pressed }) => [styles.viewBtn, pressed && { opacity: 0.8 }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          Alert.alert(
                            product.name,
                            product.description + '\n\nFull content is available in the web dashboard at app.astrolyfe.co',
                          );
                        }}
                      >
                        <BookOpen size={14} color={Colors.success} />
                        <Text style={styles.viewBtnText}>View Content</Text>
                        <ChevronRight size={14} color={Colors.success} />
                      </Pressable>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [styles.purchaseBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                        onPress={() => handlePurchase(product)}
                      >
                        <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.purchaseBtnInner}>
                          <ShoppingCart size={15} color="#fff" />
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
              <View style={styles.emptyIconWrap}>
                <Star size={36} color={Colors.gold} />
              </View>
              <Text style={styles.emptyTitle}>Coming Soon</Text>
              <Text style={styles.emptyDesc}>Premium insights and readings are being prepared by our expert astrologers.</Text>
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

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8, marginBottom: 24 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.goldDim, alignItems: 'center', justifyContent: 'center' },

  loaderWrap: { alignItems: 'center', gap: 12, paddingTop: 60 },
  loaderText: { fontSize: 14, color: Colors.textMuted },

  productList: { gap: 14 },
  productCard: { gap: 14, overflow: 'hidden' },
  productAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  productHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  productIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  productIconUnlocked: { backgroundColor: Colors.successDim },
  productIconLocked: { backgroundColor: Colors.purpleDim },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  categoryText: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  productPrice: { fontSize: 20, fontWeight: '800', color: Colors.gold },
  unlockedBadge: { backgroundColor: Colors.successDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  unlockedText: { fontSize: 11, fontWeight: '700', color: Colors.success, textTransform: 'uppercase', letterSpacing: 0.5 },
  productDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, paddingLeft: 2 },

  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: Colors.successDim, borderRadius: 14, alignSelf: 'flex-start' },
  viewBtnText: { fontSize: 14, fontWeight: '600', color: Colors.success },
  purchaseBtn: { borderRadius: 14, overflow: 'hidden' },
  purchaseBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 8 },
  purchaseBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  emptyCard: { alignItems: 'center', paddingVertical: 50, gap: 14 },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.goldDim, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 21, paddingHorizontal: 20 },
});
