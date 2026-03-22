import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

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
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.content}>
            <Text style={styles.emoji}>✦</Text>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              {this.props.fallbackMessage ?? 'The stars seem to be misaligned. Please try again.'}
            </Text>
            {__DEV__ && this.state.error && (
              <Text style={styles.errorDetail}>{this.state.error.message}</Text>
            )}
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
              onPress={this.handleRetry}
            >
              <Text style={styles.retryText}>Try Again</Text>
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
  emoji: { fontSize: 48, color: Colors.purpleLight, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  message: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  errorDetail: { fontSize: 12, color: Colors.danger, textAlign: 'center', marginTop: 8 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: Colors.purple,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  retryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
