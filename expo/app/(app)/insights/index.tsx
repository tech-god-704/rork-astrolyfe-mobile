import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl, Modal, Image, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Lock, Unlock, BookOpen, ShoppingCart, Sparkles, Star, ChevronRight, X, Compass, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { fetchProducts, fetchUnlockedSlugs, type Product } from '@/services/purchases';
import { fetchUserReports, REPORT_META, type UserReport } from '@/services/reports';
import GlassCard from '@/components/GlassCard';
import AppBackground from '@/components/AppBackground';
import { useThemedStyles } from '@/providers/ThemeProvider';

const WEB_CHECKOUT_URL = 'https://soulmate.astrolyfe.co';

export default function InsightsScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [viewingReport, setViewingReport] = useState<UserReport | null>(null);

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 60,
  });

  const unlockedQuery = useQuery({
    queryKey: ['unlockedSlugs', user?.email],
    queryFn: () => fetchUnlockedSlugs(user!.email!),
    enabled: !!user?.email,
    staleTime: 1000 * 30,
  });

  const reportsQuery = useQuery({
    queryKey: ['userReports', user?.email],
    queryFn: () => fetchUserReports(user!.email!),
    enabled: !!user?.email,
    staleTime: 1000 * 60 * 2,
  });

  // This screen is a catalog of reports to unlock. The live products collection
  // currently holds exactly one row — "SoulSketch 7-Day Trial", category
  // "subscription" — which is the entry ticket a customer already paid to be looking
  // at this screen at all, not a report. Listing it here showed it as permanently
  // locked and buyable to customers who were already paying subscribers: nothing
  // ever writes to the purchases collection this screen checks for unlock status
  // (the real webhook updates users/profiles directly), so it could never have shown
  // as owned for anyone. Filtering by category is future-proof against another
  // subscription-tier row being added later, not just this one slug.
  const products = (productsQuery.data ?? []).filter((product) => product.category !== 'subscription');
  const unlockedSlugs = unlockedQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const unlockedCount = isAdmin ? products.length : products.filter((product) => unlockedSlugs.includes(product.slug)).length;
  const collectionProgress = products.length > 0 ? Math.round((unlockedCount / products.length) * 100) : 0;

  // Map product slugs to their web-generated report content
  const reportBySlug = new Map<string, UserReport>();
  for (const r of reports) {
    // Match report_type to product slug (e.g. 'full_map' → 'full_map')
    reportBySlug.set(r.report_type, r);
  }

  const handlePurchase = useCallback(async (product: Product) => {
    if (!user?.email) {
      Alert.alert('Sign In Required', 'Please sign in to purchase insights.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    Alert.alert(
      'Complete your secure checkout',
      `Finish your ${product.name} purchase securely on the SoulSketch website. Your access will appear here after payment is confirmed.`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Continue securely',
          onPress: () => {
            void Linking.openURL(WEB_CHECKOUT_URL).catch(() => {
              Alert.alert('Unable to Open Checkout', 'Please visit soulmate.astrolyfe.co in your browser to continue securely.');
            });
          },
        },
      ],
    );
  }, [user]);

  const onRefresh = useCallback(() => {
    void productsQuery.refetch();
    void unlockedQuery.refetch();
    void reportsQuery.refetch();
  }, [productsQuery, unlockedQuery, reportsQuery]);

  return (
    <View style={styles.container}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={productsQuery.isRefetching} onRefresh={onRefresh} tintColor={Colors.purple} />}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>EXPLORE YOUR UNIVERSE</Text>
              <Text style={styles.title}>Cosmic Insights</Text>
              <Text style={styles.subtitle}>Deep-dive reports built from your cosmic profile.</Text>
            </View>
            <View style={styles.headerIcon}>
              <Sparkles size={24} color={Colors.gold} />
            </View>
          </View>

          <LinearGradient
            colors={[Colors.deepViolet, 'rgba(59,33,113,0.76)', Colors.bgCardSolid]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.toolkitHero}
          >
            <View style={styles.toolkitTop}>
              <View>
                <Text style={styles.toolkitEyebrow}>YOUR COSMIC TOOLKIT</Text>
                <Text style={styles.toolkitTitle}>{unlockedCount} insight{unlockedCount === 1 ? '' : 's'} unlocked</Text>
              </View>
              <View style={styles.reportCount}>
                <BookOpen size={14} color={Colors.lavenderIce} />
                <Text style={styles.reportCountText}>{reports.length > 0 ? `${reports.length} ready` : 'Generating'}</Text>
              </View>
            </View>
            <Text style={styles.toolkitText}>Build a deeper picture of your patterns, relationships, and timing.</Text>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={[Colors.nebulaMagenta, Colors.electricBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${collectionProgress}%` as unknown as number }]}
              />
            </View>
            <Text style={styles.progressText}>{collectionProgress}% of your available library explored</Text>
          </LinearGradient>

          <Text style={styles.sectionLabel}>Core tools</Text>
          <View style={styles.discoveryRow}>
            <Pressable style={({ pressed }) => [styles.discoveryCard, pressed && styles.cardPressed]} onPress={() => router.push('/(app)/chart')} accessibilityRole="button" accessibilityLabel="Open your birth chart">
              <Compass size={20} color={Colors.gold} />
              <View style={styles.discoveryCopy}>
                <Text style={styles.discoveryTitle}>Birth chart</Text>
                <Text style={styles.discoveryText}>Read your placements</Text>
              </View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </Pressable>
            <Pressable style={({ pressed }) => [styles.discoveryCard, pressed && styles.cardPressed]} onPress={() => router.push('/(app)/compatibility')} accessibilityRole="button" accessibilityLabel="Open compatibility">
              <Heart size={20} color={Colors.accent} />
              <View style={styles.discoveryCopy}>
                <Text style={styles.discoveryTitle}>Compatibility</Text>
                <Text style={styles.discoveryText}>Compare your rhythms</Text>
              </View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Personal reports</Text>
          {productsQuery.isLoading ? (
            <View style={styles.loaderWrap} accessibilityLiveRegion="polite">
              <ActivityIndicator color={Colors.purple} />
              <Text style={styles.loaderText}>Loading your insights…</Text>
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
                          const report = reportBySlug.get(product.slug);
                          if (report) {
                            setViewingReport(report);
                          } else {
                            Alert.alert(
                              product.name,
                              'Your report is being prepared. Check back here soon—your private content will appear in My Insights when it is ready.',
                            );
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${reportBySlug.has(product.slug) ? 'Read' : 'View'} ${product.name}`}
                      >
                        <BookOpen size={14} color={Colors.success} />
                        <Text style={styles.viewBtnText}>
                          {reportBySlug.has(product.slug) ? 'Read Report' : 'View Content'}
                        </Text>
                        <ChevronRight size={14} color={Colors.success} />
                      </Pressable>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [styles.purchaseBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                        onPress={() => handlePurchase(product)}
                        accessibilityRole="button"
                        accessibilityLabel={`Unlock ${product.name} for ${product.price} dollars`}
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

      {/* Report Viewer Modal */}
      <Modal visible={!!viewingReport} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setViewingReport(null)}>
        <View style={styles.modalContainer}>
          <AppBackground quiet />
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>
                  {viewingReport ? (REPORT_META[viewingReport.report_type]?.title ?? 'Report') : ''}
                </Text>
              </View>
              <Pressable style={({ pressed }) => [styles.modalClose, pressed && styles.cardPressed]} onPress={() => setViewingReport(null)} accessibilityRole="button" accessibilityLabel="Close report">
                <X size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {viewingReport && (
                <GlassCard style={styles.reportCard}>
                  {viewingReport.report_type === 'soulmate_portrait' ? (
                    // The portrait row carries a single <img> tag, so the text
                    // renderer below strips it to an empty string. Pull the src out
                    // and show the image itself.
                    (() => {
                      const src = extractImageSrc(viewingReport.content_html);
                      return src ? (
                        <Image
                          source={{ uri: src }}
                          style={styles.portraitImage}
                          resizeMode="contain"
                          accessibilityLabel="Your soulmate portrait"
                        />
                      ) : (
                        <Text style={styles.reportContent}>
                          Your portrait is still being created. Check back in a moment.
                        </Text>
                      );
                    })()
                  ) : (
                    <Text style={styles.reportContent}>
                      {stripHtml(viewingReport.content_html)}
                    </Text>
                  )}
                </GlassCard>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

/** Strip HTML tags for plain-text display (reports come as HTML from the web) */
/**
 * Pull the src out of the portrait row's <img> tag.
 *
 * The URL is absolute and carries an HMAC key rather than an email, so it is safe to
 * hand to <Image> directly.
 */
function extractImageSrc(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8, marginBottom: 24, gap: 12 },
  eyebrow: { color: Colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.55, marginBottom: 6 },
  title: { fontSize: 36, fontFamily: Fonts.display, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -1 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  headerIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: Colors.bgCardBorder, backgroundColor: Colors.goldDim, alignItems: 'center', justifyContent: 'center' },
  toolkitHero: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(192,154,235,0.26)', padding: 20, marginBottom: 28, overflow: 'hidden' },
  toolkitTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  toolkitEyebrow: { color: Colors.purpleLight, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
  toolkitTitle: { color: Colors.textPrimary, fontSize: 21, fontWeight: '800', letterSpacing: -0.35 },
  reportCount: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(237,228,253,0.09)' },
  reportCountText: { color: Colors.lavenderIce, fontSize: 10, fontWeight: '800' },
  toolkitText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 13, maxWidth: 310 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(237,228,253,0.10)', overflow: 'hidden', marginTop: 18 },
  progressFill: { height: 5, borderRadius: 3 },
  progressText: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 8 },
  sectionLabel: { color: Colors.textPrimary, fontFamily: Fonts.display, fontSize: 22, fontWeight: '800', letterSpacing: -0.45, marginBottom: 12 },
  discoveryRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  discoveryCard: { flex: 1, minHeight: 112, borderWidth: 1, borderColor: Colors.bgCardBorder, borderRadius: 18, backgroundColor: 'rgba(218,200,242,0.035)', justifyContent: 'center', gap: 10, padding: 14 },
  discoveryCopy: { flex: 1 },
  discoveryTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '800' },
  discoveryText: { color: Colors.textMuted, fontSize: 12, marginTop: 3 },

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
  productName: { fontSize: 18, fontFamily: Fonts.display, fontWeight: '800', color: Colors.textPrimary },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  categoryText: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  productPrice: { fontSize: 20, fontWeight: '800', color: Colors.gold },
  unlockedBadge: { backgroundColor: Colors.successDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  unlockedText: { fontSize: 11, fontWeight: '700', color: Colors.success, textTransform: 'uppercase', letterSpacing: 0.5 },
  productDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },

  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: Colors.successDim, borderRadius: 14, alignSelf: 'flex-start' },
  viewBtnText: { fontSize: 14, fontWeight: '600', color: Colors.success },
  purchaseBtn: { borderRadius: 14, overflow: 'hidden' },
  purchaseBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 8 },
  purchaseBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  emptyCard: { alignItems: 'center', paddingVertical: 50, gap: 14 },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.goldDim, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },

  // Report viewer modal
  modalContainer: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.bgCardBorder, gap: 12 },
  modalTitleWrap: { flex: 1 },
  modalTitle: { fontSize: 20, fontFamily: Fonts.display, fontWeight: '800', color: Colors.textPrimary },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },
  reportCard: { padding: 20 },
  portraitImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  reportContent: { fontSize: 17, fontFamily: Fonts.display, color: Colors.textSecondary, lineHeight: 29 },
});
