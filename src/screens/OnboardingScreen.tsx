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
import { Check, FileText, ScrollText, Info } from 'lucide-react-native';
import { useAppStore } from '../stores/useAppStore';
import { Colors, Spacing, Radius, Typography } from '../utils/theme';
import { PRIVACY_POLICY_URL, CGU_URL } from '../constants/urls';

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
          Le carnet de santé calme de toute la famille.
        </Text>

        {/* Disclaimer médical */}
        <View style={styles.disclaimer}>
          <Info size={18} color={Colors.primary} strokeWidth={2} style={styles.disclaimerIcon} />
          <Text style={styles.disclaimerText}>
            Healthlog est un outil d'organisation personnelle. Il ne fournit aucun diagnostic,
            ne remplace pas un avis médical, et ne doit pas être utilisé en situation d'urgence.
            En cas de doute sur votre santé ou celle d'un proche, consultez un professionnel de santé.
          </Text>
        </View>

        {/* Liens légaux */}
        <View style={styles.linksSection}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
            accessibilityLabel="Lire la Politique de Confidentialité"
            accessibilityHint="Ouvre dans le navigateur"
          >
            <FileText size={18} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.linkText}>Politique de Confidentialité</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL(CGU_URL)}
            accessibilityRole="link"
            accessibilityLabel="Lire les Conditions Générales d'Utilisation"
            accessibilityHint="Ouvre dans le navigateur"
          >
            <ScrollText size={18} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.linkText}>Conditions Générales d'Utilisation</Text>
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
            {accepted && <Check size={14} color={Colors.white} strokeWidth={3} />}
          </View>
          <Text style={styles.checkboxLabel}>
            J'ai lu et j'accepte les Conditions Générales d'Utilisation et la Politique de Confidentialité.
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
  logo: { width: 96, height: 96, borderRadius: 22 },

  title: {
    ...Typography.h1,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },

  disclaimer: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    width: '100%',
  },
  disclaimerIcon: { marginTop: 2 },
  disclaimerText: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 20 },

  linksSection: { width: '100%', marginBottom: Spacing.xl, gap: Spacing.sm },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
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
