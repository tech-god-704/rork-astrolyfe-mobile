import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'astrologer';
  sender_id: string;
  message: string;
  created_at: string;
}

export default function ChatConversationScreen() {
  const { conversationId, name } = useLocalSearchParams<{ conversationId: string; name: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState<string>('');
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const messagesQuery = useQuery({
    queryKey: ['chatMessages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) {
        console.log('[Chat] Messages error:', error.message);
        return [];
      }
      return (data ?? []) as ChatMessage[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        queryClient.setQueryData<ChatMessage[]>(['chatMessages', conversationId], (old) => {
          const newMsg = payload.new as ChatMessage;
          if (!old) return [newMsg];
          if (old.some((m) => m.id === newMsg.id)) return old;
          return [...old, newMsg];
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!conversationId || !user?.email) throw new Error('Missing context');
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_type: 'user',
        sender_id: user.email,
        message: text,
      });
      if (error) throw error;
      await supabase
        .from('chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
    // Optimistic update: show message immediately before server confirms
    onMutate: async (text: string) => {
      await queryClient.cancelQueries({ queryKey: ['chatMessages', conversationId] });
      const previous = queryClient.getQueryData<ChatMessage[]>(['chatMessages', conversationId]);

      const optimisticMsg: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        conversation_id: conversationId!,
        sender_type: 'user',
        sender_id: user?.email ?? '',
        message: text,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatMessage[]>(
        ['chatMessages', conversationId],
        (old) => [...(old ?? []), optimisticMsg],
      );

      setMessageText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      return { previous };
    },
    onError: (error: Error, _text, context) => {
      // Rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(['chatMessages', conversationId], context.previous);
      }
      console.log('[Chat] Send error:', error.message);
      Alert.alert('Send Failed', 'Could not send your message. Please try again.');
    },
    onSettled: () => {
      // Invalidate conversations list to update last_message_at
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = useCallback(() => {
    const text = messageText.trim();
    if (!text) return;
    sendMutation.mutate(text);
  }, [messageText, sendMutation]);

  const messages = messagesQuery.data ?? [];

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.sender_type === 'user';
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showTimestamp = !prevMsg || item.sender_type !== prevMsg.sender_type;

    return (
      <View style={[styles.messageWrap, isUser ? styles.userWrap : styles.astrologerWrap]}>
        {!isUser && showTimestamp && (
          <View style={styles.astrologerLabel}>
            <View style={styles.astrologerDot}>
              <Text style={styles.astrologerDotText}>{(name ?? 'A')[0]}</Text>
            </View>
            <Text style={styles.astrologerNameText}>{name ?? 'Astrologer'}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.astrologerBubble]}>
          {isUser && (
            <LinearGradient
              colors={[Colors.purple, Colors.indigoLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <Text style={[styles.messageText, isUser ? styles.userText : styles.astrologerText]}>
            {item.message}
          </Text>
        </View>
        <Text style={[styles.messageTime, isUser ? styles.userTime : styles.astrologerTime]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <Stack.Screen
        options={{
          headerTitle: name || 'Chat',
          headerStyle: { backgroundColor: Colors.gradientStart },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        {messagesQuery.isLoading ? (
          <ActivityIndicator color={Colors.purple} style={styles.loader} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <View style={styles.emptyChatIcon}>
                  <Text style={styles.emptyChatEmoji}>✨</Text>
                </View>
                <Text style={styles.emptyChatTitle}>Start a conversation</Text>
                <Text style={styles.emptyChatText}>Ask about your horoscope, natal chart, or cosmic guidance</Text>
              </View>
            }
          />
        )}
        <View style={styles.inputRow}>
          <View style={styles.textInputWrap}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={Colors.textMuted}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
            />
          </View>
          <Pressable
            style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }, !messageText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!messageText.trim() || sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <LinearGradient colors={[Colors.purple, Colors.indigoLight]} style={styles.sendBtnGradient}>
                <Send size={18} color="#fff" />
              </LinearGradient>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  loader: { marginTop: 40 },
  messageList: { paddingHorizontal: 16, paddingVertical: 16, gap: 2, flexGrow: 1 },

  messageWrap: { marginBottom: 6 },
  userWrap: { alignItems: 'flex-end' },
  astrologerWrap: { alignItems: 'flex-start' },

  astrologerLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 4 },
  astrologerDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.purpleDim, alignItems: 'center', justifyContent: 'center' },
  astrologerDotText: { fontSize: 10, fontWeight: '700', color: Colors.purpleLight },
  astrologerNameText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },

  messageBubble: { maxWidth: '80%' as unknown as number, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, overflow: 'hidden' },
  userBubble: { borderBottomRightRadius: 6 },
  astrologerBubble: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.bgCardBorder, borderBottomLeftRadius: 6 },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  astrologerText: { color: Colors.textPrimary },
  messageTime: { fontSize: 10, color: Colors.textMuted, marginTop: 3, marginHorizontal: 8 },
  userTime: { alignSelf: 'flex-end' },
  astrologerTime: { alignSelf: 'flex-start' },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  emptyChatIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.purpleDim, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyChatEmoji: { fontSize: 28 },
  emptyChatTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyChatText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(13,13,34,0.95)',
  },
  textInputWrap: {
    flex: 1,
    backgroundColor: Colors.bgInput,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.bgInputBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  sendBtn: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden' },
  sendBtnGradient: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.3 },
});
