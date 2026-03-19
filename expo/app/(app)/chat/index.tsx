import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

interface Conversation {
  id: string;
  user_email: string;
  astrologer_id: string;
  created_at: string;
  astrologer?: {
    name: string;
    specialty: string;
    is_online: boolean;
    avatar_url: string | null;
  };
}

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const conversationsQuery = useQuery({
    queryKey: ['conversations', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      console.log('[Chat] Fetching conversations');
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*, astrologer:astrologers(*)')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false });
      if (error) { console.log('[Chat] Error:', error.message); return []; }
      return (data ?? []) as Conversation[];
    },
    enabled: !!user?.email,
  });

  const astrologersQuery = useQuery({
    queryKey: ['astrologers'],
    queryFn: async () => {
      console.log('[Chat] Fetching astrologers');
      const { data, error } = await supabase.from('astrologers').select('*').limit(20);
      if (error) { console.log('[Chat] Astrologers error:', error.message); return []; }
      return data ?? [];
    },
  });

  const conversations = conversationsQuery.data ?? [];

  const renderConversation = ({ item }: { item: Conversation }) => (
    <Pressable
      style={({ pressed }) => [styles.convCard, pressed && { opacity: 0.8 }]}
      onPress={() => router.push({ pathname: '/(app)/chat/[conversationId]', params: { conversationId: item.id, name: item.astrologer?.name ?? 'Astrologer' } })}
    >
      <View style={[styles.avatar, { backgroundColor: item.astrologer?.is_online ? Colors.purpleDim : Colors.bgCard }]}>
        <Text style={styles.avatarText}>{(item.astrologer?.name ?? 'A')[0]}</Text>
        {item.astrologer?.is_online && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.convInfo}>
        <Text style={styles.convName}>{item.astrologer?.name ?? 'Astrologer'}</Text>
        <Text style={styles.convSpecialty}>{item.astrologer?.specialty ?? ''}</Text>
      </View>
      <MessageCircle size={18} color={Colors.textMuted} />
    </Pressable>
  );

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
                {(astrologersQuery.data ?? []).slice(0, 5).map((a: { id: string; name: string; specialty: string; is_online: boolean }) => (
                  <Pressable key={a.id} style={({ pressed }) => [styles.astrologerCard, pressed && { opacity: 0.8 }]}>
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
  title: { fontSize: 28, fontWeight: '800' as const, color: Colors.textPrimary, paddingHorizontal: 20, marginTop: 8, marginBottom: 20 },
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
  avatarText: { fontSize: 18, fontWeight: '700' as const, color: Colors.purpleLight },
  onlineDot: { position: 'absolute' as const, bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.bg },
  convInfo: { flex: 1 },
  convName: { fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary },
  convSpecialty: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' as const },
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
  astrologerAvatarText: { fontSize: 16, fontWeight: '700' as const, color: Colors.purpleLight },
  astrologerInfo: { flex: 1 },
  astrologerName: { fontSize: 15, fontWeight: '700' as const, color: Colors.textPrimary },
  astrologerSpecialty: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
});
