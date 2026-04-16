import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, ChevronRight, Sparkles, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/GlassCard';

interface Astrologer {
  id: string;
  name: string;
  specialty: string;
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

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const startConversation = useMutation({
    mutationFn: async (astrologer: Astrologer) => {
      if (!user?.email) throw new Error('Not authenticated');
      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_email', user.email)
        .eq('astrologer_id', astrologer.id)
        .single();

      if (existing) return existing.id;

      const { data: newConv, error } = await supabase
        .from('chat_conversations')
        .insert({ user_email: user.email, astrologer_id: astrologer.id })
        .select('id')
        .single();
      if (error) throw error;
      return newConv!.id;
    },
    onSuccess: (convId: string, astrologer: Astrologer) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push({
        pathname: '/(app)/chat/[conversationId]',
        params: { conversationId: convId, name: astrologer.name },
      } as never);
    },
  });

  const handleOpenConversation = useCallback((conv: Conversation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const astrologer = getAstrologer(conv);
    router.push({
      pathname: '/(app)/chat/[conversationId]',
      params: { conversationId: conv.id, name: astrologer?.name ?? 'Astrologer' },
    } as never);
  }, [router]);

  const handleStartChat = useCallback((astrologer: Astrologer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    startConversation.mutate(astrologer);
  }, [startConversation]);

  const conversations = conversationsQuery.data ?? [];
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([conversationsQuery.refetch(), astrologersQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [conversationsQuery, astrologersQuery]);

  const renderConversation = ({ item }: { item: Conversation }) => {
    const astrologer = getAstrologer(item);
    const timeAgo = getTimeAgo(item.last_message_at);
    return (
      <Pressable
        style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        onPress={() => handleOpenConversation(item)}
      >
        <GlassCard variant="subtle" style={styles.convCard}>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={astrologer?.is_online ? [Colors.purple, Colors.indigoLight] : [Colors.bgCard, Colors.bgCard]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{(astrologer?.name ?? 'A')[0]}</Text>
            </LinearGradient>
            {astrologer?.is_online && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.convInfo}>
            <View style={styles.convTopRow}>
              <Text style={styles.convName}>{astrologer?.name ?? 'Astrologer'}</Text>
              {timeAgo ? <Text style={styles.convTime}>{timeAgo}</Text> : null}
            </View>
            <Text style={styles.convSpecialty} numberOfLines={1}>{astrologer?.specialty ?? ''}</Text>
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purple} />}
            ListFooterComponent={
              (astrologersQuery.data ?? []).length > 0 ? (
                <View style={styles.newChatSection}>
                  <Text style={styles.newChatLabel}>Start a new conversation</Text>
                  {(astrologersQuery.data ?? []).map((a) => (
                    <Pressable
                      key={a.id}
                      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                      onPress={() => handleStartChat(a)}
                      disabled={startConversation.isPending}
                    >
                      <GlassCard variant="subtle" style={styles.astrologerCard}>
                        <View style={styles.astrologerAvatar}>
                          <Text style={styles.astrologerAvatarText}>{a.name[0]}</Text>
                          {a.is_online && <View style={styles.onlineDotSmall} />}
                        </View>
                        <View style={styles.astrologerInfo}>
                          <Text style={styles.astrologerName}>{a.name}</Text>
                          <Text style={styles.astrologerSpecialty}>{a.specialty}</Text>
                        </View>
                        <View style={styles.chatIconWrap}>
                          <MessageCircle size={16} color={Colors.purpleLight} />
                        </View>
                      </GlassCard>
                    </Pressable>
                  ))}
                </View>
              ) : null
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Sparkles size={36} color={Colors.purpleLight} />
            </View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyDesc}>Start a chat with one of our expert astrologers</Text>

            {(astrologersQuery.data ?? []).length > 0 && (
              <View style={styles.astrologerList}>
                {(astrologersQuery.data ?? []).map((a) => (
                  <Pressable
                    key={a.id}
                    style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                    onPress={() => handleStartChat(a)}
                    disabled={startConversation.isPending}
                  >
                    <GlassCard variant="glow" glowColor={Colors.purple} style={styles.astrologerCardLarge}>
                      <LinearGradient
                        colors={[Colors.purple, Colors.indigoLight]}
                        style={styles.astrologerAvatarLarge}
                      >
                        <Text style={styles.astrologerAvatarLargeText}>{a.name[0]}</Text>
                      </LinearGradient>
                      <View style={styles.astrologerInfo}>
                        <Text style={styles.astrologerName}>{a.name}</Text>
                        <Text style={styles.astrologerSpecialty}>{a.specialty}</Text>
                        {a.is_online && (
                          <View style={styles.onlineLabel}>
                            <View style={styles.onlineDotInline} />
                            <Text style={styles.onlineLabelText}>Online</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.startChatBtn}>
                        <MessageCircle size={18} color="#fff" />
                      </View>
                    </GlassCard>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
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
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.success, borderWidth: 2.5, borderColor: Colors.bg },
  convInfo: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  convTime: { fontSize: 12, color: Colors.textMuted },
  convSpecialty: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },

  newChatSection: { marginTop: 24, gap: 8 },
  newChatLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  astrologerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  astrologerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.purpleDim, alignItems: 'center', justifyContent: 'center' },
  astrologerAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.purpleLight },
  onlineDotSmall: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.bg },
  astrologerInfo: { flex: 1 },
  astrologerName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  astrologerSpecialty: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  chatIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.purpleDim, alignItems: 'center', justifyContent: 'center' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.purpleDim, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  astrologerList: { width: '100%', marginTop: 28, gap: 10 },
  astrologerCardLarge: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  astrologerAvatarLarge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  astrologerAvatarLargeText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  onlineLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  onlineDotInline: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  onlineLabelText: { fontSize: 11, color: Colors.success, fontWeight: '600' },
  startChatBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.purple, alignItems: 'center', justifyContent: 'center' },
});
