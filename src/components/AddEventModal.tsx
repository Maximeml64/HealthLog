// src/components/AddEventModal.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  EventType,
  Profile,
  HealthEvent,
  EVENT_TYPE_ICONS,
  EVENT_TYPE_LABELS,
} from '../types';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { Avatar } from './UI';
import { EventForm } from './EventForm';
import * as DraftService from '../services/DraftService';
import type { EventDraft } from '../services/DraftService';

interface AddEventModalProps {
  visible: boolean;
  profiles: Profile[];
  onClose: () => void;
  onSave: (event: HealthEvent) => Promise<void>;
  defaultProfileId?: string | null;
  /** When set, skips the type-picker step (used by Quick-add on Home). */
  defaultEventType?: EventType | null;
}

const EVENT_TYPES: EventType[] = [
  'symptom', 'temperature', 'medication', 'appointment',
  'vaccine', 'weight', 'height', 'sleep', 'digestion',
  'appetite', 'mood', 'note',
];

const STEPS = ['profile', 'type', 'form'] as const;
type Step = typeof STEPS[number];

export const AddEventModal: React.FC<AddEventModalProps> = ({
  visible,
  profiles,
  onClose,
  onSave,
  defaultProfileId,
  defaultEventType,
}) => {
  const activeProfiles = profiles.filter((p) => !p.archived);

  // Compute initial step from BOTH default props so Quick-add (type + profile)
  // can jump straight to the form.
  const initialStep: Step = defaultEventType && defaultProfileId
    ? 'form'
    : defaultProfileId
      ? 'type'
      : 'profile';

  const [step, setStep] = useState<Step>(initialStep);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(defaultProfileId ?? null);
  const [selectedType, setSelectedType] = useState<EventType | null>(defaultEventType ?? null);
  const [resumedDraft, setResumedDraft] = useState<EventDraft | null>(null);

  const reset = useCallback(() => {
    setStep(
      defaultEventType && defaultProfileId
        ? 'form'
        : defaultProfileId
          ? 'type'
          : 'profile',
    );
    setSelectedProfileId(defaultProfileId ?? null);
    setSelectedType(defaultEventType ?? null);
    setResumedDraft(null);
  }, [defaultProfileId, defaultEventType]);

  // Re-sync when the consumer changes the defaultEventType (e.g. user taps a
  // different Quick-add button while the modal is open).
  React.useEffect(() => {
    if (visible) {
      setSelectedType(defaultEventType ?? null);
      if (defaultEventType && (defaultProfileId || selectedProfileId)) {
        setStep('form');
      }
    }
    // We deliberately re-run only when `visible` or `defaultEventType` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, defaultEventType]);

  // On open: check for a saved draft and offer to resume it. We only prompt
  // when the user hasn't passed an explicit Quick-add type — otherwise the
  // Quick-add intent takes precedence over a stale draft.
  React.useEffect(() => {
    if (!visible || defaultEventType) return;
    let cancelled = false;
    (async () => {
      const draft = await DraftService.loadDraft();
      if (cancelled) return;
      if (!draft || DraftService.isDraftEmpty(draft)) {
        // Nothing useful to resume — clean up any empty draft so we don't
        // keep prompting.
        if (draft) void DraftService.clearDraft();
        return;
      }
      // Make sure the referenced profile still exists; archived profiles
      // are fine (still resumable), deleted ones aren't.
      const profileStillExists = profiles.some((p) => p.id === draft.profile_id);
      if (!profileStillExists) {
        void DraftService.clearDraft();
        return;
      }
      Alert.alert(
        'Reprendre votre brouillon ?',
        `Un événement non enregistré (${EVENT_TYPE_LABELS[draft.event_type] ?? draft.event_type}) est en attente.`,
        [
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => { void DraftService.clearDraft(); },
          },
          {
            text: 'Reprendre',
            onPress: () => {
              setSelectedProfileId(draft.profile_id);
              setSelectedType(draft.event_type);
              setResumedDraft(draft);
              setStep('form');
            },
          },
        ],
        { cancelable: true },
      );
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSave = async (event: HealthEvent) => {
    await onSave(event);
    reset();
    onClose();
  };

  const selectedProfile = activeProfiles.find((p) => p.id === selectedProfileId);

  const renderProfileStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Pour qui ?</Text>
      {activeProfiles.length === 0 ? (
        <Text style={styles.emptyHint}>Aucun profil créé. Allez dans l'onglet Profils.</Text>
      ) : (
        <View style={styles.profileGrid}>
          {activeProfiles.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => {
                setSelectedProfileId(p.id);
                setStep('type');
              }}
              style={[styles.profileChip, { borderColor: p.color }]}
            >
              <Avatar name={p.display_name} color={p.color} size={36} />
              <Text style={[styles.profileChipLabel, { color: p.color }]}>{p.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderTypeStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Quel type ?</Text>
      <View style={styles.typeGrid}>
        {EVENT_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => {
              setSelectedType(type);
              setStep('form');
            }}
            style={styles.typeChip}
          >
            <Text style={styles.typeIcon}>{EVENT_TYPE_ICONS[type]}</Text>
            <Text style={styles.typeLabel}>{EVENT_TYPE_LABELS[type]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={step === 'profile' ? handleClose : () => setStep(step === 'form' ? 'type' : 'profile')}
              accessibilityRole="button"
              accessibilityLabel={step === 'profile' ? 'Fermer' : 'Étape précédente'}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.backBtnWrap}
            >
              <Text style={styles.backBtn}>{step === 'profile' ? '✕' : '←'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Ajouter un événement</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Progress */}
          <View style={styles.progress}>
            {STEPS.map((s, i) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  STEPS.indexOf(step) >= i && { backgroundColor: Colors.primary },
                ]}
              />
            ))}
          </View>

          {/* Step content */}
          <View style={{ flex: 1 }}>
            {step === 'profile' && renderProfileStep()}
            {step === 'type' && renderTypeStep()}
            {step === 'form' && selectedProfile && selectedType && (
              <EventForm
                key={selectedType}
                profile={selectedProfile}
                eventType={selectedType}
                initialValues={null}
                onSave={handleFormSave}
                onCancel={() => setStep('type')}
                enableDraft
                draftSeed={
                  resumedDraft && resumedDraft.profile_id === selectedProfile.id && resumedDraft.event_type === selectedType
                    ? resumedDraft
                    : null
                }
              />
            )}
          </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtnWrap: { padding: Spacing.xs },
  backBtn: { fontSize: 20, color: Colors.textSecondary, width: 40 },
  headerTitle: { ...Typography.h3 },
  progress: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  stepContent: { flex: 1, padding: Spacing.lg },
  stepTitle: { ...Typography.h2, marginBottom: Spacing.xl },
  profileGrid: { gap: Spacing.sm },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    backgroundColor: Colors.surface,
  },
  profileChipLabel: { fontSize: 16, fontWeight: '600' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: {
    width: '31%',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  typeIcon: { fontSize: 24 },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyHint: { ...Typography.bodySmall, textAlign: 'center', marginTop: Spacing.xl },
});
