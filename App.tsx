// App.tsx
import * as Sentry from '@sentry/react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AlertTriangle } from 'lucide-react-native';
import { useAppStore } from './src/stores/useAppStore';
import { usePremiumStore } from './src/stores/usePremiumStore';
import RootNavigator from './src/navigation/RootNavigator';
import { ensurePhotoDir } from './src/services/PhotoService';
import { Colors, Spacing } from './src/utils/theme';

const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.surface,
    border: Colors.border,
    text: Colors.text,
    primary: Colors.primary,
  },
};

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  enableAutoSessionTracking: true,
  sendDefaultPii: false,
  enabled: !__DEV__,
});

function App() {
  const loadAll = useAppStore((s) => s.loadAll);
  const loading = useAppStore((s) => s.loading);
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    setError(null);
    try {
      await ensurePhotoDir();
      await loadAll();
      // RC init after app data is loaded so settings.premium is populated
      // before syncWithAppStore reads it. The premium store's `init` is
      // resilient internally (Expo Go + missing key + network errors all
      // resolve normally), but we still log unexpected throws to Sentry
      // so a premium user never silently loses entitlement on launch.
      usePremiumStore
        .getState()
        .init()
        .catch((rcError) => {
          Sentry.captureException(rcError, {
            tags: { context: 'premium_init' },
          });
        });
    } catch (e) {
      Sentry.captureException(e, {
        tags: { context: 'app_initialization' },
      });
      setError(e instanceof Error ? e.message : 'Impossible de charger les données.');
    }
  }, [loadAll]);

  useEffect(() => { init(); }, [init]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <AlertTriangle size={32} color={Colors.warning} strokeWidth={2} style={{ marginBottom: Spacing.md }} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={init}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer theme={NavTheme}>
      <StatusBar style="dark" />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  errorText: { fontSize: 15, color: Colors.text, textAlign: 'center', marginHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: 12 },
  retryText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
