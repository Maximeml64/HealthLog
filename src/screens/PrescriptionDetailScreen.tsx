// src/screens/PrescriptionDetailScreen.tsx

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { format, parseISO, differenceInDays, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppStore } from '../stores/useAppStore';
import { PrescribedMedication } from '../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../utils/theme';
import { Badge } from '../components/UI';
import { summarizeIntakeTimes, formatDose } from '../services/PrescriptionService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRemainingDuration(endDate: string | null): string {
  if (!endDate) return 'Traitement continu';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseISO(endDate);
  const days = differenceInDays(end, today);
  if (days < 0) return 'Traitement terminé';
  if (days === 0) return 'Dernier jour';
  if (days === 1) return '1 jour restant';
  return `${days} jours restants`;
}

function formatDateFr(isoDate: string): string {
  return format(parseISO(isoDate), 'd MMMM yyyy', { locale: fr });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PrescriptionDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { id } = (route.params as { id: string });

  const {
    prescriptions,
    prescribedMedications,
    upsertPrescription,
    deletePrescription,
    upsertPrescribedMedication,
  } = useAppStore();

  const prescription = useMemo(
    () => prescriptions.find((p) => p.id === id) ?? null,
    [prescriptions, id]
  );

  const linkedMeds = useMemo(
    () => prescribedMedications.filter((m) => m.prescription_id === id),
    [prescribedMedications, id]
  );

  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [togglingMedId, setTogglingMedId] = useState<string | null>(null);

  if (!prescription) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Text style={styles.headerBack}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Ordonnance introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isExpired =
    prescription.valid_until !== null &&
    !isAfter(parseISO(prescription.valid_until), today);

  const doctorLabel = prescription.doctor_name.trim() || 'Médecin non renseigné';

  // ── Actions ──

  const handleEdit = () => {
    navigation.navigate('PrescriptionEdit', { prescriptionId: prescription.id });
  };

  const handleArchive = () => {
    Alert.alert(
      "Archiver l'ordonnance ?",
      "L'ordonnance sera masquée de la liste principale. Vous pourrez la retrouver en affichant les archives.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Archiver',
          onPress: async () => {
            await upsertPrescription({
              ...prescription,
              archived: true,
              updated_at: new Date().toISOString(),
            });
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Supprimer l'ordonnance ?",
      "Cette action supprimera l'ordonnance, sa photo, tous ses médicaments et leurs rappels. Action irréversible.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deletePrescription(prescription.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleToggleMedActive = async (med: PrescribedMedication) => {
    setTogglingMedId(med.id);
    try {
      await upsertPrescribedMedication({
        ...med,
        active: !med.active,
        updated_at: new Date().toISOString(),
      });
    } finally {
      setTogglingMedId(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Text style={styles.headerBack}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Ordonnance
        </Text>
        <TouchableOpacity
          onPress={handleEdit}
          accessibilityRole="button"
          accessibilityLabel="Modifier l'ordonnance"
        >
          <Text style={styles.headerEdit}>✏️ Modifier</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Photo ── */}
        {prescription.image_uri ? (
          <TouchableOpacity
            style={styles.photoZone}
            onPress={() => setPhotoModalVisible(true)}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Agrandir la photo de l'ordonnance"
            accessibilityHint="Ouvre la photo en plein écran"
          >
            <Image
              source={{ uri: prescription.image_uri }}
              style={styles.photoImage}
              resizeMode="cover"
            />
            <View style={styles.photoHint}>
              <Text style={styles.photoHintText}>🔍 Appuyer pour agrandir</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderEmoji}>📋</Text>
            <Text style={styles.photoPlaceholderText}>Aucune photo</Text>
          </View>
        )}

        {/* ── Métadonnées ── */}
        <View style={styles.metaCard}>
          {/* Doctor */}
          <MetaRow
            label="Médecin"
            value={doctorLabel}
            valueStyle={!prescription.doctor_name.trim() ? styles.valueMuted : undefined}
          />

          {/* Prescribed date */}
          <MetaRow
            label="Date de prescription"
            value={formatDateFr(prescription.prescribed_date)}
          />

          {/* Valid until */}
          <MetaRow
            label="Validité"
            value={prescription.valid_until ? formatDateFr(prescription.valid_until) : 'Sans limite'}
            badge={
              isExpired ? (
                <Badge label="Expirée" color={Colors.danger} bg={Colors.primaryLight} />
              ) : undefined
            }
          />

          {/* Notes */}
          {!!prescription.notes && (
            <View style={[styles.metaRow, styles.metaRowLast]}>
              <Text style={styles.metaLabel}>Notes</Text>
              <Text style={[styles.metaValue, styles.metaNotes]}>
                {prescription.notes}
              </Text>
            </View>
          )}
        </View>

        {/* ── Médicaments ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Médicaments{linkedMeds.length > 0 ? ` (${linkedMeds.length})` : ''}
          </Text>

          {linkedMeds.length === 0 ? (
            <View style={styles.emptyMeds}>
              <Text style={styles.emptyMedsText}>
                Aucun médicament enregistré pour cette ordonnance.
              </Text>
              <TouchableOpacity
                onPress={handleEdit}
                accessibilityRole="button"
                accessibilityLabel="Ajouter un médicament"
              >
                <Text style={styles.emptyMedsAction}>+ Ajouter un médicament</Text>
              </TouchableOpacity>
            </View>
          ) : (
            linkedMeds.map((med) => (
              <MedDetailCard
                key={med.id}
                med={med}
                toggling={togglingMedId === med.id}
                onToggleActive={() => handleToggleMedActive(med)}
              />
            ))
          )}
        </View>

        {/* ── Actions ── */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.archiveBtn}
            onPress={handleArchive}
            accessibilityRole="button"
            accessibilityLabel="Archiver l'ordonnance"
          >
            <Text style={styles.archiveBtnText}>📁 Archiver</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Supprimer l'ordonnance"
          >
            <Text style={styles.deleteBtnText}>🗑️ Supprimer</Text>
          </TouchableOpacity>
        </View>

        {/* ── Disclaimer ── */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            {"⚕️ Cet écran est un aide-mémoire et ne se substitue pas à l'avis médical. Vérifiez toujours votre ordonnance auprès de votre médecin ou pharmacien."}
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Fullscreen photo modal ── */}
      <Modal
        visible={photoModalVisible}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.fullscreenModal}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setPhotoModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Fermer la photo"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.fullscreenCloseText}>✕</Text>
          </TouchableOpacity>
          {prescription.image_uri && (
            <Image
              source={{ uri: prescription.image_uri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── MetaRow ─────────────────────────────────────────────────────────────────

interface MetaRowProps {
  label: string;
  value: string;
  valueStyle?: object;
  badge?: React.ReactNode;
  last?: boolean;
}

function MetaRow({ label, value, valueStyle, badge, last }: MetaRowProps) {
  return (
    <View style={[styles.metaRow, last && styles.metaRowLast]}>
      <Text style={styles.metaLabel}>{label}</Text>
      <View style={styles.metaValueRow}>
        <Text style={[styles.metaValue, valueStyle]} numberOfLines={2}>
          {value}
        </Text>
        {badge}
      </View>
    </View>
  );
}

// ─── MedDetailCard ───────────────────────────────────────────────────────────

interface MedDetailCardProps {
  med: PrescribedMedication;
  toggling: boolean;
  onToggleActive: () => void;
}

function MedDetailCard({ med, toggling, onToggleActive }: MedDetailCardProps) {
  const timeSummary = summarizeIntakeTimes(med.intake_times);
  const doseLabel = formatDose(med);
  const remaining = getRemainingDuration(med.end_date);
  const isFinished = med.end_date !== null && remaining === 'Traitement terminé';

  return (
    <View style={[styles.medCard, isFinished && styles.medCardFinished]}>
      <View style={styles.medCardLeft}>
        <View style={styles.medIcon}>
          <Text style={styles.medEmoji}>💊</Text>
        </View>
      </View>

      <View style={styles.medCardBody}>
        <View style={styles.medCardTopRow}>
          <Text style={styles.medName} numberOfLines={1}>
            {med.name}
          </Text>
        </View>

        <Text style={styles.medDose}>{doseLabel}</Text>

        <View style={styles.medInfoRow}>
          <Text style={styles.medTimes}>🕐 {timeSummary}</Text>
        </View>

        <View style={styles.medInfoRow}>
          <Text
            style={[
              styles.medRemaining,
              isFinished && styles.medRemainingFinished,
            ]}
          >
            {isFinished ? '⏹ ' : '📅 '}
            {remaining}
          </Text>
        </View>

        {med.end_date && !isFinished && (
          <Text style={styles.medEndDate}>
            {"Jusqu'au"} {formatDateFr(med.end_date)}
          </Text>
        )}
      </View>

      <View style={styles.medCardRight}>
        <Text style={styles.medActiveLabel}>
          {med.active ? 'Actif' : 'Pause'}
        </Text>
        <Switch
          value={med.active}
          onValueChange={onToggleActive}
          disabled={toggling}
          trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
          thumbColor={med.active ? Colors.primary : Colors.textMuted}
          accessibilityLabel={`${med.name} ${med.active ? 'actif' : 'en pause'}`}
          accessibilityHint="Activer ou désactiver les rappels pour ce médicament"
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBack: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500',
  },
  headerTitle: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  headerEdit: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  headerRight: {
    width: 70,
  },

  scroll: { flex: 1 },
  content: {
    padding: Spacing.lg,
  },

  // Not found
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 15,
    color: Colors.textMuted,
  },

  // Photo zone
  photoZone: {
    height: 200,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
  },
  photoHintText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  photoPlaceholder: {
    height: 100,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  photoPlaceholderEmoji: {
    fontSize: 32,
  },
  photoPlaceholderText: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  // Meta card
  metaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  metaRowLast: {
    borderBottomWidth: 0,
  },
  metaLabel: {
    ...Typography.label,
    flexShrink: 0,
    width: 110,
  },
  metaValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  metaValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    textAlign: 'right',
  },
  valueMuted: {
    color: Colors.textMuted,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  metaNotes: {
    textAlign: 'left',
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Section
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },

  // Empty meds
  emptyMeds: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyMedsText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyMedsAction: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Med detail card
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  medCardFinished: {
    opacity: 0.6,
  },
  medCardLeft: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  medIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medEmoji: {
    fontSize: 20,
  },
  medCardBody: {
    flex: 1,
    gap: 3,
  },
  medCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  medName: {
    ...Typography.h3,
    fontSize: 15,
    flex: 1,
  },
  medDose: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  medInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  medTimes: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  medRemaining: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  medRemainingFinished: {
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  medEndDate: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  medCardRight: {
    alignItems: 'center',
    gap: 4,
  },
  medActiveLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Actions section
  actionsSection: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  archiveBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  archiveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: Colors.danger,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Disclaimer
  disclaimer: {
    backgroundColor: Colors.infoLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.info + '40',
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Fullscreen photo modal
  fullscreenModal: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fullscreenCloseText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
});
