import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

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

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ['conversations', user?.email],
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

  const startConversation = useMutation({
    mutationFn: async (astrologer: Astrologer) => {
      if (!user?.email) throw new Error('Not authenticated');
      // Check if conversation already exists
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

  const renderConversation = ({ item }: { item: Conversation }) => {
    const astrologer = getAstrologer(item);
    return (
      <Pressable
        style={({ pressed }) => [styles.convCard, pressed && { opacity: 0.8 }]}
        onPress={() => handleOpenConversation(item)}
      >
        <View style={[styles.avatar, { backgroundColor: astrologer?.is_online ? Colors.purpleDim : Colors.bgCard }]}>
          <Text style={styles.avatarText}>{(astrologer?.name ?? 'A')[0]}</Text>
          {astrologer?.is_online && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.convInfo}>
          <Text style={styles.convName}>{astrologer?.name ?? 'Astrologer'}</Text>
          <Text style={styles.convSpecialty}>{astrologer?.specialty ?? ''}</Text>
        </View>
        <MessageCircle size={18} color={Colors.textMuted} />
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a103d', '#120d2e', '#0a0a1a']} style={StyleSheet.absoluteFillObject} />
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
          />
        ) : (
          <View style={styles.emptyState}>
            <MessageCircle size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyDesc}>Start a chat with one of our astrologers</Text>

            {(astrologersQuery.data ?? []).length > 0 && (
              <View style={styles.astrologerList}>
                {(astrologersQuery.data ?? []).map((a) => (
                  <Pressable
                    key={a.id}
                    style={({ pressed }) => [styles.astrologerCard, pressed && { opacity: 0.8 }]}
                    onPress={() => handleStartChat(a)}
                    disabled={startConversation.isPending}
                  >
                    <View style={styles.astrologerAvatar}>
                      <Text style={styles.astrologerAvatarText}>{a.name[0]}</Text>
                      {a.is_online && <View style={styles.onlineDot} />}
                    </View>
                    <View style={styles.astrologerInfo}>
                      <Text style={styles.astrologerName}>{a.name}</Text>
                      <Text style={styles.astrologerSpecialty}>{a.specialty}</Text>
                    </View>
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
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, paddingHorizontal: 20, marginTop: 8, marginBottom: 20 },
  loader: { marginTop: 40 },
  listContent: { paddingHorizontal: 20, gap: 10 },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    padding: 16,
    gap: 14,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.purpleLight },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.bg },
  convInfo: { flex: 1 },
  convName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  convSpecialty: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  astrologerList: { width: '100%', marginTop: 24, gap: 10 },
  astrologerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    padding: 14,
    gap: 12,
  },
  astrologerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.purpleDim, alignItems: 'center', justifyContent: 'center' },
  astrologerAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.purpleLight },
  astrologerInfo: { flex: 1 },
  astrologerName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  astrologerSpecialty: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
});
