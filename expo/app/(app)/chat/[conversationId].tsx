import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react-native';
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
      // Update last_message_at on the conversation
      await supabase
        .from('chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
    onSuccess: () => {
      setMessageText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    onError: (error: Error) => {
      console.log('[Chat] Send error:', error.message);
    },
  });

  const handleSend = useCallback(() => {
    const text = messageText.trim();
    if (!text) return;
    sendMutation.mutate(text);
  }, [messageText, sendMutation]);

  const messages = messagesQuery.data ?? [];

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender_type === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.astrologerBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.astrologerText]}>
          {item.message}
        </Text>
        <Text style={styles.messageTime}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerTitle: name || 'Chat' }} />
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
                <Text style={styles.emptyChatText}>Start a conversation...</Text>
              </View>
            }
          />
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
          <Pressable
            style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.7 }, !messageText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!messageText.trim() || sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Send size={20} color="#fff" />
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
  messageList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexGrow: 1 },
  messageBubble: { maxWidth: '80%' as unknown as number, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, marginBottom: 4 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.purple, borderBottomRightRadius: 4 },
  astrologerBubble: { alignSelf: 'flex-start', backgroundColor: Colors.bgCard, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#fff' },
  astrologerText: { color: Colors.textPrimary },
  messageTime: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4, alignSelf: 'flex-end' },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyChatText: { fontSize: 15, color: Colors.textMuted },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0d0d22',
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.bgInput,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.bgInputBorder,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.purple, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
