// src/components/PregnancyView.tsx

import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppStore } from '../stores/useAppStore';
import { useMenstrualStore } from '../stores/useMenstrualStore';
import { getPregnancyTrimester, getPregnancyWeek } from '../utils/menstrualCalc';
import type { PregnancyData } from '../types';
import { Colors, Radius, Shadow, Spacing, Typography } from '../utils/theme';
import { Card } from './UI';

// ─── Constants ────────────────────────────────────────────────────────────────

const RING_SIZE = 220;
const RING_RADIUS = 90;
const STROKE_WIDTH = 16;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const APPT_LABELS: Record<string, string> = {
  echo_1: 'Écho. 1er trimestre',
  echo_2: 'Écho. 2e trimestre',
  echo_3: 'Écho. 3e trimestre',
  consultation: 'Consultation',
  analysis: 'Analyses',
  other: 'Autre',
};

const TRIMESTER_RANGES = [
  { tri: 1, label: '1er trimestre', weeks: '1–13' },
  { tri: 2, label: '2e trimestre',  weeks: '14–27' },
  { tri: 3, label: '3e trimestre',  weeks: '28–40' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface PregnancyViewProps {
  profileId: string;
  pregnancy: PregnancyData;
  navigation: any;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PregnancyView: React.FC<PregnancyViewProps> = ({ profileId, pregnancy, navigation }) => {
  const profiles = useAppStore((s) => s.profiles);
  const upsertProfile = useAppStore((s) => s.upsertProfile);
  const { updatePregnancy } = useMenstrualStore();

  const profile = profiles.find((p) => p.id === profileId);
  const today = new Date();
  const week = getPregnancyWeek(pregnancy, today);
  const trimester = getPregnancyTrimester(pregnancy, today);
  const progress = Math.min(week / 40, 1);
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const dueDate = parseISO(pregnancy.dueDate);
  const daysLeft = differenceInDays(dueDate, today);
  const triProgress = trimester === 1 ? week / 13 : trimester === 2 ? (week - 13) / 14 : (week - 27) / 13;

  const sortedAppts = [...pregnancy.appointments].sort((a, b) => a.date.localeCompare(b.date));
  const hasEcho = (type: string) => pregnancy.appointments.some((a) => a.type === type);

  const handleEndPregnancy = () => {
    Alert.alert(
      'Terminer le suivi de grossesse',
      'Que souhaitez-vous enregistrer ?',
      [
        { text: '🎉 Accouchement', onPress: () => endPregnancy('birth') },
        { text: 'Fausse couche', style: 'destructive', onPress: () => endPregnancy('miscarriage') },
        { text: 'IVG', style: 'destructive', onPress: () => endPregnancy('ivg') },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const endPregnancy = async (reason: 'birth' | 'miscarriage' | 'ivg') => {
    if (!profile) return;
    await updatePregnancy(pregnancy.id, { endDate: today.toISOString().slice(0, 10) });
    await upsertProfile({ ...profile, menstrualMode: 'tracking', updated_at: new Date().toISOString() });

    const messages: Record<string, string> = {
      birth: "Félicitations pour l'arrivée de ton bébé ! 🎉",
      miscarriage: 'Prends soin de toi. Toutes tes données sont conservées.',
      ivg: 'Prends soin de toi. Toutes tes données sont conservées.',
    };
    Alert.alert('Suivi de grossesse terminé', messages[reason]);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          🏥 Ne remplace pas un suivi médical. Consulte ton médecin ou ta sage-femme.
        </Text>
      </View>

      {/* Progress ring */}
      <View style={styles.ringSection}>
        <View style={styles.ringWrapper}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
              stroke={Colors.backgroundSecondary} strokeWidth={STROKE_WIDTH} fill="none"
            />
            <Circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
              stroke={Colors.primary} strokeWidth={STROKE_WIDTH} fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.ringContent}>
            <Text style={styles.ringWeek}>Semaine {week}</Text>
            <Text style={styles.ringTrimester}>Trimestre {trimester}</Text>
            {daysLeft > 0 ? (
              <Text style={styles.ringDays}>J − {daysLeft} jours</Text>
            ) : (
              <Text style={[styles.ringDays, { color: Colors.success }]}>DPA atteinte ✓</Text>
            )}
          </View>
        </View>
      </View>

      {/* Timeline cards */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Trimestre actuel</Text>
          <View style={styles.triProgressBar}>
            <View style={[styles.triProgressFill, { width: `${Math.min(triProgress, 1) * 100}%` }]} />
          </View>
          <Text style={styles.statSub}>{TRIMESTER_RANGES[trimester - 1].weeks} sem.</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Date prévue</Text>
          <Text style={styles.statValue}>{format(dueDate, 'd MMM yyyy', { locale: fr })}</Text>
        </Card>
      </View>

      {/* Echo suggestions */}
      {(['echo_1', 'echo_2', 'echo_3'] as const).some((t) => !hasEcho(t)) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Échographies suggérées</Text>
          {!hasEcho('echo_1') && week < 16 && (
            <SuggestionCard
              label="Écho. 1er trimestre (sem. 11–13)"
              onPress={() => navigation.navigate('AppointmentEditScreen', { profileId, pregnancyId: pregnancy.id, prefillType: 'echo_1' })}
            />
          )}
          {!hasEcho('echo_2') && week >= 10 && week < 24 && (
            <SuggestionCard
              label="Écho. 2e trimestre (sem. 20–22)"
              onPress={() => navigation.navigate('AppointmentEditScreen', { profileId, pregnancyId: pregnancy.id, prefillType: 'echo_2' })}
            />
          )}
          {!hasEcho('echo_3') && week >= 20 && week < 35 && (
            <SuggestionCard
              label="Écho. 3e trimestre (sem. 30–32)"
              onPress={() => navigation.navigate('AppointmentEditScreen', { profileId, pregnancyId: pregnancy.id, prefillType: 'echo_3' })}
            />
          )}
        </View>
      )}

      {/* Appointments */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rendez-vous médicaux</Text>
          <TouchableOpacity
            style={styles.addApptBtn}
            onPress={() => navigation.navigate('AppointmentEditScreen', { profileId, pregnancyId: pregnancy.id })}
          >
            <Text style={styles.addApptText}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>
        {sortedAppts.length === 0 ? (
          <Text style={styles.emptyAppt}>Aucun rendez-vous enregistré.</Text>
        ) : (
          sortedAppts.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => navigation.navigate('AppointmentEditScreen', { profileId, pregnancyId: pregnancy.id, appointmentId: a.id })}
            >
              <Card style={styles.apptCard}>
                <Text style={styles.apptType}>{APPT_LABELS[a.type] ?? a.type}</Text>
                <Text style={styles.apptDate}>{format(parseISO(a.date), 'd MMMM yyyy', { locale: fr })}</Text>
                {a.label && <Text style={styles.apptLabel}>{a.label}</Text>}
                {a.notes && <Text style={styles.apptNotes}>{a.notes}</Text>}
              </Card>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* End pregnancy */}
      <TouchableOpacity style={styles.endBtn} onPress={handleEndPregnancy}>
        <Text style={styles.endBtnText}>Terminer le suivi de grossesse</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

// ─── SuggestionCard ───────────────────────────────────────────────────────────

const SuggestionCard: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <Card style={suggStyles.card}>
    <View style={suggStyles.row}>
      <Text style={suggStyles.label}>{label}</Text>
      <TouchableOpacity style={suggStyles.btn} onPress={onPress}>
        <Text style={suggStyles.btnText}>Planifier</Text>
      </TouchableOpacity>
    </View>
  </Card>
);

const suggStyles = StyleSheet.create({
  card: { marginBottom: Spacing.sm, padding: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { flex: 1, fontSize: 13, color: Colors.text },
  btn: { paddingHorizontal: Spacing.md, paddingVertical: 5, backgroundColor: Colors.primaryMuted, borderRadius: Radius.full },
  btnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {},
  disclaimer: {
    margin: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.md,
  },
  disclaimerText: { fontSize: 12, color: Colors.primary, lineHeight: 18, textAlign: 'center' },

  ringSection: { alignItems: 'center', paddingVertical: Spacing.xl },
  ringWrapper: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringContent: { alignItems: 'center', gap: 4 },
  ringWeek: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  ringTrimester: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  ringDays: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  statCard: { flex: 1, padding: Spacing.md, gap: 6 },
  statLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  statValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  statSub: { fontSize: 11, color: Colors.textMuted },
  triProgressBar: { height: 6, backgroundColor: Colors.backgroundSecondary, borderRadius: 3, overflow: 'hidden' },
  triProgressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sectionTitle: { ...Typography.h3, marginBottom: Spacing.sm },
  addApptBtn: { paddingHorizontal: Spacing.md, paddingVertical: 5, backgroundColor: Colors.primaryMuted, borderRadius: Radius.full },
  addApptText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  emptyAppt: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },
  apptCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  apptType: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  apptDate: { fontSize: 13, color: Colors.text, marginTop: 2 },
  apptLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  apptNotes: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  endBtn: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center',
  },
  endBtnText: { fontSize: 13, color: Colors.textSecondary },
});
