// src/components/ErrorBoundary.tsx
//
// Last-resort UI when a screen throws during render. Without this,
// React Native unmounts the whole tree and the app stays on the splash.
// Reports to Sentry with the React component stack and offers the user
// a Retry button (which forces a remount of the children subtree).

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography } from '../utils/theme';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, {
      tags: { context: 'error_boundary' },
      contexts: {
        react: { componentStack: info.componentStack ?? '' },
      },
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <AlertTriangle size={36} color={Colors.warning} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Une erreur inattendue est survenue</Text>
        <Text style={styles.body}>
          L'incident a été automatiquement signalé. Touche le bouton ci-dessous
          pour réessayer — tes données ne sont pas perdues.
        </Text>
        {__DEV__ && (
          <ScrollView style={styles.devBox} contentContainerStyle={styles.devBoxContent}>
            <Text style={styles.devText}>{this.state.error.message}</Text>
            {this.state.error.stack && (
              <Text style={styles.devStack}>{this.state.error.stack}</Text>
            )}
          </ScrollView>
        )}
        <TouchableOpacity
          style={styles.btn}
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel="Réessayer"
        >
          <RotateCcw size={16} color={Colors.white} strokeWidth={2.4} />
          <Text style={styles.btnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h2,
    textAlign: 'center',
  },
  body: {
    ...Typography.bodySmall,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  devBox: {
    maxHeight: 160,
    width: '100%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: Spacing.md,
  },
  devBoxContent: {
    padding: Spacing.md,
  },
  devText: {
    fontSize: 11,
    color: Colors.danger,
    fontWeight: '600',
    fontFamily: 'Menlo',
    marginBottom: Spacing.sm,
  },
  devStack: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'Menlo',
    lineHeight: 14,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
