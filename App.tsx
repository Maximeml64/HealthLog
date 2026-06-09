// App.tsx
import * as Sentry from '@sentry/react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import { NavigationContainer, DefaultTheme, type NavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AlertTriangle } from 'lucide-react-native';
import { useAppStore } from './src/stores/useAppStore';
import { usePremiumStore } from './src/stores/usePremiumStore';
import RootNavigator from './src/navigation/RootNavigator';
import LockScreen from './src/screens/LockScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ensurePhotoDir } from './src/services/PhotoService';
import { runMigrations } from './src/services/SchemaMigration';
import { Colors, Spacing } from './src/utils/theme';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // Disabled: Healthlog is 100% local, no backend calls to trace.
  // Performance traces would only carry app-internal spans that may
  // include user content via captured props/state.
  tracesSampleRate: 0,
  enableAutoSessionTracking: true,
  sendDefaultPii: false,
  enabled: !__DEV__,
  maxBreadcrumbs: 50,

  beforeBreadcrumb(breadcrumb) {
    // Drop console breadcrumbs entirely. console.log/warn/error in this
    // app may include user content (profile names, medication labels,
    // symptoms, notes). Safer to never ship them to Sentry.
    if (breadcrumb.category === 'console') return null;
    return breadcrumb;
  },

  beforeSend(event) {
    // Never ship user identity, even though sendDefaultPii is false.
    if (event.user) delete event.user;

    // Strip auto-captured app state — defense against a future
    // Sentry.setContext('state', store) leaking the whole store.
    if (event.contexts && 'state' in event.contexts) {
      delete (event.contexts as Record<string, unknown>).state;
    }

    // Truncate long exception messages. Real stack messages are short;
    // long ones often come from `throw new Error(JSON.stringify(...))`
    // or templated strings that embed user content.
    event.exception?.values?.forEach((v) => {
      if (v.value && v.value.length > 300) {
        v.value = v.value.slice(0, 300) + '… [truncated]';
      }
    });
    if (event.message && typeof event.message === 'string' && event.message.length > 300) {
      event.message = event.message.slice(0, 300) + '… [truncated]';
    }

    return event;
  },
});

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

function App() {
  const loadAll = useAppStore((s) => s.loadAll);
  const loading = useAppStore((s) => s.loading);
  const appLockEnabled = useAppStore((s) => s.settings.app_lock_enabled);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  // ── Sentry navigation breadcrumbs ──────────────────────────────────────
  // Records every screen change so any error report includes the user's
  // navigation history. Helps triage "where did this crash happen?".
  const navRef = useRef<NavigationContainerRef<ReturnType<typeof Object>> | null>(null);
  const prevRouteRef = useRef<string | undefined>(undefined);

  const handleNavStateChange = useCallback(() => {
    const current = navRef.current?.getCurrentRoute()?.name;
    if (current && current !== prevRouteRef.current) {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: `navigated to ${current}`,
        level: 'info',
        data: { from: prevRouteRef.current, to: current },
      });
      prevRouteRef.current = current;
    }
  }, []);

  const init = useCallback(async () => {
    setError(null);
    try {
      // Migrations BEFORE loadAll so the store reads the migrated shape.
      await runMigrations();
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

  // ── Re-lock on background → foreground when app_lock is enabled ───────
  // Standard iOS pattern for sensitive apps: locking when the user backgrounds
  // means a quick context-switch (Messages, etc.) doesn't expose health data.
  useEffect(() => {
    if (!appLockEnabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        setUnlocked(false);
      }
    });
    return () => sub.remove();
  }, [appLockEnabled]);

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
        <AlertTriangle size={32} color={Colors.warning} strokeWidth={2} style={styles.errorIcon} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={init} accessibilityRole="button">
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (appLockEnabled && !unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <ErrorBoundary>
      <NavigationContainer
        theme={NavTheme}
        ref={navRef}
        onStateChange={handleNavStateChange}
      >
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: Spacing.xl },
  errorIcon: { marginBottom: Spacing.md },
  errorText: { fontSize: 15, color: Colors.text, textAlign: 'center', marginHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: 12 },
  retryText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
