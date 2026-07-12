// src/screens/SettingsScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as LocalAuthentication from 'expo-local-authentication';
import { Bell, Download, Upload, Trash2, Info, ScrollText, Lock, ShieldCheck, Sparkles, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useAppStore } from '../stores/useAppStore';
import { useMenstrualStore } from '../stores/useMenstrualStore';
import { usePremiumStore } from '../stores/usePremiumStore';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { Card } from '../components/UI';
import { clearAllData } from '../services/StorageService';
import { exportBackup, importBackup } from '../services/BackupService';
import { PRIVACY_POLICY_URL, CGU_URL } from '../constants/urls';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const loadAll = useAppStore((s) => s.loadAll);
  const isPremium = usePremiumStore((s) => s.isPremium);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const uri = await exportBackup();
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/zip',
          dialogTitle: 'Sauvegarder le backup Healthlog',
        });
      } else {
        Alert.alert('Backup généré', `Fichier enregistré :\n${uri}`);
      }
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'La sauvegarde a échoué.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const doImport = async (zipUri: string, mode: 'replace' | 'merge') => {
    setIsRestoring(true);
    try {
      const result = await importBackup(zipUri, mode);
      await loadAll();
      await useMenstrualStore.getState().loadMenstrualData();
      const pl = (n: number, s: string) => `${n} ${s}${n > 1 ? 's' : ''}`;
      Alert.alert(
        'Restauration réussie',
        `Importé : ${pl(result.profiles, 'profil')}, ${pl(result.events, 'événement')}, ${pl(result.reminders, 'rappel')}, ${pl(result.photos, 'photo')}, ${pl(result.cycles, 'cycle')}, ${pl(result.pregnancies, 'grossesse')}.`
      );
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'La restauration a échoué.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestore = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: 'application/zip',
      copyToCacheDirectory: true,
    });

    if (picked.canceled) return;
    const zipUri = picked.assets[0].uri;

    Alert.alert(
      'Mode de restauration',
      'Comment souhaitez-vous importer ce backup ?',
      [
        {
          text: 'Remplacer toutes mes données',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmer la suppression',
              'Cette action supprimera toutes vos données actuelles. Continuer ?',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Continuer',
                  style: 'destructive',
                  onPress: () => doImport(zipUri, 'replace'),
                },
              ]
            );
          },
        },
        {
          text: 'Fusionner',
          onPress: () => doImport(zipUri, 'merge'),
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const handleToggleAppLock = async (next: boolean) => {
    if (!next) {
      // Disabling never requires re-auth — user already passed the gate this session.
      await updateSettings({ app_lock_enabled: false });
      return;
    }
    // Enabling: verify the device has biometrics enrolled BEFORE flipping
    // the flag, otherwise the user could lock themselves out on next launch.
    const hasHw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHw || !enrolled) {
      Alert.alert(
        'Authentification non disponible',
        "Configure Face ID, Touch ID ou un code dans les Réglages iOS avant d'activer le verrouillage."
      );
      return;
    }
    await updateSettings({ app_lock_enabled: true });
  };

  const handleClearData = () => {
    Alert.alert(
      'Effacer toutes les données ?',
      'Tous les profils, événements et rappels seront supprimés définitivement. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout effacer',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await loadAll();
          },
        },
      ]
    );
  };

  const SettingRow = ({
    icon: Icon,
    label,
    sublabel,
    right,
    onPress,
    danger,
    disabled,
    accessibilityHint,
  }: {
    icon: LucideIcon;
    label: string;
    sublabel?: string;
    right?: React.ReactNode;
    onPress?: () => void;
    danger?: boolean;
    disabled?: boolean;
    accessibilityHint?: string;
  }) => {
    const iconColor = danger ? Colors.danger : Colors.primary;
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress || disabled}
        activeOpacity={onPress && !disabled ? 0.7 : 1}
        accessibilityRole={onPress ? 'button' : 'none'}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={disabled ? { disabled: true } : undefined}
        style={[styles.settingRow, disabled && { opacity: 0.5 }]}
      >
        <View style={[styles.settingIconWrap, danger && { backgroundColor: Colors.danger + '15' }]}>
          <Icon size={18} color={iconColor} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.settingLabel, danger && { color: Colors.danger }]}>{label}</Text>
          {sublabel && <Text style={styles.settingSublabel}>{sublabel}</Text>}
        </View>
        {right ?? (onPress && <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2} />)}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Réglages</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Premium RC banner (source of truth: usePremiumStore) ── */}
        {isPremium ? (
          <View style={styles.premiumActiveBadge}>
            <Sparkles size={14} color={Colors.success} strokeWidth={2.4} />
            <Text style={styles.premiumActiveBadgeText}>Premium actif</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.premiumBanner}
            onPress={() => navigation.navigate('Paywall')}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Devenir Premium"
            accessibilityHint="Ouvre les offres d'abonnement"
          >
            <View style={styles.premiumBannerIconWrap}>
              <Sparkles size={20} color={Colors.white} strokeWidth={2.4} />
            </View>
            <View style={styles.premiumBannerBody}>
              <Text style={styles.premiumBannerTitle}>Devenir Premium</Text>
              <Text style={styles.premiumBannerSub}>
                Profils illimités · Export PDF · Sauvegarde complète
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.white + 'CC'} strokeWidth={2.2} />
          </TouchableOpacity>
        )}

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          <Card padding={0}>
            <SettingRow
              icon={Bell}
              label="Notifications de rappels"
              sublabel="Recevoir des alertes pour les rappels"
              right={
                <Switch
                  value={settings.notifications_enabled}
                  onValueChange={(v) => updateSettings({ notifications_enabled: v })}
                  trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                  thumbColor={settings.notifications_enabled ? Colors.primary : Colors.textMuted}
                />
              }
            />
          </Card>
        </View>

        {/* Sécurité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SÉCURITÉ</Text>
          <Card padding={0}>
            <SettingRow
              icon={ShieldCheck}
              label="Verrouillage Face ID"
              sublabel="Demander Face ID à l'ouverture de l'app"
              right={
                <Switch
                  value={settings.app_lock_enabled}
                  onValueChange={handleToggleAppLock}
                  trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                  thumbColor={settings.app_lock_enabled ? Colors.primary : Colors.textMuted}
                />
              }
            />
          </Card>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DONNÉES</Text>
          <Card padding={0}>
            <SettingRow
              icon={Download}
              label={isBackingUp ? 'Sauvegarde en cours…' : 'Sauvegarder mes données'}
              sublabel="Exporter un backup ZIP (photos incluses)"
              onPress={handleBackup}
              disabled={isBackingUp}
              accessibilityHint="Crée un fichier ZIP avec toutes vos données"
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon={Upload}
              label={isRestoring ? 'Restauration en cours…' : 'Restaurer un backup'}
              sublabel="Importer un fichier ZIP Healthlog"
              onPress={handleRestore}
              disabled={isRestoring}
              accessibilityHint="Importe un fichier ZIP de sauvegarde"
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon={Trash2}
              label="Effacer toutes les données"
              sublabel="Action irréversible"
              onPress={handleClearData}
              danger
              accessibilityHint="Supprime définitivement toutes vos données"
            />
          </Card>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMATIONS</Text>
          <Card padding={0}>
            <SettingRow
              icon={ScrollText}
              label="Outil d'organisation personnelle"
              sublabel="Ne remplace pas un professionnel de santé"
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon={Info}
              label="Version 1.0.0"
              sublabel="Healthlog"
            />
          </Card>
        </View>

        {/* Legal links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LÉGAL</Text>
          <Card padding={0}>
            <SettingRow
              icon={Lock}
              label="Politique de confidentialité"
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
              accessibilityHint="Ouvre la politique de confidentialité dans le navigateur"
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon={ScrollText}
              label="Conditions Générales d'Utilisation"
              onPress={() => Linking.openURL(CGU_URL)}
              accessibilityHint="Ouvre les conditions générales dans le navigateur"
            />
          </Card>
        </View>

        <View style={styles.legalBlock}>
          <Text style={styles.legalText}>
            Healthlog est un outil d'organisation personnelle.{'\n'}
            Il ne remplace en aucun cas l'avis d'un professionnel de santé.{'\n'}
            Consultez un médecin en cas de doute.
          </Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Export / import progress overlay ──────────────────────────────── */}
      <Modal
        visible={isBackingUp || isRestoring}
        transparent
        animationType="fade"
        onRequestClose={() => { /* not user-cancellable */ }}
      >
        <View style={styles.overlay} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.overlayText}>
              {isBackingUp ? 'Préparation de la sauvegarde…' : 'Restauration en cours…'}
            </Text>
            <Text style={styles.overlayHint}>
              Merci de ne pas fermer l'app.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { ...Typography.h1 },
  content: { padding: Spacing.lg },

  // ── Premium RC banner ─────────────────────────────────────────────────────
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  premiumBannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBannerBody: { flex: 1 },
  premiumBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  premiumBannerSub: {
    fontSize: 12,
    color: Colors.white + 'CC',
    marginTop: 2,
  },
  premiumActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success + '40',
    alignSelf: 'flex-start',
  },
  premiumActiveBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 0.8, marginBottom: Spacing.sm, textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { fontSize: 15, fontWeight: '500', color: Colors.text },
  settingSublabel: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  rowDivider: { height: 1, backgroundColor: Colors.border, marginLeft: Spacing.lg + 36 + Spacing.md },
  legalBlock: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legalText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Export / import progress overlay ─────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  overlayCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    minWidth: 220,
  },
  overlayText: {
    ...Typography.h3,
    textAlign: 'center',
  },
  overlayHint: {
    ...Typography.bodySmall,
    textAlign: 'center',
    color: Colors.textMuted,
  },
});
