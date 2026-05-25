// src/screens/PregnancyStartScreen.tsx

import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAppStore } from '../stores/useAppStore';
import { useMenstrualStore } from '../stores/useMenstrualStore';
import { DateTimeField } from '../components/DateTimeField';
import { Colors, Radius, Spacing, Typography } from '../utils/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PregnancyStartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PregnancyStartScreen'>>();
  const { profileId, prefillLmpDate } = route.params;

  const profiles = useAppStore((s) => s.profiles);
  const upsertProfile = useAppStore((s) => s.upsertProfile);
  const { addPregnancy } = useMenstrualStore();

  const today = new Date().toISOString().slice(0, 10);
  const profile = profiles.find((p) => p.id === profileId);

  const [lmpDate, setLmpDate] = useState(prefillLmpDate ?? '');
  const [dueDate, setDueDate] = useState(() =>
    prefillLmpDate ? addDays(prefillLmpDate, 280) : ''
  );
  const [dueDateManual, setDueDateManual] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ lmp?: string; dpa?: string }>({});
  const [saving, setSaving] = useState(false);

  const handleLmpChange = (v: string) => {
    setLmpDate(v);
    if (!dueDateManual && v) setDueDate(addDays(v, 280));
    setErrors((e) => ({ ...e, lmp: undefined }));
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!lmpDate) errs.lmp = 'Date requise';
    else if (lmpDate > today) errs.lmp = 'La LMP ne peut pas être dans le futur';
    if (!dueDate) errs.dpa = 'Date requise';
    else if (dueDate < lmpDate) errs.dpa = 'La DPA doit être après la LMP';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !profile) return;
    setSaving(true);
    try {
      await addPregnancy(profileId, lmpDate, dueDate);
      await upsertProfile({
        ...profile,
        menstrualMode: 'pregnancy',
        updated_at: new Date().toISOString(),
      });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Annuler"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.cancel}>Annuler</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Grossesse</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Commencer"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.save, saving && { opacity: 0.5 }]}>{saving ? '…' : 'Commencer'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={Platform.OS === 'ios' ? 80 : 0}
        showsVerticalScrollIndicator={false}
      >
        <DateTimeField
          label="DATE DES DERNIÈRES RÈGLES (LMP) *"
          mode="date"
          value={lmpDate || null}
          onChange={handleLmpChange}
        />
        {errors.lmp && <Text style={styles.fieldError}>{errors.lmp}</Text>}
        <Text style={styles.helper}>
          {"Cette date permet de calculer la semaine de grossesse et la date prévue d'accouchement."}
        </Text>

        <DateTimeField
          label="DATE PRÉVUE D'ACCOUCHEMENT (DPA)"
          mode="date"
          value={dueDate || null}
          onChange={(v) => { setDueDate(v); setDueDateManual(true); setErrors((e) => ({ ...e, dpa: undefined })); }}
        />
        {errors.dpa && <Text style={styles.fieldError}>{errors.dpa}</Text>}
        {!dueDateManual && lmpDate ? (
          <Text style={styles.helper}>Calculée automatiquement (LMP + 280 jours).</Text>
        ) : (
          <Text style={styles.helper}>
            {"Tu peux l'ajuster après ta première échographie."}
          </Text>
        )}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>NOTES (optionnel)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes…"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            🏥 Cette app ne remplace pas un suivi médical professionnel. Consulte ton médecin ou ta sage-femme pour un suivi adapté.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cancel: { fontSize: 15, color: Colors.textSecondary },
  title: { ...Typography.h3 },
  save: { fontSize: 15, color: Colors.primary, fontWeight: '700' },
  content: { padding: Spacing.lg },
  fieldError: { fontSize: 11, color: Colors.danger, marginTop: 4, marginBottom: Spacing.sm },
  helper: { fontSize: 11, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing.lg },
  field: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.xs },
  notesInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, fontSize: 15, color: Colors.text,
    minHeight: 90, textAlignVertical: 'top',
  },
  disclaimer: {
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.md,
    padding: Spacing.md, marginTop: Spacing.md,
  },
  disclaimerText: { fontSize: 12, color: Colors.primary, lineHeight: 18 },
});
