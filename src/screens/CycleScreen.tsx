// src/screens/CycleScreen.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle } from 'react-native-svg';
import {
  addDays, addMonths, eachDayOfInterval, format, getDaysInMonth,
  getDay, isSameDay, parseISO, startOfMonth, subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAppStore } from '../stores/useAppStore';
import { useMenstrualStore } from '../stores/useMenstrualStore';
import {
  getCycleStats, getCurrentPhase, getDayOfCycle, getDaysUntilNextPeriod,
  getFertilityWindow, predictNextPeriod, type CyclePhase,
} from '../utils/menstrualCalc';
import { useToday } from '../utils/useToday';
import { Colors, Radius, Spacing, Typography } from '../utils/theme';
import { Card, EmptyState, SectionHeader } from '../components/UI';
import { FAB } from '../components/FAB';
import { ModeSwitcher } from '../components/ModeSwitcher';
import { PregnancyView } from '../components/PregnancyView';
import { TTCView } from '../components/TTCView';
import type { MenstrualMode } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const RING_SIZE = 200;
const RING_RADIUS = 82;
const STROKE_WIDTH = 16;
const WEEK_DAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

const PHASE_LABELS: Record<CyclePhase, string> = {
  menstruation: 'Menstruation',
  follicular: 'Phase folliculaire',
  ovulation: 'Ovulation',
  luteal: 'Phase lutéale',
};

const PHASE_COLORS: Record<CyclePhase, string> = {
  menstruation: Colors.danger,
  follicular: Colors.warning,
  ovulation: Colors.success,
  luteal: Colors.primary,
};

// Monday-first weekday index (Mo=0 … Su=6)
const weekdayMon = (d: Date) => (getDay(d) + 6) % 7;

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── CycleScreen ──────────────────────────────────────────────────────────────

export default function CycleScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'CycleScreen'>>();
  const navigation = useNavigation<Nav>();
  const { profileId } = route.params;

  const profiles = useAppStore((s) => s.profiles);
  const upsertProfile = useAppStore((s) => s.upsertProfile);
  const { cycles, loadMenstrualData, getActivePregnancy } = useMenstrualStore();

  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [modeSwitcherVisible, setModeSwitcherVisible] = useState(false);
  const today = useToday();

  useEffect(() => { loadMenstrualData(); }, [loadMenstrualData]);

  const profile = profiles.find((p) => p.id === profileId);
  const profileCycles = useMemo(() => cycles.filter((c) => c.profileId === profileId), [cycles, profileId]);
  const stats = useMemo(() => getCycleStats(profileCycles), [profileCycles]);

  // All useMemo hooks must be declared before any early return
  const fertility = useMemo(() => getFertilityWindow(profileCycles, today), [profileCycles, today]);
  const nextPeriodDate = useMemo(() => predictNextPeriod(profileCycles, today), [profileCycles, today]);

  const { periodDateSet, fertileDateSet, ovulationDateStr, predictedDateSet } = useMemo(() => {
    const periodDateSet = new Set<string>();
    const fertileDateSet = new Set<string>();
    const predictedDateSet = new Set<string>();
    for (const c of profileCycles) {
      if (c.endDate) {
        const start = parseISO(c.startDate);
        const end = parseISO(c.endDate);
        if (start <= end) for (const d of eachDayOfInterval({ start, end })) periodDateSet.add(format(d, 'yyyy-MM-dd'));
      }
    }
    const active = profileCycles.find((c) => c.endDate == null);
    if (active) {
      const start = parseISO(active.startDate);
      if (start <= today) for (const d of eachDayOfInterval({ start, end: today })) periodDateSet.add(format(d, 'yyyy-MM-dd'));
    }
    let ovulationDateStr: string | null = null;
    if (fertility) {
      for (const d of eachDayOfInterval({ start: fertility.start, end: fertility.end })) fertileDateSet.add(format(d, 'yyyy-MM-dd'));
      ovulationDateStr = format(fertility.ovulationDay, 'yyyy-MM-dd');
    }
    if (nextPeriodDate) {
      for (let i = 0; i < stats.avgPeriodLength; i++) predictedDateSet.add(format(addDays(nextPeriodDate, i), 'yyyy-MM-dd'));
    }
    return { periodDateSet, fertileDateSet, ovulationDateStr, predictedDateSet };
  }, [profileCycles, fertility, nextPeriodDate, stats.avgPeriodLength, today]);

  const calendarWeeks = useMemo(() => {
    const first = startOfMonth(calendarMonth);
    const offset = weekdayMon(first);
    const cells: (Date | null)[] = [
      ...Array<null>(offset).fill(null),
      ...Array.from({ length: getDaysInMonth(calendarMonth) }, (_, i) => addDays(first, i)),
    ];
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [calendarMonth]);

  const recentCycles = useMemo(
    () => [...profileCycles].sort((a, b) => b.startDate.localeCompare(a.startDate)).slice(0, 5),
    [profileCycles]
  );

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState emoji="❓" title="Profil introuvable" />
      </SafeAreaView>
    );
  }

  if (!(profile.menstrualTrackingEnabled ?? false)) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <EmptyState
          emoji="🔒"
          title="Suivi menstruel non activé"
          subtitle="Active le suivi dans les paramètres du profil."
          action={{ label: 'Aller au profil', onPress: () => navigation.navigate('ProfileDetail', { profileId }) }}
        />
      </SafeAreaView>
    );
  }

  const mode = profile.menstrualMode ?? 'tracking';
  const activePregnancy = getActivePregnancy(profileId);

  const handleSelectMode = async (newMode: MenstrualMode) => {
    setModeSwitcherVisible(false);
    if (newMode === 'pregnancy' && !activePregnancy) {
      const lastCycle = [...profileCycles].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
      navigation.navigate('PregnancyStartScreen', { profileId, prefillLmpDate: lastCycle?.startDate });
      return;
    }
    await upsertProfile({ ...profile, menstrualMode: newMode, updated_at: new Date().toISOString() });
  };

  // Shared header rendered across all 3 modes
  const sharedHeader = (title: string) => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Retour"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSub}>{profile.display_name}</Text>
      </View>
      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={() => setModeSwitcherVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Changer de mode"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.settingsIcon}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Pregnancy mode ────────────────────────────────────────────────────────

  if (mode === 'pregnancy') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {sharedHeader('Grossesse')}
        <ModeSwitcher visible={modeSwitcherVisible} currentMode={mode} onClose={() => setModeSwitcherVisible(false)} onSelectMode={handleSelectMode} />
        {activePregnancy ? (
          <PregnancyView profileId={profileId} pregnancy={activePregnancy} navigation={navigation} />
        ) : (
          <EmptyState
            emoji="🤰"
            title="Aucune grossesse active"
            subtitle="Configure le suivi de grossesse pour commencer."
            action={{ label: 'Démarrer le suivi grossesse', onPress: () => navigation.navigate('PregnancyStartScreen', { profileId }) }}
          />
        )}
        <FAB onPress={() => navigation.navigate('PeriodEditScreen', { profileId, mode: 'createCycle' })} />
      </SafeAreaView>
    );
  }

  // ── Computed values (non-hooks, tracking view only) ──────────────────────

  const phase = getCurrentPhase(profileCycles, today);
  const phaseColor = phase ? PHASE_COLORS[phase] : Colors.border;
  const dayOfCycle = getDayOfCycle(profileCycles, today);
  const daysUntilNext = getDaysUntilNextPeriod(profileCycles, today);
  const isFertileNow = fertility != null && today >= fertility.start && today <= fertility.end;

  // ── Render ────────────────────────────────────────────────────────────────

  // ── TTC mode delegates to TTCView ────────────────────────────────────────

  if (mode === 'ttc') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {sharedHeader('Cycle · TTC')}
        <ModeSwitcher visible={modeSwitcherVisible} currentMode={mode} onClose={() => setModeSwitcherVisible(false)} onSelectMode={handleSelectMode} />
        <TTCView
          profileId={profileId}
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          navigation={navigation}
          recentCycles={recentCycles}
          profileCycles={profileCycles}
        />
        <FAB onPress={() => navigation.navigate('PeriodEditScreen', { profileId, mode: 'createCycle' })} />
      </SafeAreaView>
    );
  }

  // ── Tracking mode (default) ───────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ModeSwitcher visible={modeSwitcherVisible} currentMode={mode} onClose={() => setModeSwitcherVisible(false)} onSelectMode={handleSelectMode} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        {sharedHeader('Cycle')}

        {profileCycles.length === 0 ? (
          <EmptyState
            emoji="🌸"
            title="Commence ton suivi"
            subtitle="Enregistre ta première période pour obtenir des prédictions et statistiques."
            action={{ label: '+ Ajouter ma première période', onPress: () => navigation.navigate('PeriodEditScreen', { profileId, mode: 'createCycle' }) }}
          />
        ) : (
          <>
            {/* ── Phase ring ─────────────────────────────────────────────── */}
            <View style={styles.ringSection}>
              <View style={styles.ringWrapper}>
                <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
                  <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={Colors.backgroundSecondary} strokeWidth={STROKE_WIDTH} fill="none" />
                  <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={phaseColor} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round" />
                </Svg>
                <View style={styles.ringContent}>
                  <Text style={[styles.phaseLabel, { color: phaseColor }]}>
                    {phase ? PHASE_LABELS[phase] : 'Données insuffisantes'}
                  </Text>
                  {dayOfCycle != null && <Text style={styles.dayOfCycle}>Jour {dayOfCycle}</Text>}
                  {isFertileNow && (
                    <View style={[styles.fertileBadge, { backgroundColor: Colors.success + '20', borderColor: Colors.success }]}>
                      <Text style={[styles.fertileBadgeText, { color: Colors.success }]}>Fertile</Text>
                    </View>
                  )}
                </View>
              </View>

              {daysUntilNext != null && (
                <Text style={styles.nextPeriod}>
                  {daysUntilNext > 0
                    ? `Prochaines règles dans ${daysUntilNext} jour${daysUntilNext > 1 ? 's' : ''}`
                    : daysUntilNext === 0
                    ? "Prochaines règles aujourd'hui"
                    : `Règles en retard de ${Math.abs(daysUntilNext)} jour${Math.abs(daysUntilNext) > 1 ? 's' : ''}`}
                </Text>
              )}

            </View>

            {/* ── Stats ──────────────────────────────────────────────────── */}
            <View style={styles.statsSection}>
              <View style={styles.statsRow}>
                <Card style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.avgCycleLength}</Text>
                  <Text style={styles.statUnit}>jours</Text>
                  <Text style={styles.statTitle}>Cycle moyen</Text>
                </Card>
                <Card style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.avgPeriodLength}</Text>
                  <Text style={styles.statUnit}>jours</Text>
                  <Text style={styles.statTitle}>Règles moyennes</Text>
                </Card>
              </View>
              <Text style={styles.statsMeta}>
                Calculé sur {stats.cyclesAnalyzed} cycle{stats.cyclesAnalyzed !== 1 ? 's' : ''}
                {!stats.isReliable && stats.cyclesAnalyzed > 0 ? ' · Estimation préliminaire' : ''}
              </Text>
            </View>

            {/* ── Calendar ───────────────────────────────────────────────── */}
            <View style={styles.calSection}>
              <View style={styles.calHeader}>
                <TouchableOpacity onPress={() => setCalendarMonth((m) => subMonths(m, 1))} accessibilityRole="button" accessibilityLabel="Mois précédent">
                  <Text style={styles.calNavBtn}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.calTitle}>{format(calendarMonth, 'MMMM yyyy', { locale: fr })}</Text>
                <TouchableOpacity onPress={() => setCalendarMonth((m) => addMonths(m, 1))} accessibilityRole="button" accessibilityLabel="Mois suivant">
                  <Text style={styles.calNavBtn}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.weekDaysRow}>
                {WEEK_DAYS.map((d) => <Text key={d} style={styles.weekDayLabel}>{d}</Text>)}
              </View>

              {calendarWeeks.map((week, wi) => (
                <View key={wi} style={styles.weekRow}>
                  {week.map((day, di) => {
                    if (!day) return <View key={di} style={styles.dayCell} />;
                    const ds = format(day, 'yyyy-MM-dd');
                    const isPeriod = periodDateSet.has(ds);
                    const isFertile = fertileDateSet.has(ds);
                    const isOvulation = ds === ovulationDateStr;
                    const isPredicted = predictedDateSet.has(ds) && !isPeriod;
                    const isToday = isSameDay(day, today);
                    return (
                      <TouchableOpacity
                        key={di}
                        style={[
                          styles.dayCell,
                          isFertile && !isOvulation && styles.dayCellFertile,
                          isOvulation && styles.dayCellOvulation,
                          isPeriod && styles.dayCellPeriod,
                          isPredicted && styles.dayCellPredicted,
                          isToday && styles.dayCellToday,
                        ]}
                        onPress={() => navigation.navigate('PeriodEditScreen', { profileId, mode: 'editDay', date: ds })}
                        accessibilityRole="button"
                        accessibilityLabel={format(day, 'd MMMM', { locale: fr })}
                      >
                        <Text style={[
                          styles.dayText,
                          (isPeriod || isOvulation) && styles.dayTextOnDark,
                          isToday && !isPeriod && styles.dayTextToday,
                        ]}>
                          {format(day, 'd')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              <View style={styles.legend}>
                {[
                  { color: Colors.danger, label: 'Règles' },
                  { color: Colors.success, label: 'Ovulation' },
                  { color: Colors.success + '40', label: 'Fenêtre fertile' },
                  { color: Colors.danger + '30', label: 'Prévision' },
                ].map(({ color, label }) => (
                  <View key={label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <Text style={styles.legendLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Cycles passés ──────────────────────────────────────────── */}
            {recentCycles.length > 0 && (
              <View style={styles.cyclesSection}>
                <SectionHeader title="Cycles passés" count={profileCycles.length} />
                {recentCycles.map((c) => {
                  const start = parseISO(c.startDate);
                  const end = c.endDate ? parseISO(c.endDate) : null;
                  const periodDays = end
                    ? Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
                    : null;
                  const hasWarningColor = c.dayLogs.some(
                    (l) => l.color === 'orange' || l.color === 'gray'
                  );
                  return (
                    <TouchableOpacity key={c.id} onPress={() => navigation.navigate('PeriodEditScreen', { profileId, mode: 'editCycle', cycleId: c.id })} accessibilityRole="button">
                      <Card style={styles.cycleCard}>
                        <View style={styles.cycleRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cycleDate}>
                              {format(start, 'd MMM yyyy', { locale: fr })}
                              {end ? ` → ${format(end, 'd MMM', { locale: fr })}` : ' → en cours'}
                            </Text>
                            {periodDays != null && (
                              <Text style={styles.cycleMeta}>Règles : {periodDays} jour{periodDays > 1 ? 's' : ''}</Text>
                            )}
                          </View>
                          {hasWarningColor && (
                            <View style={styles.cycleWarningBadge}>
                              <Text style={styles.cycleWarningText}>⚠️ À surveiller</Text>
                            </View>
                          )}
                          <Text style={styles.cycleChevron}>›</Text>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
                {profileCycles.length > 5 && (
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert(
                        'Bientôt',
                        'La liste complète des cycles arrivera dans une prochaine version.'
                      )
                    }
                    style={styles.viewAllBtn}
                  >
                    <Text style={styles.viewAllText}>Voir tous les cycles ({profileCycles.length})</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        {/* Disclaimer footer — tracking mode */}
        <View style={styles.trackingDisclaimer}>
          <Text style={styles.trackingDisclaimerText}>
            {"Les prédictions sont des estimations basées sur tes données. Pour toute question médicale, consulte un professionnel de santé."}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB onPress={() => navigation.navigate('PeriodEditScreen', { profileId, mode: 'createCycle' })} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: {},
  trackingDisclaimer: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.backgroundSecondary, borderRadius: Radius.md },
  trackingDisclaimerText: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', lineHeight: 16 },

  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: Colors.textSecondary },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerCenter: { alignItems: 'center' },
  headerTitle: { ...Typography.h2 },
  headerSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  settingsBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { fontSize: 20 },

  // Phase ring
  ringSection: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  ringWrapper: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringSvg: { position: 'absolute' },
  ringContent: { alignItems: 'center', gap: 4 },
  phaseLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center', maxWidth: 140 },
  dayOfCycle: { fontSize: 13, color: Colors.textSecondary },
  fertileBadge: { marginTop: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  fertileBadgeText: { fontSize: 11, fontWeight: '700' },
  nextPeriod: { fontSize: 14, fontWeight: '600', color: Colors.primary, textAlign: 'center' },
  ttcDisclaimer: { marginHorizontal: Spacing.xl, padding: Spacing.sm, backgroundColor: Colors.warningLight, borderRadius: Radius.md },
  ttcDisclaimerText: { fontSize: 11, color: Colors.warning, lineHeight: 16, textAlign: 'center' },

  // Stats
  statsSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xs },
  statCard: { flex: 1, alignItems: 'center', padding: Spacing.md },
  statValue: { fontSize: 32, fontWeight: '800', color: Colors.primary },
  statUnit: { fontSize: 11, color: Colors.textMuted, marginTop: -2 },
  statTitle: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 4 },
  statsMeta: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },

  // Calendar
  calSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  calTitle: { ...Typography.h3 },
  calNavBtn: { fontSize: 26, color: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  weekDaysRow: { flexDirection: 'row', marginBottom: 4 },
  weekDayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: Colors.textMuted, paddingVertical: 4 },
  weekRow: { flexDirection: 'row', marginBottom: 2 },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', margin: 1, borderRadius: Radius.full },
  dayCellPeriod: { backgroundColor: Colors.danger },
  dayCellFertile: { backgroundColor: Colors.success + '33' },
  dayCellOvulation: { backgroundColor: Colors.success },
  dayCellPredicted: { backgroundColor: Colors.danger + '25' },
  dayCellToday: { borderWidth: 2, borderColor: Colors.primary },
  dayText: { fontSize: 13, color: Colors.text },
  dayTextOnDark: { color: Colors.white, fontWeight: '700' },
  dayTextToday: { fontWeight: '700', color: Colors.primary },

  // Legend
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: Colors.textSecondary },

  // Past cycles
  cyclesSection: { paddingHorizontal: Spacing.lg },
  cycleCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  cycleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cycleDate: { fontSize: 14, fontWeight: '600', color: Colors.text },
  cycleMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cycleChevron: { fontSize: 18, color: Colors.textMuted },
  cycleWarningBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, backgroundColor: Colors.warningLight, borderRadius: Radius.full, marginRight: Spacing.xs },
  cycleWarningText: { fontSize: 11, color: Colors.warning, fontWeight: '600' },
  viewAllBtn: { padding: Spacing.md, alignItems: 'center' },
  viewAllText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
