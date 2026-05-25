// src/screens/PeriodEditScreen.tsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { addDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMenstrualStore } from '../stores/useMenstrualStore';
import type { BloodColor, BloodTexture, DayLog, FlowIntensity, MenstrualSymptom } from '../types';
import { BLOOD_COLOR_LABELS, BLOOD_TEXTURE_LABELS, FLOW_LABELS, SYMPTOM_LABELS } from '../constants/menstrualLabels';
import { DateTimeField } from '../components/DateTimeField';
import { Colors, Radius, Spacing, Typography } from '../utils/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type FlowOption = FlowIntensity | 'none';

const FLOW_OPTIONS: FlowOption[] = ['none', 'light', 'medium', 'heavy'];
const FLOW_OPTION_LABELS: Record<FlowOption, string> = { none: 'Aucun', ...FLOW_LABELS };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function datesInRange(start: string, end: string): string[] {
  const s = parseISO(start);
  const e = parseISO(end);
  if (s > e) return [start];
  const result: string[] = [];
  for (let d = s; d <= e; d = addDays(d, 1)) result.push(format(d, 'yyyy-MM-dd'));
  return result;
}

// ─── PeriodEditScreen ─────────────────────────────────────────────────────────

export default function PeriodEditScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PeriodEditScreen'>>();
  const { profileId, mode, cycleId, date: routeDate } = route.params;

  const {
    cycles, addCycle, updateCycle, deleteCycle, upsertDayLog,
  } = useMenstrualStore();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const profileCycles = useMemo(
    () => cycles.filter((c) => c.profileId === profileId),
    [cycles, profileId]
  );

  // Existing data for edit modes
  const existingCycle = useMemo(
    () => (mode === 'editCycle' && cycleId ? cycles.find((c) => c.id === cycleId) : undefined),
    [mode, cycleId, cycles]
  );

  // For editDay — find cycle that contains this date
  const containingCycle = useMemo(() => {
    if (mode !== 'editDay' || !routeDate) return undefined;
    return profileCycles.find((c) => {
      const end = c.endDate ?? todayStr;
      return routeDate >= c.startDate && routeDate <= end;
    });
  }, [mode, routeDate, profileCycles, todayStr]);

  // ── Form state ────────────────────────────────────────────────────────────

  const [startDate, setStartDate] = useState(() => {
    if (mode === 'editCycle' && existingCycle) return existingCycle.startDate;
    if (mode === 'editDay') return routeDate ?? todayStr;
    return todayStr;
  });

  const [endDate, setEndDate] = useState(
    () => (mode === 'editCycle' && existingCycle ? existingCycle.endDate ?? '' : '')
  );

  const [dayLogs, setDayLogs] = useState<DayLog[]>(() => {
    if (mode === 'editCycle' && existingCycle) return [...existingCycle.dayLogs];
    if (mode === 'editDay') {
      const existing = containingCycle?.dayLogs.find((l) => l.date === routeDate);
      return [existing ?? { date: routeDate ?? todayStr }];
    }
    return [];
  });

  const [selectedDay, setSelectedDay] = useState(
    () => (mode === 'editDay' ? (routeDate ?? todayStr) : startDate)
  );

  const [errors, setErrors] = useState<{ startDate?: string; endDate?: string; temp?: string }>({});
  const [saving, setSaving] = useState(false);

  // ── Day log helpers ───────────────────────────────────────────────────────

  const getDayLog = (date: string): DayLog =>
    dayLogs.find((l) => l.date === date) ?? { date };

  const updateDayLog = (date: string, updates: Partial<DayLog>) => {
    setDayLogs((prev) => {
      const idx = prev.findIndex((l) => l.date === date);
      if (idx >= 0) return prev.map((l, i) => (i === idx ? { ...l, ...updates } : l));
      return [...prev, { date, ...updates }];
    });
  };

  const toggleSymptom = (date: string, s: MenstrualSymptom) => {
    const log = getDayLog(date);
    const current = log.symptoms ?? [];
    updateDayLog(date, {
      symptoms: current.includes(s) ? current.filter((x) => x !== s) : [...current, s],
    });
  };

  // ── Days to display ───────────────────────────────────────────────────────

  const daysToShow = useMemo(() => {
    if (mode === 'editDay') return [routeDate ?? todayStr];
    if (!startDate) return [];
    if (!endDate || endDate < startDate) return [startDate];
    return datesInRange(startDate, endDate);
  }, [mode, routeDate, startDate, endDate, todayStr]);

  useEffect(() => {
    if (daysToShow.length > 0 && !daysToShow.includes(selectedDay)) {
      setSelectedDay(daysToShow[0]);
    }
  }, [daysToShow, selectedDay]);

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: typeof errors = {};
    const todayDate = new Date();
    if (!startDate) {
      errs.startDate = 'Date de début requise';
    } else if (parseISO(startDate) > todayDate) {
      errs.startDate = 'La date ne peut pas être dans le futur';
    }
    if (endDate) {
      if (endDate < startDate) errs.endDate = 'La date de fin doit être après le début';
      else if (parseISO(endDate) > todayDate) errs.endDate = 'La date ne peut pas être dans le futur';
    }
    const log = getDayLog(selectedDay);
    if (log.basalTemperature !== undefined && (log.basalTemperature < 35 || log.basalTemperature > 38.5)) {
      errs.temp = 'Température plausible : 35,0–38,5 °C';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const hasData = (log: DayLog) =>
        log.flow != null || (log.symptoms?.length ?? 0) > 0 || !!log.notes || log.basalTemperature != null;

      if (mode === 'createCycle') {
        const id = await addCycle(profileId, startDate, endDate || undefined);
        for (const log of dayLogs.filter(hasData)) await upsertDayLog(id, log);

      } else if (mode === 'editCycle' && cycleId) {
        await updateCycle(cycleId, { startDate, endDate: endDate || undefined });
        for (const log of dayLogs) await upsertDayLog(cycleId, log);

      } else if (mode === 'editDay') {
        const log = dayLogs[0] ?? { date: routeDate ?? todayStr };
        if (containingCycle) {
          await upsertDayLog(containingCycle.id, log);
        } else {
          const newId = await addCycle(profileId, routeDate ?? todayStr, undefined);
          if (hasData(log)) await upsertDayLog(newId, log);
        }
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!cycleId) return;
    Alert.alert('Supprimer ce cycle ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteCycle(cycleId); navigation.goBack(); } },
    ]);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const title = mode === 'createCycle' ? 'Nouveau cycle' : mode === 'editCycle' ? 'Modifier le cycle' : 'Modifier le jour';
  const log = getDayLog(selectedDay);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Annuler"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.headerCancel}>Annuler</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.headerSave, saving && { opacity: 0.5 }]}>{saving ? '…' : 'Enregistrer'}</Text>
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

        {/* Banner — editDay sans cycle */}
        {mode === 'editDay' && !containingCycle && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              {"📅 Ce jour ne fait partie d'aucun cycle. Un nouveau cycle débutera à cette date."}
            </Text>
          </View>
        )}

        {/* ── Section 1 : Dates ─────────────────────────────────────────── */}
        {(mode === 'createCycle' || mode === 'editCycle') && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DATES</Text>
            <DateTimeField
              label="DATE DE DÉBUT *"
              mode="date"
              value={startDate || null}
              onChange={(v) => { setStartDate(v); setErrors((e) => ({ ...e, startDate: undefined })); }}
            />
            {errors.startDate && <Text style={styles.fieldError}>{errors.startDate}</Text>}

            <DateTimeField
              label="DATE DE FIN (optionnel)"
              mode="date"
              value={endDate || null}
              onChange={(v) => { setEndDate(v); setErrors((e) => ({ ...e, endDate: undefined })); }}
              placeholder="JJ/MM/AAAA — vide si en cours"
            />
            {errors.endDate && <Text style={styles.fieldError}>{errors.endDate}</Text>}
            <Text style={styles.helperText}>Laisser vide si les règles ne sont pas terminées</Text>
          </View>
        )}

        {/* ── Section 2 : Flux quotidien ────────────────────────────────── */}
        {daysToShow.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FLUX QUOTIDIEN</Text>
            {daysToShow.map((date) => {
              const dl = getDayLog(date);
              return (
                <View key={date} style={styles.flowRow}>
                  <Text style={styles.flowDateLabel}>
                    {format(parseISO(date), 'EEE d MMM', { locale: fr })}
                  </Text>
                  <View style={styles.flowChips}>
                    {FLOW_OPTIONS.map((opt) => {
                      const isSelected = opt === 'none' ? !dl.flow : dl.flow === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.flowChip, isSelected && styles.flowChipSelected]}
                          onPress={() => updateDayLog(date, { flow: opt === 'none' ? undefined : opt as FlowIntensity })}
                        >
                          <Text style={[styles.flowChipText, isSelected && styles.flowChipTextSelected]}>
                            {FLOW_OPTION_LABELS[opt]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Sélecteur de jour (multi-day) ────────────────────────────── */}
        {daysToShow.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DÉTAILS POUR LE JOUR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelector}>
              {daysToShow.map((date) => {
                const isSel = date === selectedDay;
                return (
                  <TouchableOpacity
                    key={date}
                    onPress={() => setSelectedDay(date)}
                    style={[styles.daySelectorChip, isSel && styles.daySelectorChipSelected]}
                  >
                    <Text style={[styles.daySelectorText, isSel && styles.daySelectorTextSelected]}>
                      {format(parseISO(date), 'd MMM', { locale: fr })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Section 3 : Aspect des saignements ───────────────────────── */}
        {daysToShow.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ASPECT DES SAIGNEMENTS</Text>

            <Text style={styles.subSectionLabel}>Couleur</Text>
            <View style={styles.colorChipGrid}>
              {(Object.keys(BLOOD_COLOR_LABELS) as BloodColor[]).map((color) => {
                const { label: colorLabel, hex, isWarning } = BLOOD_COLOR_LABELS[color];
                const isSelected = log.color === color;
                return (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorChip, isSelected && styles.colorChipSelected]}
                    onPress={() => updateDayLog(selectedDay, { color: isSelected ? undefined : color })}
                    accessibilityRole="button"
                    accessibilityLabel={colorLabel}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={[styles.colorSwatch, { backgroundColor: hex }]} />
                    <Text style={[styles.colorChipLabel, isSelected && styles.colorChipLabelSelected]}>
                      {colorLabel}
                    </Text>
                    {isWarning && <Text style={styles.colorWarningDot}>⚠️</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
            {log.color && BLOOD_COLOR_LABELS[log.color].isWarning && (
              <View style={styles.colorWarningBanner}>
                <Text style={styles.colorWarningText}>
                  {"⚠️ Cette couleur peut indiquer une infection. Consulte un professionnel de santé si elle persiste."}
                </Text>
              </View>
            )}

            <Text style={[styles.subSectionLabel, { marginTop: Spacing.md }]}>Texture</Text>
            <View style={styles.textureList}>
              {(Object.keys(BLOOD_TEXTURE_LABELS) as BloodTexture[]).map((texture) => {
                const { label: texLabel, description } = BLOOD_TEXTURE_LABELS[texture];
                const isSelected = log.texture === texture;
                return (
                  <TouchableOpacity
                    key={texture}
                    style={[styles.textureChip, isSelected && styles.textureChipSelected]}
                    onPress={() => updateDayLog(selectedDay, { texture: isSelected ? undefined : texture })}
                    accessibilityRole="button"
                    accessibilityLabel={texLabel}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.textureLabel, isSelected && styles.textureLabelSelected]}>
                        {texLabel}
                      </Text>
                      {description && (
                        <Text style={styles.textureDesc}>{description}</Text>
                      )}
                    </View>
                    {isSelected && <Text style={styles.textureCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Section 4 : Symptômes ─────────────────────────────────────── */}
        {daysToShow.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SYMPTÔMES</Text>
            <View style={styles.chipGrid}>
              {(Object.keys(SYMPTOM_LABELS) as MenstrualSymptom[]).map((s) => {
                const isSel = (log.symptoms ?? []).includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.symptomChip, isSel && styles.symptomChipSelected]}
                    onPress={() => toggleSymptom(selectedDay, s)}
                  >
                    <Text style={styles.symptomIcon}>{SYMPTOM_LABELS[s].icon}</Text>
                    <Text style={[styles.symptomText, isSel && styles.symptomTextSelected]}>
                      {SYMPTOM_LABELS[s].label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Section 4 : Notes ─────────────────────────────────────────── */}
        {daysToShow.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NOTES</Text>
            <TextInput
              style={styles.notesInput}
              value={log.notes ?? ''}
              onChangeText={(v) => updateDayLog(selectedDay, { notes: v || undefined })}
              placeholder="Notes du jour…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={5}
              maxLength={500}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* ── Section 5 : Température basale ───────────────────────────── */}
        {daysToShow.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TEMPÉRATURE BASALE (optionnel)</Text>
            <View style={styles.tempRow}>
              <TextInput
                style={[styles.tempInput, errors.temp ? styles.inputError : undefined]}
                value={log.basalTemperature !== undefined ? String(log.basalTemperature).replace('.', ',') : ''}
                onChangeText={(text) => {
                  const num = parseFloat(text.replace(',', '.'));
                  updateDayLog(selectedDay, { basalTemperature: text && !isNaN(num) ? num : undefined });
                  setErrors((e) => ({ ...e, temp: undefined }));
                }}
                keyboardType="decimal-pad"
                placeholder="36,5"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="done"
              />
              <Text style={styles.tempUnit}>°C</Text>
            </View>
            {errors.temp
              ? <Text style={styles.fieldError}>{errors.temp}</Text>
              : <Text style={styles.helperText}>Mesurée au réveil, utile pour le suivi de fertilité</Text>}
          </View>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        {mode === 'editCycle' && (
          <View style={styles.deleteSection}>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} accessibilityRole="button">
              <Text style={styles.deleteBtnText}>🗑️ Supprimer ce cycle</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 20 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerCancel: { fontSize: 15, color: Colors.textSecondary },
  headerTitle: { ...Typography.h3 },
  headerSave: { fontSize: 15, color: Colors.primary, fontWeight: '700' },

  // Banner
  infoBanner: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  infoBannerText: { fontSize: 13, color: Colors.primary, lineHeight: 18 },

  // Sections
  section: { marginBottom: Spacing.xl },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.md },
  fieldError: { fontSize: 11, color: Colors.danger, marginTop: 4, marginBottom: Spacing.xs },
  helperText: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },

  // Flow
  flowRow: { marginBottom: Spacing.md },
  flowDateLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs, textTransform: 'capitalize' },
  flowChips: { flexDirection: 'row', gap: Spacing.xs },
  flowChip: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  flowChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  flowChipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  flowChipTextSelected: { color: Colors.primary, fontWeight: '700' },

  // Day selector
  daySelector: { gap: Spacing.sm, paddingVertical: 2 },
  daySelectorChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  daySelectorChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  daySelectorText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  daySelectorTextSelected: { color: Colors.primary, fontWeight: '700' },

  // Symptoms
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  symptomChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  symptomChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  symptomIcon: { fontSize: 14 },
  symptomText: { fontSize: 13, color: Colors.textSecondary },
  symptomTextSelected: { color: Colors.primary, fontWeight: '600' },

  // Notes
  notesInput: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: 15, color: Colors.text, minHeight: 100, textAlignVertical: 'top' },

  // Temperature
  tempRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tempInput: { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: 15, color: Colors.text, minHeight: 48 },
  tempUnit: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  inputError: { borderColor: Colors.danger },

  // Blood color + texture
  subSectionLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  colorChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  colorChip: { alignItems: 'center', padding: Spacing.sm, minWidth: 72, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  colorChipSelected: { borderWidth: 2, borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  colorSwatch: { width: 28, height: 28, borderRadius: 14, marginBottom: 4 },
  colorChipLabel: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  colorChipLabelSelected: { color: Colors.primary, fontWeight: '600' },
  colorWarningDot: { fontSize: 10, marginTop: 2 },
  colorWarningBanner: { marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.warningLight, borderRadius: Radius.md },
  colorWarningText: { fontSize: 12, color: Colors.warning, lineHeight: 17 },
  textureList: { gap: Spacing.xs },
  textureChip: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  textureChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  textureLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  textureLabelSelected: { color: Colors.primary },
  textureDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  textureCheck: { fontSize: 18, color: Colors.primary, fontWeight: '700', marginLeft: Spacing.sm },

  // Delete
  deleteSection: { marginTop: Spacing.xl, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border },
  deleteBtn: { backgroundColor: Colors.danger, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  deleteBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
