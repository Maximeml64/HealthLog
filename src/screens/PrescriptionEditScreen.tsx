// src/screens/PrescriptionEditScreen.tsx

import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Modal,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../stores/useAppStore';
import { Prescription, PrescribedMedication, MEDICATION_UNIT_LABELS } from '../types';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { Button, Card } from '../components/UI';
import { DateTimeField } from '../components/DateTimeField';
import { PrescribedMedicationForm } from '../components/PrescribedMedicationForm';
import { summarizeIntakeTimes } from '../services/PrescriptionService';
import * as PhotoService from '../services/PhotoService';
import { generateId } from '../utils/helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteParams = RootStackParamList['PrescriptionEdit'];
type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Default factories ───────────────────────────────────────────────────────

function makeEmptyPrescription(id: string, profileId: string): Prescription {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  return {
    id,
    profile_id: profileId,
    image_uri: null,
    prescribed_date: today,
    doctor_name: '',
    notes: '',
    valid_until: null,
    archived: false,
    created_at: now,
    updated_at: now,
  };
}

function makeEmptyMedication(prescriptionId: string, profileId: string): PrescribedMedication {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  return {
    id: '',
    prescription_id: prescriptionId,
    profile_id: profileId,
    name: '',
    dose: 0,
    unit: 'cp',
    intake_times: ['08:00'],
    start_date: today,
    end_date: null,
    reminder_ids: [],
    active: true,
    created_at: now,
    updated_at: now,
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PrescriptionEditScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const params = route.params as RouteParams;
  const prescriptionId = params?.prescriptionId;
  const isEditMode = !!prescriptionId;

  const {
    profiles,
    settings,
    prescriptions,
    prescribedMedications,
    upsertPrescription,
    deletePrescription,
    upsertPrescribedMedication,
    deletePrescribedMedication,
  } = useAppStore();

  // Active profile — same logic as PrescriptionsListScreen
  const activeProfile = useMemo(() => {
    const active = profiles.filter((p) => !p.archived);
    if (settings.default_profile_id) {
      const found = active.find((p) => p.id === settings.default_profile_id);
      if (found) return found;
    }
    return active[0] ?? null;
  }, [profiles, settings.default_profile_id]);

  // Stable ID for the new prescription (creation mode)
  const newIdRef = useRef(generateId());

  // ── Form state ──
  const [form, setForm] = useState<Prescription>(() => {
    if (isEditMode && prescriptionId) {
      const existing = prescriptions.find((p) => p.id === prescriptionId);
      if (existing) return existing;
    }
    return makeEmptyPrescription(newIdRef.current, activeProfile?.id ?? '');
  });

  const [hasValidUntil, setHasValidUntil] = useState(form.valid_until !== null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Tracks the original image_uri so we can delete it when replaced on save
  const originalImageUri = useRef<string | null>(
    isEditMode ? (prescriptions.find((p) => p.id === prescriptionId)?.image_uri ?? null) : null
  );

  // ── Medication modal state ──
  const [medModalVisible, setMedModalVisible] = useState(false);
  const [editingMed, setEditingMed] = useState<PrescribedMedication | null>(null);
  const [medForm, setMedForm] = useState<PrescribedMedication>(
    makeEmptyMedication(form.id, form.profile_id)
  );

  // Medications linked to this prescription (live from store)
  const linkedMeds = useMemo(
    () => prescribedMedications.filter((m) => m.prescription_id === form.id),
    [prescribedMedications, form.id]
  );

  const updateForm = useCallback((patch: Partial<Prescription>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Photo ──

  const handlePickPhoto = () => {
    Alert.alert(
      form.image_uri ? 'Changer la photo' : 'Ajouter une photo',
      undefined,
      [
        { text: 'Prendre une photo', onPress: pickFromCamera },
        { text: 'Choisir dans la galerie', onPress: pickFromGallery },
        ...(form.image_uri
          ? [{ text: 'Supprimer la photo', style: 'destructive' as const, onPress: removePhoto }]
          : []),
        { text: 'Annuler', style: 'cancel' as const },
      ]
    );
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "L'accès à la caméra est nécessaire.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images' as any, quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) {
      const saved = await PhotoService.savePhoto(result.assets[0].uri);
      updateForm({ image_uri: saved });
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "L'accès à la galerie est nécessaire.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images' as any, quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) {
      const saved = await PhotoService.savePhoto(result.assets[0].uri);
      updateForm({ image_uri: saved });
    }
  };

  const removePhoto = async () => {
    if (form.image_uri) {
      await PhotoService.deletePhoto(form.image_uri);
    }
    updateForm({ image_uri: null });
  };

  // ── Validation + submit ──

  const handleSave = async () => {
    setFormError(null);

    if (!form.prescribed_date) {
      setFormError('La date de prescription est obligatoire.');
      return;
    }
    if (
      hasValidUntil &&
      form.valid_until &&
      form.valid_until <= form.prescribed_date
    ) {
      setFormError("La date de validité doit être postérieure à la date de prescription.");
      return;
    }

    setSaving(true);
    try {
      // If the user replaced the photo, delete the original file
      if (
        isEditMode &&
        originalImageUri.current &&
        originalImageUri.current !== form.image_uri
      ) {
        await PhotoService.deletePhoto(originalImageUri.current);
      }

      const now = new Date().toISOString();
      const toSave: Prescription = {
        ...form,
        valid_until: hasValidUntil ? form.valid_until : null,
        updated_at: now,
      };
      await upsertPrescription(toSave);
      navigation.goBack();
    } catch {
      setFormError("Une erreur est survenue lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(
      "Supprimer l'ordonnance ?",
      "Cette action supprimera l'ordonnance, sa photo, tous ses médicaments associés et leurs rappels. Cette action est irréversible.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deletePrescription(form.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  // ── Medication CRUD ──

  const openAddMed = () => {
    const blank = makeEmptyMedication(form.id, form.profile_id);
    setEditingMed(null);
    setMedForm(blank);
    setMedModalVisible(true);
  };

  const openEditMed = (med: PrescribedMedication) => {
    setEditingMed(med);
    setMedForm(med);
    setMedModalVisible(true);
  };

  const handleMedSubmit = async (med: PrescribedMedication) => {
    await upsertPrescribedMedication(med);
    setMedModalVisible(false);
  };

  const handleMedCancel = () => {
    setMedModalVisible(false);
  };

  const handleDeleteMed = (med: PrescribedMedication) => {
    Alert.alert(
      `Supprimer ${med.name} ?`,
      "Les rappels associés seront annulés. Action irréversible.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deletePrescribedMedication(med.id),
        },
      ]
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Annuler"
        >
          <Text style={styles.headerCancel}>Annuler</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Modifier' : 'Nouvelle ordonnance'}
        </Text>
        {/* Spacer to center the title */}
        <View style={styles.headerRight} />
      </View>

      {/* ── Scrollable form ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Error banner */}
        {formError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {formError}</Text>
          </View>
        ) : null}

        {/* ── 1. Photo ── */}
        <View style={styles.field}>
          <Text style={styles.label}>{"Photo de l'ordonnance"}</Text>
          <TouchableOpacity
            style={styles.photoZone}
            onPress={handlePickPhoto}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={form.image_uri ? "Changer ou supprimer la photo de l'ordonnance" : "Ajouter une photo de l'ordonnance"}
          >
            {form.image_uri ? (
              <>
                <Image
                  source={{ uri: form.image_uri }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoOverlayText}>📷 Modifier</Text>
                </View>
              </>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderEmoji}>📷</Text>
                <Text style={styles.photoPlaceholderText}>
                  {"Ajouter une photo de l'ordonnance"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── 2. Médecin ── */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Nom du médecin{' '}
            <Text style={styles.labelOptional}>(facultatif)</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={form.doctor_name}
            onChangeText={(t) => updateForm({ doctor_name: t })}
            placeholder="Dr Martin, Centre médical du Centre, ..."
            placeholderTextColor={Colors.textMuted}
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>

        {/* ── 3. Date de prescription ── */}
        <DateTimeField
          label="Date de prescription *"
          mode="date"
          value={form.prescribed_date}
          onChange={(d) => updateForm({ prescribed_date: d })}
        />

        {/* ── 4. Date de validité (optionnelle) ── */}
        <View style={styles.field}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Limiter la durée de validité</Text>
            <Switch
              value={hasValidUntil}
              onValueChange={(on) => {
                setHasValidUntil(on);
                if (on && !form.valid_until) {
                  // Default to 3 months after prescribed_date
                  const base = form.prescribed_date
                    ? new Date(form.prescribed_date)
                    : new Date();
                  base.setMonth(base.getMonth() + 3);
                  updateForm({ valid_until: base.toISOString().slice(0, 10) });
                }
                if (!on) {
                  updateForm({ valid_until: null });
                }
              }}
              trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
              thumbColor={hasValidUntil ? Colors.primary : Colors.textMuted}
            />
          </View>
          {hasValidUntil && (
            <>
              <View style={styles.validUntilHint}>
                <Text style={styles.hintText}>
                  {"Standard 3 mois · ALD jusqu'à 12 mois"}
                </Text>
              </View>
              <DateTimeField
                label="Date de fin de validité"
                mode="date"
                value={form.valid_until}
                onChange={(d) => updateForm({ valid_until: d })}
              />
            </>
          )}
        </View>

        {/* ── 5. Notes ── */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Notes{' '}
            <Text style={styles.labelOptional}>(facultatif)</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={form.notes}
            onChangeText={(t) => updateForm({ notes: t })}
            placeholder="Notes personnelles, contexte, instructions du médecin..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            scrollEnabled={false}
            textAlignVertical="top"
          />
        </View>

        {/* ── Section Médicaments ── */}
        <View style={styles.medsSection}>
          <Text style={styles.medsTitle}>Médicaments</Text>

          {!isEditMode ? (
            /* Creation mode: block medication addition until prescription is saved */
            <View style={styles.medsSaveFirstHint}>
              <Text style={styles.medsSaveFirstText}>
                {"💡 Enregistrez d'abord l'ordonnance pour ajouter des médicaments."}
              </Text>
            </View>
          ) : (
            <>
              {linkedMeds.length === 0 ? (
                <Text style={styles.medsEmpty}>
                  Aucun médicament ajouté à cette ordonnance.
                </Text>
              ) : (
                linkedMeds.map((med) => (
                  <MedicationCard
                    key={med.id}
                    med={med}
                    onEdit={() => openEditMed(med)}
                    onDelete={() => handleDeleteMed(med)}
                  />
                ))
              )}

              <TouchableOpacity
                style={styles.addMedBtn}
                onPress={openAddMed}
                accessibilityRole="button"
                accessibilityLabel="Ajouter un médicament"
              >
                <Text style={styles.addMedBtnText}>+ Ajouter un médicament</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Delete (edit mode only) ── */}
        {isEditMode && (
          <View style={styles.deleteSection}>
            <Button
              label="Supprimer l'ordonnance"
              onPress={handleDelete}
              variant="danger"
              fullWidth
            />
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Button
          label={saving ? 'Enregistrement…' : 'Enregistrer'}
          onPress={handleSave}
          disabled={saving}
          loading={saving}
          fullWidth
          style={{ marginBottom: Spacing.sm }}
        />
        <Button
          label="Annuler"
          onPress={handleCancel}
          variant="ghost"
          fullWidth
        />
      </View>

      {/* ── Medication modal — pageSheet slide-up ── */}
      <Modal
        visible={medModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleMedCancel}
      >
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={handleMedCancel}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {editingMed ? 'Modifier le médicament' : 'Nouveau médicament'}
            </Text>
            <View style={styles.headerRight} />
          </View>
          <PrescribedMedicationForm
            value={medForm}
            onChange={setMedForm}
            onSubmit={handleMedSubmit}
            onCancel={handleMedCancel}
            prescriptionId={form.id}
            profileId={form.profile_id}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── MedicationCard ───────────────────────────────────────────────────────────

interface MedicationCardProps {
  med: PrescribedMedication;
  onEdit: () => void;
  onDelete: () => void;
}

function MedicationCard({ med, onEdit, onDelete }: MedicationCardProps) {
  const timeSummary = summarizeIntakeTimes(med.intake_times);
  const doseLabel = `${med.dose} ${MEDICATION_UNIT_LABELS[med.unit] ?? med.unit}`;

  return (
    <Card onPress={onEdit} style={styles.medCard} padding={Spacing.md}>
      <View style={styles.medCardInner}>
        <View style={styles.medCardIcon}>
          <Text style={styles.medCardEmoji}>💊</Text>
        </View>
        <View style={styles.medCardContent}>
          <View style={styles.medCardTopRow}>
            <Text style={styles.medName} numberOfLines={1}>
              {med.name}
            </Text>
            {!med.active && (
              <View style={styles.pausedBadge}>
                <Text style={styles.pausedText}>Pause</Text>
              </View>
            )}
          </View>
          <Text style={styles.medDose}>{doseLabel}</Text>
          <Text style={styles.medTimes}>{timeSummary}</Text>
          {med.end_date && (
            <Text style={styles.medDuration}>{"Jusqu'au"} {med.end_date}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={onDelete}
          style={styles.medDeleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`Supprimer ${med.name}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.medDeleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header — matches AddEventModal / EditEventModal pattern
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerCancel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  headerTitle: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  headerRight: {
    // mirrors headerCancel width for centering
    width: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalClose: {
    fontSize: 20,
    color: Colors.textSecondary,
    width: 40,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  // Error
  errorBanner: {
    backgroundColor: Colors.danger + '10',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.danger + '55',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Fields
  field: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.xs,
  },
  labelOptional: {
    fontWeight: '400',
    color: Colors.textMuted,
    textTransform: 'lowercase',
    letterSpacing: 0,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    minHeight: 48,
  },
  inputMultiline: {
    height: 96,
    textAlignVertical: 'top',
  },

  // Photo zone — 200px tall, full width
  photoZone: {
    height: 200,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.surfaceAlt,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
  },
  photoOverlayText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  photoPlaceholderEmoji: {
    fontSize: 36,
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },

  // Valid-until
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  validUntilHint: {
    marginBottom: Spacing.sm,
  },
  hintText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // Medications section
  medsSection: {
    marginBottom: Spacing.lg,
  },
  medsTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  medsSaveFirstHint: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  medsSaveFirstText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  medsEmpty: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  addMedBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  addMedBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },

  // Medication card
  medCard: {
    marginBottom: Spacing.sm,
  },
  medCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  medCardIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medCardEmoji: {
    fontSize: 18,
  },
  medCardContent: {
    flex: 1,
    gap: 2,
  },
  medCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  medName: {
    ...Typography.h3,
    fontSize: 14,
    flex: 1,
  },
  pausedBadge: {
    backgroundColor: Colors.warningLight,
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pausedText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accent,
  },
  medDose: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  medTimes: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  medDuration: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  medDeleteBtn: {
    padding: 4,
  },
  medDeleteIcon: {
    fontSize: 16,
  },

  // Delete section
  deleteSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  // Sticky footer
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'android' ? Spacing.lg : Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
