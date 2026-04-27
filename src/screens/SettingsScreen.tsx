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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../stores/useAppStore';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { Card, Button } from '../components/UI';
import { clearAllData } from '../services/StorageService';
import { exportBackup, importBackup } from '../services/BackupService';

export default function SettingsScreen() {
  const { settings, updateSettings, loadAll } = useAppStore();
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
      const pl = (n: number, s: string) => `${n} ${s}${n > 1 ? 's' : ''}`;
      Alert.alert(
        'Restauration réussie',
        `Importé : ${pl(result.profiles, 'profil')}, ${pl(result.events, 'événement')}, ${pl(result.reminders, 'rappel')}, ${pl(result.photos, 'photo')}.`
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

  const handleActivatePremium = () => {
    Alert.alert(
      'Version Premium',
      'L\'achat in-app sera disponible dans une prochaine mise à jour.\n\nFonctionnalités incluses :\n• Profils illimités\n• Sauvegarde cloud',
      [
        { text: 'OK' },
        {
          text: 'Activer (dev)',
          onPress: () => updateSettings({ premium: true }),
        },
      ]
    );
  };

  const SettingRow = ({
    icon,
    label,
    sublabel,
    right,
    onPress,
    danger,
    disabled,
  }: {
    icon: string;
    label: string;
    sublabel?: string;
    right?: React.ReactNode;
    onPress?: () => void;
    danger?: boolean;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress || disabled}
      activeOpacity={onPress && !disabled ? 0.7 : 1}
      style={[styles.settingRow, disabled && { opacity: 0.5 }]}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, danger && { color: Colors.danger }]}>{label}</Text>
        {sublabel && <Text style={styles.settingSublabel}>{sublabel}</Text>}
      </View>
      {right ?? (onPress && <Text style={styles.chevron}>›</Text>)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Réglages</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Premium card */}
        <Card style={styles.premiumCard}>
          <View style={styles.premiumRow}>
            <Text style={styles.premiumIcon}>⭐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumTitle}>
                {settings.premium ? 'Version Premium active' : 'Passer en Premium'}
              </Text>
              <Text style={styles.premiumSub}>
                {settings.premium
                  ? 'Profils illimités, sauvegarde cloud'
                  : '~9€/an — Profils illimités, sauvegarde cloud'}
              </Text>
            </View>
            {!settings.premium && (
              <Button label="Activer" onPress={handleActivatePremium} size="sm" />
            )}
          </View>
        </Card>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          <Card padding={0}>
            <SettingRow
              icon="🔔"
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

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DONNÉES</Text>
          <Card padding={0}>
            <SettingRow
              icon="💾"
              label={isBackingUp ? 'Sauvegarde en cours…' : 'Sauvegarder mes données'}
              sublabel="Exporter un backup ZIP (photos incluses)"
              onPress={handleBackup}
              disabled={isBackingUp}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="📥"
              label={isRestoring ? 'Restauration en cours…' : 'Restaurer un backup'}
              sublabel="Importer un fichier ZIP Healthlog"
              onPress={handleRestore}
              disabled={isRestoring}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="🗑️"
              label="Effacer toutes les données"
              sublabel="Action irréversible"
              onPress={handleClearData}
              danger
            />
          </Card>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMATIONS</Text>
          <Card padding={0}>
            <SettingRow
              icon="📋"
              label="Outil d'organisation personnelle"
              sublabel="Ne remplace pas un professionnel de santé"
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="ℹ️"
              label="Version 1.0.0"
              sublabel="Healthlog"
            />
          </Card>
        </View>

        <View style={styles.legalBlock}>
          <Text style={styles.legalText}>
            ⚠️ Healthlog est un outil d'organisation personnelle.{'\n'}
            Il ne remplace en aucun cas l'avis d'un professionnel de santé.{'\n'}
            Consultez un médecin en cas de doute.
          </Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
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
  premiumCard: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: '#FFF3E0',
    borderColor: Colors.accent + '44',
  },
  premiumRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  premiumIcon: { fontSize: 28 },
  premiumTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  premiumSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 0.8, marginBottom: Spacing.sm, textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
  },
  settingIcon: { fontSize: 18, width: 24 },
  settingLabel: { fontSize: 15, fontWeight: '500', color: Colors.text },
  settingSublabel: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  chevron: { fontSize: 20, color: Colors.textMuted },
  rowDivider: { height: 1, backgroundColor: Colors.border, marginLeft: Spacing.lg + 24 + Spacing.md },
  legalBlock: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent + '33',
  },
  legalText: {
    fontSize: 12,
    color: Colors.accent,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
});
