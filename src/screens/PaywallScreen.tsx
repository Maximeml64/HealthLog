// src/screens/PaywallScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { PurchasesPackage } from 'react-native-purchases';
import { usePremiumStore } from '../stores/usePremiumStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '../utils/theme';
import { PRIVACY_POLICY_URL, CGU_URL } from '../constants/urls';

// ─── Constants ────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '👨‍👩‍👧', label: 'Profils familiaux illimités' },
  { icon: '📋', label: 'Historique de santé sans limite' },
  { icon: '📄', label: 'Export PDF pour le médecin' },
  { icon: '🔒', label: 'Sauvegardes chiffrées' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeSavings(
  monthly: PurchasesPackage,
  annual: PurchasesPackage,
): number | null {
  const mp = monthly.product.price;
  if (!mp) return null;
  const pct = Math.round((1 - annual.product.price / (mp * 12)) * 100);
  return pct > 0 ? pct : null;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { offerings, isLoading, purchasePackage, restorePurchases } = usePremiumStore();

  const monthlyPkg = offerings?.current?.monthly ?? null;
  const annualPkg = offerings?.current?.annual ?? null;
  const lifetimePkg = offerings?.current?.lifetime ?? null;

  const hasAnyPackage = !!(monthlyPkg || annualPkg || lifetimePkg);

  // Default selection: annual (best value); fall back to first available
  const defaultPkg = annualPkg ?? monthlyPkg ?? lifetimePkg ?? null;
  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(defaultPkg);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const savingsPct = monthlyPkg && annualPkg
    ? computeSavings(monthlyPkg, annualPkg)
    : null;

  // ── Handlers ──

  async function handlePurchase() {
    if (!selectedPkg) return;
    setPurchasing(true);
    try {
      await purchasePackage(selectedPkg);
      navigation.goBack();
    } catch (e) {
      const message = e instanceof Error ? e.message : "L'achat a échoué. Réessayez.";
      Alert.alert('Erreur', message);
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      await restorePurchases();
      const { isPremium } = usePremiumStore.getState();
      if (isPremium) {
        Alert.alert('Abonnement restauré ✓', 'Votre accès Premium est actif.');
        navigation.goBack();
      } else {
        Alert.alert('Aucun achat trouvé', 'Aucun abonnement actif trouvé sur ce compte.');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de restaurer les achats.');
    } finally {
      setRestoring(false);
    }
  }

  // ── Loading / no offerings ──

  if (isLoading || (!hasAnyPackage && isLoading)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement des offres…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isDisabled = purchasing || restoring;
  const ctaLabel = purchasing
    ? 'Traitement en cours…'
    : selectedPkg
    ? `Continuer · ${selectedPkg.product.priceString}`
    : 'Sélectionnez une offre';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Fermer"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>✨</Text>
          <Text style={styles.heroTitle}>Healthlog Premium</Text>
          <Text style={styles.heroSubtitle}>
            Débloquez toutes les fonctionnalités pour toute la famille.
          </Text>
        </View>

        {/* ── Avantages ── */}
        <View style={styles.featuresCard}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureCheck}>✓</Text>
            </View>
          ))}
        </View>

        {/* ── Tiers ── */}
        {!hasAnyPackage ? (
          <View style={styles.unavailable}>
            <Text style={styles.unavailableText}>
              Les offres ne sont pas disponibles pour le moment.{'\n'}
              Vérifiez votre connexion et réessayez.
            </Text>
          </View>
        ) : (
          <View style={styles.tiersContainer}>

            {/* Annuel */}
            {annualPkg && (
              <TierCard
                pkg={annualPkg}
                title="Annuel"
                period="/an"
                badge={savingsPct != null ? `Économise ${savingsPct}%` : 'Le plus populaire'}
                badgeVariant="primary"
                selected={selectedPkg?.identifier === annualPkg.identifier}
                onSelect={() => setSelectedPkg(annualPkg)}
                disabled={isDisabled}
              />
            )}

            {/* Mensuel */}
            {monthlyPkg && (
              <TierCard
                pkg={monthlyPkg}
                title="Mensuel"
                period="/mois"
                sublabel="Essai 7 jours gratuit"
                selected={selectedPkg?.identifier === monthlyPkg.identifier}
                onSelect={() => setSelectedPkg(monthlyPkg)}
                disabled={isDisabled}
              />
            )}

            {/* À vie */}
            {lifetimePkg && (
              <TierCard
                pkg={lifetimePkg}
                title="À vie"
                period=" · paiement unique"
                badge="Sans renouvellement"
                badgeVariant="accent"
                selected={selectedPkg?.identifier === lifetimePkg.identifier}
                onSelect={() => setSelectedPkg(lifetimePkg)}
                disabled={isDisabled}
              />
            )}
          </View>
        )}

        {/* ── CTA ── */}
        {hasAnyPackage && (
          <TouchableOpacity
            style={[
              styles.ctaBtn,
              (!selectedPkg || isDisabled) && styles.ctaBtnDisabled,
            ]}
            onPress={handlePurchase}
            disabled={!selectedPkg || isDisabled}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
          >
            {purchasing ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.ctaBtnText}>{ctaLabel}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* ── Restore ── */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={isDisabled}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={Colors.textMuted} />
          ) : (
            <Text style={styles.restoreBtnText}>Restaurer mes achats</Text>
          )}
        </TouchableOpacity>

        {/* ── Legal links ── */}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL(CGU_URL)}>
            <Text style={styles.legalLink}>CGU</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}> · </Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            <Text style={styles.legalLink}>Politique de confidentialité</Text>
          </TouchableOpacity>
        </View>

        {/* ── Disclaimer ── */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            L'abonnement se renouvelle automatiquement. Annulable à tout moment depuis les réglages de l'App Store.
            Healthlog est un aide-mémoire et ne se substitue pas à l'avis d'un professionnel de santé.
          </Text>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── TierCard ─────────────────────────────────────────────────────────────────

interface TierCardProps {
  pkg: PurchasesPackage;
  title: string;
  period: string;
  badge?: string;
  badgeVariant?: 'primary' | 'accent';
  sublabel?: string;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

function TierCard({
  pkg,
  title,
  period,
  badge,
  badgeVariant = 'primary',
  sublabel,
  selected,
  onSelect,
  disabled,
}: TierCardProps) {
  return (
    <TouchableOpacity
      style={[styles.tierCard, selected && styles.tierCardSelected]}
      onPress={onSelect}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title} — ${pkg.product.priceString}${period}`}
    >
      {/* Radio */}
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>

      {/* Info */}
      <View style={styles.tierInfo}>
        <View style={styles.tierTitleRow}>
          <Text style={[styles.tierTitle, selected && styles.tierTitleSelected]}>
            {title}
          </Text>
          {badge && (
            <View style={[
              styles.tierBadge,
              badgeVariant === 'accent' && styles.tierBadgeAccent,
            ]}>
              <Text style={[
                styles.tierBadgeText,
                badgeVariant === 'accent' && styles.tierBadgeTextAccent,
              ]}>
                {badge}
              </Text>
            </View>
          )}
        </View>
        {sublabel && (
          <Text style={styles.tierSublabel}>{sublabel}</Text>
        )}
      </View>

      {/* Price */}
      <Text style={[styles.tierPrice, selected && styles.tierPriceSelected]}>
        {pkg.product.priceString}
        <Text style={styles.tierPeriod}>{period}</Text>
      </Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  closeBtn: {
    alignSelf: 'flex-end',
    margin: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '700' },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },

  // Hero
  hero: { alignItems: 'center', marginBottom: Spacing.xl },
  heroIcon: { fontSize: 52, marginBottom: Spacing.md },
  heroTitle: { ...Typography.h1, textAlign: 'center', marginBottom: Spacing.sm },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Features
  featuresCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  featureIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  featureLabel: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '500' },
  featureCheck: { fontSize: 14, color: Colors.primary, fontWeight: '700' },

  // Tiers
  tiersContainer: { gap: Spacing.sm, marginBottom: Spacing.lg },

  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  tierCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },

  tierInfo: { flex: 1 },
  tierTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  tierTitle: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  tierTitleSelected: { color: Colors.text },

  tierBadge: {
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  tierBadgeAccent: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent + '40',
  },
  tierBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 0.2 },
  tierBadgeTextAccent: { color: Colors.accent },

  tierSublabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  tierPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'right',
    flexShrink: 0,
  },
  tierPriceSelected: { color: Colors.primary },
  tierPeriod: { fontSize: 11, fontWeight: '400', color: Colors.textMuted },

  unavailable: {
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  unavailableText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // CTA
  ctaBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  ctaBtnDisabled: { opacity: 0.55 },
  ctaBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },

  // Restore
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  restoreBtnText: { fontSize: 13, color: Colors.textMuted },

  // Legal
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  legalLink: { fontSize: 12, color: Colors.textSecondary, textDecorationLine: 'underline' },
  legalSep: { fontSize: 12, color: Colors.textMuted },

  // Disclaimer
  disclaimer: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
