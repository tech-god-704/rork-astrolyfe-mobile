import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import GlassCard from '@/components/GlassCard';
import { useThemedStyles } from '@/providers/ThemeProvider';

interface NotificationPromptModalProps {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

/**
 * Shown once, the first time a fresh sign-in lands on Home — see the
 * astrolyfe:pending_notif_prompt flag set by welcome-tour's finish() and consumed here.
 *
 * This is a soft pre-permission screen, not the OS dialog itself: iOS only allows the
 * real permission prompt to be shown once per install without the customer manually
 * re-enabling it in Settings, so asking blind on first launch risks burning that shot
 * on someone who was not yet expecting it.
 */
export default function NotificationPromptModal({ visible, onEnable, onDismiss }: NotificationPromptModalProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <GlassCard variant="elevated" style={styles.card}>
          <View style={styles.iconRing}>
            <Bell size={26} color={Colors.lavender} strokeWidth={1.8} />
          </View>
          <Text style={styles.title}>Never miss your horoscope</Text>
          <Text style={styles.copy}>
            Turn on a daily reminder and we'll nudge you the moment your reading is
            ready. You'll pick the exact time next.
          </Text>
          <Pressable
            onPress={onEnable}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Enable notifications"
          >
            <Text style={styles.primaryButtonText}>Enable Notifications</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Not now"
          >
            <Text style={styles.secondaryButtonText}>Not now</Text>
          </Pressable>
        </GlassCard>
      </View>
    </Modal>
  );
}

const createStyles = () => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%' as unknown as number,
    maxWidth: 360,
    alignItems: 'center',
    padding: 26,
  },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(150,98,198,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(192,154,235,0.4)',
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  copy: {
    fontFamily: Fonts.body,
    fontSize: 14.5,
    lineHeight: 21,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 22,
  },
  primaryButton: {
    width: '100%' as unknown as number,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lavender,
    marginBottom: 10,
  },
  primaryButtonText: {
    fontFamily: Fonts.body,
    fontSize: 15.5,
    fontWeight: '700' as const,
    color: Colors.black,
  },
  secondaryButton: {
    width: '100%' as unknown as number,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  buttonPressed: { opacity: 0.85 },
});
