import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, ChevronRight, Sparkles, Star, Clock, Award, BadgeCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/GlassCard';

interface Astrologer {
  id: string;
  name: string | null;
  specialty: string | null;
  avatar_url: string | null;
  is_online: boolean;
  is_active: boolean;
  sort_order: number;
}

interface Conversation {
  id: string;
  user_email: string;
  astrologer_id: string;
  last_message_at: string | null;
  astrologers?: Astrologer | Astrologer[];
}

interface AstrologerProfile {
  title: string;
  bio: string;
  tags: string[];
  years: number;
  rating: number;
  gradientColors: [string, string];
  symbol: string;
}

const SPECIALTY_PROFILES: Record<string, AstrologerProfile> = {
  'natal chart': {
    title: 'Natal Chart Specialist',
    bio: 'Expert in birth chart interpretation, revealing your cosmic blueprint and life purpose through planetary alignments.',
    tags: ['Birth Charts', 'Life Path', 'Planetary Aspects'],
    years: 12,
    rating: 4.9,
    gradientColors: ['#7C3AED', '#4F46E5'],
    symbol: '♄',
  },
  'love': {
    title: 'Love & Relationships Expert',
    bio: 'Specializing in romantic compatibility, Venus transits, and relationship timing to guide your heart\'s journey.',
    tags: ['Synastry', 'Venus Returns', 'Soulmates'],
    years: 15,
    rating: 4.8,
    gradientColors: ['#EC4899', '#F472B6'],
    symbol: '♀',
  },
  'relationship': {
    title: 'Relationship Astrologer',
    bio: 'Deep expertise in synastry charts, composite readings, and understanding the cosmic dynamics between partners.',
    tags: ['Compatibility', 'Composite Charts', 'Timing'],
    years: 14,
    rating: 4.8,
    gradientColors: ['#EC4899', '#A855F7'],
    symbol: '♀',
  },
  'career': {
    title: 'Career & Finance Astrologer',
    bio: 'Guiding professionals through career transitions using midheaven analysis, Saturn returns, and financial astrology.',
    tags: ['Midheaven', 'Saturn Return', 'Prosperity'],
    years: 10,
    rating: 4.7,
    gradientColors: ['#F59E0B', '#EF4444'],
    symbol: '♃',
  },
  'tarot': {
    title: 'Tarot & Intuitive Reader',
    bio: 'Blending traditional tarot wisdom with astrological transits for deeply intuitive and actionable guidance.',
    tags: ['Tarot Spreads', 'Intuitive Reading', 'Divination'],
    years: 18,
    rating: 4.9,
    gradientColors: ['#8B5CF6', '#6366F1'],
    symbol: '☽',
  },
  'vedic': {
    title: 'Vedic Astrology Master',
    bio: 'Trained in Jyotish tradition, offering precise dasha predictions, gemstone recommendations, and karmic insights.',
    tags: ['Jyotish', 'Dasha System', 'Karma'],
    years: 20,
    rating: 5.0,
    gradientColors: ['#F59E0B', '#D97706'],
    symbol: '☿',
  },
  'transit': {
    title: 'Transit & Forecast Specialist',
    bio: 'Tracking planetary movements to help you navigate upcoming opportunities, challenges, and transformative periods.',
    tags: ['Transits', 'Forecasting', 'Timing'],
    years: 11,
    rating: 4.7,
    gradientColors: ['#06B6D4', '#3B82F6'],
    symbol: '♅',
  },
  'spiritual': {
    title: 'Spiritual Astrologer',
    bio: 'Connecting celestial wisdom with spiritual growth, past-life insights, and soul evolution through the stars.',
    tags: ['Soul Purpose', 'Past Lives', 'Nodes'],
    years: 16,
    rating: 4.9,
    gradientColors: ['#A855F7', '#7C3AED'],
    symbol: '♆',
  },
  'moon': {
    title: 'Lunar Cycle Expert',
    bio: 'Harnessing the power of lunar phases and eclipses for manifestation, emotional healing, and personal growth.',
    tags: ['Moon Phases', 'Eclipses', 'Manifestation'],
    years: 9,
    rating: 4.8,
    gradientColors: ['#6366F1', '#818CF8'],
    symbol: '☽',
  },
};

const DEFAULT_PROFILE: AstrologerProfile = {
  title: 'Professional Astrologer',
  bio: 'Offering personalized astrological guidance with deep knowledge of planetary influences and cosmic cycles.',
  tags: ['Horoscopes', 'Readings', 'Guidance'],
  years: 10,
  rating: 4.8,
  gradientColors: ['#7C3AED', '#6366F1'],
  symbol: '✧',
};

function getAstrologerProfile(specialty?: string | null): AstrologerProfile {
  if (!specialty) return DEFAULT_PROFILE;
  const lower = specialty.toLowerCase();
  for (const [key, profile] of Object.entries(SPECIALTY_PROFILES)) {
    if (lower.includes(key)) return profile;
  }
  return {
    ...DEFAULT_PROFILE,
    title: specialty,
  };
}

function getAstrologer(conv: Conversation): Astrologer | null {
  const a = conv.astrologers;
  if (!a) return null;
  return Array.isArray(a) ? a[0] ?? null : a;
}

function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <View style={styles.ratingRow}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={11}
          color={Colors.gold}
          fill={i < full || (i === full && hasHalf) ? Colors.gold : 'none'}
        />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function AstrologerCardLarge({ astrologer, onPress, disabled }: {
  astrologer: Astrologer;
  onPress: () => void;
  disabled: boolean;
}) {
  const profile = getAstrologerProfile(astrologer.specialty);

  return (
    <Pressable
      style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
      onPress={onPress}
      disabled={disabled}
    >
      <GlassCard variant="elevated" style={styles.expertCard}>
        <View style={styles.expertHeader}>
          <View style={styles.expertAvatarWrap}>
            <LinearGradient
              colors={profile.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.expertAvatar}
            >
              <Text style={styles.expertAvatarSymbol}>{profile.symbol}</Text>
            </LinearGradient>
            {astrologer.is_online && (
              <View style={styles.onlineBadge}>
                <View style={styles.onlinePulse} />
              </View>
            )}
          </View>

          <View style={styles.expertHeaderInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.expertName} numberOfLines={1}>{astrologer.name ?? 'Astrologer'}</Text>
              <BadgeCheck size={14} color={Colors.purpleLight} />
            </View>
            <Text style={styles.expertTitle} numberOfLines={1}>{profile.title}</Text>
            <View style={styles.metaRow}>
              <StarRating rating={profile.rating} />
              <View style={styles.metaDivider} />
              <Clock size={11} color={Colors.textMuted} />
              <Text style={styles.metaText}>{profile.years}+ yrs</Text>
            </View>
          </View>
        </View>

        <Text style={styles.expertBio} numberOfLines={2}>{profile.bio}</Text>

        <View style={styles.tagsRow}>
          {profile.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: `${profile.gradientColors[0]}15` }]}>
              <Text style={[styles.tagText, { color: profile.gradientColors[0] }]}>{tag}</Text>
            </View>
          ))}
        </View>

        <View style={styles.expertFooter}>
          {astrologer.is_online ? (
            <View style={styles.statusOnline}>
              <View style={styles.statusDotOnline} />
              <Text style={styles.statusTextOnline}>Available Now</Text>
            </View>
          ) : (
            <View style={styles.statusOffline}>
              <View style={styles.statusDotOffline} />
              <Text style={styles.statusTextOffline}>Away</Text>
            </View>
          )}

          <LinearGradient
            colors={profile.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.consultBtn}
          >
            <MessageCircle size={15} color="#fff" />
            <Text style={styles.consultBtnText}>Consult</Text>
          </LinearGradient>
        </View>
      </GlassCard>
    </Pressable>
  );
}

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();


  const conversationsQuery = useQuery({
    queryKey: ['conversations', user?.email],
    staleTime: 1000 * 30,
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*, astrologers(name, avatar_url, is_online, specialty)')
        .eq('user_email', user.email)
        .order('last_message_at', { ascending: false });
      if (error) {
        console.log('[Chat] Error:', error.message);
        return [];
      }
      return (data ?? []) as Conversation[];
    },
    enabled: !!user?.email,
  });

  const astrologersQuery = useQuery({
    queryKey: ['astrologers'],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('astrologers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) {
        console.log('[Chat] Astrologers error:', error.message);
        return [];
      }
      return (data ?? []) as Astrologer[];
    },
  });

  useEffect(() => {
    if (!user?.email) return;
    const channel = supabase
      .channel('conversations-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_conversations',
      }, () => {
        void conversationsQuery.refetch();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('[Chat] Realtime subscription failed, falling back to polling');
          const interval = setInterval(() => { void conversationsQuery.refetch(); }, 30000);
          channel.unsubscribe();
          setTimeout(() => clearInterval(interval), 300000);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.email]);

  const openThread = useCallback((conversationId: string, astrologer: Astrologer | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({
      pathname: '/chat/[conversationId]',
      params: {
        conversationId,
        name: astrologer?.name ?? 'Astrologer',
        specialty: astrologer?.specialty ?? '',
      },
    } as never);
  }, [router]);

  const handleStartChat = useCallback((astrologer: Astrologer) => {
    openThread(astrologer.id || `astro-${Date.now()}`, astrologer);
  }, [openThread]);

  const conversations = conversationsQuery.data ?? [];
  const astrologers = useMemo(() => astrologersQuery.data ?? [], [astrologersQuery.data]);

  const onRefresh = useCallback(async () => {
    await conversationsQuery.refetch();
    if (astrologersQuery.isStale) {
      await astrologersQuery.refetch();
    }
  }, [conversationsQuery, astrologersQuery]);

  const renderConversation = ({ item }: { item: Conversation }) => {
    const astrologer = getAstrologer(item);
    const timeAgo = getTimeAgo(item.last_message_at);
    const profile = getAstrologerProfile(astrologer?.specialty);

    return (
      <Pressable
        style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        onPress={() => openThread(item.id, astrologer)}
      >
        <GlassCard variant="subtle" style={styles.convCard}>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={astrologer?.is_online ? profile.gradientColors : [Colors.bgCard, Colors.bgCard]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarSymbol}>{profile.symbol}</Text>
            </LinearGradient>
            {astrologer?.is_online && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.convInfo}>
            <View style={styles.convTopRow}>
              <View style={styles.convNameRow}>
                <Text style={styles.convName} numberOfLines={1}>{astrologer?.name ?? 'Astrologer'}</Text>
                <BadgeCheck size={12} color={Colors.purpleLight} />
              </View>
              {timeAgo ? <Text style={styles.convTime}>{timeAgo}</Text> : null}
            </View>
            <Text style={styles.convTitle} numberOfLines={1}>{profile.title}</Text>
          </View>
          <ChevronRight size={16} color={Colors.textMuted} />
        </GlassCard>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text style={styles.title}>Messages</Text>

        {conversationsQuery.isLoading ? (
          <ActivityIndicator color={Colors.purple} style={styles.loader} />
        ) : conversations.length > 0 ? (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversation}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={conversationsQuery.isRefetching} onRefresh={onRefresh} tintColor={Colors.purple} />}
            ListFooterComponent={
              astrologers.length > 0 ? (
                <View style={styles.newChatSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Award size={14} color={Colors.gold} />
                    <Text style={styles.sectionHeaderText}>Our Expert Astrologers</Text>
                  </View>
                  <Text style={styles.sectionSubtext}>Start a new consultation</Text>
                  {astrologers.map((a) => (
                    <AstrologerCardLarge
                      key={a.id}
                      astrologer={a}
                      onPress={() => handleStartChat(a)}
                      disabled={false}
                    />
                  ))}
                </View>
              ) : null
            }
          />
        ) : (
          <FlatList
            data={astrologers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.emptyListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={conversationsQuery.isRefetching} onRefresh={onRefresh} tintColor={Colors.purple} />}
            ListHeaderComponent={
              <View style={styles.emptyHeader}>
                <View style={styles.emptyIconWrap}>
                  <LinearGradient
                    colors={[Colors.purple, Colors.indigoLight]}
                    style={styles.emptyIconGradient}
                  >
                    <Sparkles size={32} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.emptyTitle}>Your Cosmic Guides Await</Text>
                <Text style={styles.emptyDesc}>
                  Connect with expert astrologers for personalized readings, chart interpretations, and celestial guidance.
                </Text>

                <View style={styles.trustRow}>
                  <View style={styles.trustItem}>
                    <BadgeCheck size={14} color={Colors.purpleLight} />
                    <Text style={styles.trustText}>Verified Experts</Text>
                  </View>
                  <View style={styles.trustDivider} />
                  <View style={styles.trustItem}>
                    <Star size={14} color={Colors.gold} fill={Colors.gold} />
                    <Text style={styles.trustText}>Top Rated</Text>
                  </View>
                  <View style={styles.trustDivider} />
                  <View style={styles.trustItem}>
                    <MessageCircle size={14} color={Colors.teal} />
                    <Text style={styles.trustText}>Private Chat</Text>
                  </View>
                </View>
              </View>
            }
            renderItem={({ item: a }) => (
              <AstrologerCardLarge
                astrologer={a}
                onPress={() => handleStartChat(a)}
                disabled={false}
              />
            )}
            ListEmptyComponent={
              !astrologersQuery.isLoading ? (
                <View style={styles.noAstrologers}>
                  <Text style={styles.noAstrologersText}>No astrologers available right now. Check back soon!</Text>
                </View>
              ) : (
                <ActivityIndicator color={Colors.purple} style={styles.loader} />
              )
            }
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, paddingHorizontal: 20, marginTop: 8, marginBottom: 20, letterSpacing: -0.5 },
  loader: { marginTop: 40 },
  listContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 100 },
  emptyListContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Conversation cards
  convCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarSymbol: { fontSize: 22, color: '#fff' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.success, borderWidth: 2.5, borderColor: Colors.bg },
  convInfo: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  convName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  convTime: { fontSize: 12, color: Colors.textMuted },
  convTitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },

  // Section headers
  newChatSection: { marginTop: 28, gap: 10, marginBottom: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionHeaderText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.2 },
  sectionSubtext: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },

  // Expert card (large astrologer card)
  expertCard: { padding: 18, gap: 14 },
  expertHeader: { flexDirection: 'row', gap: 14 },
  expertAvatarWrap: { position: 'relative' },
  expertAvatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  expertAvatarSymbol: { fontSize: 26, color: '#fff' },
  onlineBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.success,
    borderWidth: 2.5, borderColor: Colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  onlinePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  expertHeaderInfo: { flex: 1, justifyContent: 'center', gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  expertName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.2 },
  expertTitle: { fontSize: 13, color: Colors.purpleLight, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaDivider: { width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  metaText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },

  // Rating
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 11, color: Colors.gold, fontWeight: '700', marginLeft: 3 },

  // Bio & tags
  expertBio: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: '600' },

  // Footer
  expertFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusOnline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDotOnline: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.success },
  statusTextOnline: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  statusOffline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDotOffline: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.textMuted },
  statusTextOffline: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  consultBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14 },
  consultBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Empty state
  emptyHeader: { alignItems: 'center', paddingTop: 20, paddingBottom: 28, gap: 10 },
  emptyIconWrap: { marginBottom: 8 },
  emptyIconGradient: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3 },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, paddingHorizontal: 16 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingHorizontal: 8 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.1)' },
  trustText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },

  // No astrologers
  noAstrologers: { alignItems: 'center', paddingVertical: 40 },
  noAstrologersText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
