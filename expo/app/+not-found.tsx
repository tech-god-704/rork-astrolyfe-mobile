import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppBackground from '@/components/AppBackground';
import BrandMark from '@/components/BrandMark';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useThemedStyles } from '@/providers/ThemeProvider';

export default function NotFoundScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppBackground />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.markWrap}>
            <BrandMark size={92} />
          </View>
          <View style={styles.kickerRow}>
            <Sparkles size={13} color={Colors.lavenderIce} />
            <Text style={styles.kicker}>LOST IN THE COSMOS</Text>
          </View>
          <Text style={styles.title}>This path isn&apos;t in your chart.</Text>
          <Text style={styles.message}>
            The page may have moved, but your cosmic profile and readings are still right where you left them.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => router.replace('/')}
            accessibilityRole="button"
            accessibilityLabel="Return to AstroLyfe"
          >
            <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonInner}>
              <ArrowLeft size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Return to AstroLyfe</Text>
            </LinearGradient>
          </Pressable>
        </View>
        <Text style={styles.meta}>ASTROLYFE · 404</Text>
      </SafeAreaView>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  content: { alignItems: 'center' },
  markWrap: { marginBottom: 24 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 13 },
  kicker: { color: Colors.purpleLight, fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  title: { color: Colors.textPrimary, fontFamily: Fonts.display, fontSize: 36, fontWeight: '800', lineHeight: 41, letterSpacing: -1, textAlign: 'center' },
  message: { color: Colors.textSecondary, fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 340, marginTop: 14, marginBottom: 28 },
  button: { width: '100%', maxWidth: 340, borderRadius: 16, overflow: 'hidden', shadowColor: Colors.purple, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  buttonInner: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  buttonPressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  meta: { position: 'absolute', bottom: 24, alignSelf: 'center', color: Colors.textFaint, fontSize: 9, fontWeight: '800', letterSpacing: 1.8 },
});
