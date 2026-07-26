import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Colors from '@/constants/colors';
import AppBackground from '@/components/AppBackground';
import BrandMark from '@/components/BrandMark';
import { Fonts } from '@/constants/theme';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <AppBackground />
          <View style={styles.content}>
            <BrandMark size={86} />
            <Text style={styles.eyebrow}>A TEMPORARY ECLIPSE</Text>
            <Text style={styles.title}>Something drifted out of alignment.</Text>
            <Text style={styles.message}>
              {this.props.fallbackMessage ?? 'Your profile is safe. Try this screen again to continue where you left off.'}
            </Text>
            {__DEV__ && this.state.error && (
              <Text style={styles.errorDetail}>{this.state.error.message}</Text>
            )}
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
              onPress={this.handleRetry}
              accessibilityRole="button"
              accessibilityLabel="Try this screen again"
            >
              <Text style={styles.retryText}>Try this screen again</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 14,
  },
  eyebrow: { color: Colors.purpleLight, fontSize: 9, fontWeight: '900', letterSpacing: 1.7, marginTop: 8 },
  title: { fontSize: 29, lineHeight: 35, fontFamily: Fonts.display, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', letterSpacing: -0.6 },
  message: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  errorDetail: { fontSize: 12, color: Colors.danger, textAlign: 'center', marginTop: 8 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: Colors.purple,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
