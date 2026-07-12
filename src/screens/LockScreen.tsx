// src/screens/LockScreen.tsx
//
// Biometric / passcode gate shown when app_lock_enabled is true and the
// app has just been brought to the foreground. Falls back gracefully:
// - No biometric hardware → no gate (we don't want to lock the user out)
// - User cancels → stays on the lock screen with a retry button
// - User authenticates → onUnlock() is called and the navigator mounts

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Fingerprint, Lock } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography } from '../utils/theme';

interface Props {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  const tryAuth = async () => {
    if (authenticating) return;
    setError(null);
    setAuthenticating(true);
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      // No Face ID/Touch ID/passcode set up at the OS level → don't
      // trap the user. The Settings toggle should have warned them at
      // enable time; we treat this as "auto-unlock".
      if (!hasHw || !enrolled) {
        onUnlock();
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Déverrouiller Healthlog',
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
      });
      if (res.success) {
        onUnlock();
      } else {
        setError('Authentification annulée. Touche le bouton pour réessayer.');
      }
    } catch {
      setError('Erreur d\'authentification. Touche le bouton pour réessayer.');
    } finally {
      setAuthenticating(false);
    }
  };

  // Auto-trigger on mount so the prompt comes up immediately. If the
  // user dismisses it, the manual button is there to retry.
  useEffect(() => {
    void tryAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Lock size={32} color={Colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.title}>Healthlog est verrouillé</Text>
      <Text style={styles.subtitle}>
        Déverrouille avec Face ID pour ouvrir l'app.
      </Text>
      <TouchableOpacity
        style={[styles.btn, authenticating && styles.btnDisabled]}
        onPress={tryAuth}
        disabled={authenticating}
        accessibilityRole="button"
        accessibilityLabel="Déverrouiller"
      >
        <Fingerprint size={18} color={Colors.white} strokeWidth={2.4} />
        <Text style={styles.btnText}>Déverrouiller</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
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
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h2,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: Spacing.lg,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  error: {
    fontSize: 12,
    color: Colors.warning,
    marginTop: Spacing.sm,
    textAlign: 'center',
    maxWidth: 280,
  },
});
