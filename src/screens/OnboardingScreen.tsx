// src/screens/OnboardingScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../stores/useAppStore';
import { Colors, Spacing, Radius } from '../utils/theme';

export default function OnboardingScreen() {
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [accepted, setAccepted] = useState(false);

  const handleStart = async () => {
    if (!accepted) return;
    await updateSettings({ legal_accepted: true });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Titre */}
        <Text style={styles.title}>Bienvenue dans Healthlog</Text>
        <Text style={styles.subtitle}>
          Outil d'organisation personnelle pour le suivi de santé familial
        </Text>

        {/* Disclaimer médical */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠️ Healthlog est un outil d'organisation personnelle. Il ne fournit aucun diagnostic,
            ne remplace pas un avis médical, et ne doit pas être utilisé en situation d'urgence.
            En cas de doute sur votre santé ou celle d'un proche, consultez un professionnel de santé.
          </Text>
        </View>

        {/* Liens légaux */}
        <View style={styles.linksSection}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL('https://momentous-locket-2af.notion.site/Politique-de-Confidentialit-Healthlog-34f84071bf3e80af8320fb83f0d6ee11')}
            accessibilityRole="link"
            accessibilityLabel="Lire la Politique de Confidentialité"
            accessibilityHint="Ouvre dans le navigateur"
          >
            <Text style={styles.linkText}>📄 Lire la Politique de Confidentialité</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL('https://momentous-locket-2af.notion.site/Conditions-G-n-rales-d-Utilisation-Healthlog-34f84071bf3e80b7811cf3a8f7ca5254')}
            accessibilityRole="link"
            accessibilityLabel="Lire les Conditions Générales d'Utilisation"
            accessibilityHint="Ouvre dans le navigateur"
          >
            <Text style={styles.linkText}>📋 Lire les Conditions Générales d'Utilisation</Text>
          </TouchableOpacity>
        </View>

        {/* Checkbox consentement */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAccepted((v) => !v)}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          accessibilityLabel="J'accepte les CGU et la Politique de Confidentialité"
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            J'ai lu et j'accepte les Conditions Générales d'Utilisation et la Politique de Confidentialité
          </Text>
        </TouchableOpacity>

        {/* Bouton Commencer */}
        <TouchableOpacity
          style={[styles.startBtn, !accepted && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={!accepted}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Commencer"
          accessibilityState={{ disabled: !accepted }}
        >
          <Text style={styles.startBtnText}>Commencer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, alignItems: 'center', paddingBottom: 60 },

  logoContainer: { marginBottom: Spacing.xl, marginTop: Spacing.lg },
  logo: { width: 100, height: 100, borderRadius: 22 },

  title: { fontSize: 26, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 22 },

  disclaimer: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    width: '100%',
  },
  disclaimerText: { fontSize: 13, color: Colors.text, lineHeight: 20 },

  linksSection: { width: '100%', marginBottom: Spacing.xl, gap: Spacing.sm },
  linkRow: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  checkboxLabel: { flex: 1, fontSize: 14, color: Colors.text, lineHeight: 20 },

  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
});
