// App.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  enableAutoSessionTracking: true,
  sendDefaultPii: false,
  enabled: !__DEV__,
});

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from './src/stores/useAppStore';
import { usePremiumStore } from './src/stores/usePremiumStore';
import RootNavigator from './src/navigation/RootNavigator';
import { ensurePhotoDir } from './src/services/PhotoService';
import { Colors, Spacing } from './src/utils/theme';

function App() {
  const loadAll = useAppStore((s) => s.loadAll);
  const loading = useAppStore((s) => s.loading);
  const [error, setError] = useState<string | null>(null);

  const init = async () => {
    setError(null);
    try {
      await ensurePhotoDir();
      await loadAll();
      // RC init after app data is loaded so settings.premium is populated
      // before syncWithAppStore reads it. Fire-and-forget — errors are
      // handled internally in the store.
      void usePremiumStore.getState().init();
    } catch (e) {
      Sentry.captureException(e, {
        tags: { context: 'app_initialization' },
      });
      setError(e instanceof Error ? e.message : 'Impossible de charger les données.');
    }
  };

  useEffect(() => { init(); }, []);

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
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={init}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer>
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
