// src/components/TTCView.tsx

import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import {
  addDays, differenceInDays, eachDayOfInterval, format, getDaysInMonth,
  getDay, isSameDay, parseISO, startOfMonth, subMonths, addMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import {
  getCycleStats, getCurrentPhase, getDayOfCycle, getDaysUntilNextPeriod,
  getFertilityWindow, predictNextPeriod, type CyclePhase,
} from '../utils/menstrualCalc';
import { useToday } from '../utils/useToday';
import { Colors, Radius, Shadow, Spacing, Typography } from '../utils/theme';
import { Card, SectionHeader } from './UI';

// ─── Constants ────────────────────────────────────────────────────────────────

const RING_SIZE = 200;
const RING_RADIUS = 82;
const STROKE_WIDTH = 16;
const WEEK_DAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

const PHASE_LABELS: Record<CyclePhase, string> = {
  menstruation: 'Menstruation', follicular: 'Phase folliculaire',
  ovulation: 'Ovulation', luteal: 'Phase lutéale',
};
const PHASE_COLORS: Record<CyclePhase, string> = {
  menstruation: Colors.danger, follicular: Colors.warning,
  ovulation: Colors.success, luteal: Colors.primary,
};

const weekdayMon = (d: Date) => (getDay(d) + 6) % 7;

// BBT chart constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_W = SCREEN_WIDTH - Spacing.lg * 2;
const CHART_H = 130;
const PAD_L = 40; const PAD_R = 8; const PAD_T = 10; const PAD_B = 24;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;
const Y_MIN = 35.5; const Y_MAX = 37.5;
const toX = (idx: number, total: number) => PAD_L + (total <= 1 ? 0 : (idx / (total - 1)) * PLOT_W);
const toY = (temp: number) => PAD_T + (1 - (temp - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H;

// ─── Props ────────────────────────────────────────────────────────────────────

interface TTCViewProps {
  profileId: string;
  calendarMonth: Date;
  setCalendarMonth: (m: Date | ((prev: Date) => Date)) => void;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  recentCycles: import('../types').MenstrualCycle[];
  profileCycles: import('../types').MenstrualCycle[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TTCView: React.FC<TTCViewProps> = ({
  profileId, calendarMonth, setCalendarMonth, navigation, recentCycles, profileCycles,
}) => {
  const today = useToday();
  const stats = useMemo(() => getCycleStats(profileCycles), [profileCycles]);
  const phase = getCurrentPhase(profileCycles, today);
  const dayOfCycle = getDayOfCycle(profileCycles, today);
  const daysUntilNext = getDaysUntilNextPeriod(profileCycles, today);
  const fertility = getFertilityWindow(profileCycles, today);
  const nextPeriodDate = predictNextPeriod(profileCycles, today);

  const inFertileWindow = fertility != null && today >= fertility.start && today <= fertility.end;
  const isFertilePhase = phase === 'ovulation' || inFertileWindow;
  const phaseColor = phase ? PHASE_COLORS[phase] : Colors.border;

  // Days until fertile window
  const daysUntilFertile = fertility
    ? differenceInDays(fertility.start, today)
    : null;

  // BBT data from active/latest cycle
  const bbtPoints = useMemo(() => {
    const sorted = [...profileCycles].sort((a, b) => b.startDate.localeCompare(a.startDate));
    const cycle = sorted[0];
    if (!cycle) return [];
    return cycle.dayLogs
      .filter((l) => l.basalTemperature !== undefined)
      .map((l) => ({
        day: differenceInDays(parseISO(l.date), parseISO(cycle.startDate)) + 1,
        temp: l.basalTemperature!,
        date: l.date,
      }))
      .sort((a, b) => a.day - b.day);
  }, [profileCycles]);

  // Calendar markers
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

  // BBT chart path
  const bbtPath = bbtPoints.length >= 2
    ? bbtPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i, bbtPoints.length)} ${toY(p.temp)}`).join(' ')
    : null;

  // Peak detection: highest temp in fertile window zone (day 10-18)
  const peakPoint = bbtPoints.length >= 5
    ? bbtPoints
        .filter((p) => p.day >= 10 && p.day <= 20)
        .reduce((max, p) => (!max || p.temp > max.temp) ? p : max, null as typeof bbtPoints[0] | null)
    : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Disclaimer */}
      <View style={styles.ttcDisclaimer}>
        <Text style={styles.ttcDisclaimerText}>
          {"⚠️ Cette app n'est pas une méthode contraceptive. Pour la conception ou la contraception, consulte un professionnel de santé."}
        </Text>
      </View>

      {/* Phase ring */}
      <View style={styles.ringSection}>
        <View style={[styles.ringWrapper, isFertilePhase && styles.ringWrapperFertile]}>
          <Svg width={isFertilePhase ? RING_SIZE + 20 : RING_SIZE} height={isFertilePhase ? RING_SIZE + 20 : RING_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={(isFertilePhase ? RING_SIZE + 20 : RING_SIZE) / 2}
              cy={(isFertilePhase ? RING_SIZE + 20 : RING_SIZE) / 2}
              r={isFertilePhase ? RING_RADIUS + 4 : RING_RADIUS}
              stroke={Colors.backgroundSecondary} strokeWidth={STROKE_WIDTH} fill="none"
            />
            <Circle
              cx={(isFertilePhase ? RING_SIZE + 20 : RING_SIZE) / 2}
              cy={(isFertilePhase ? RING_SIZE + 20 : RING_SIZE) / 2}
              r={isFertilePhase ? RING_RADIUS + 4 : RING_RADIUS}
              stroke={phaseColor} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round"
            />
          </Svg>
          <View style={styles.ringContent}>
            <Text style={[styles.phaseLabel, { color: phaseColor }]}>
              {phase ? PHASE_LABELS[phase] : 'Données insuffisantes'}
            </Text>
            {dayOfCycle != null && <Text style={styles.dayOfCycle}>Jour {dayOfCycle}</Text>}
            {inFertileWindow && (
              <View style={[styles.fertileBadge, { backgroundColor: Colors.success + '20', borderColor: Colors.success }]}>
                <Text style={[styles.fertileBadgeText, { color: Colors.success }]}>Fenêtre fertile</Text>
              </View>
            )}
          </View>
        </View>

        {daysUntilNext != null && (
          <Text style={styles.nextPeriod}>
            {daysUntilNext > 0 ? `Règles dans ${daysUntilNext} j` : daysUntilNext === 0 ? "Règles aujourd'hui" : `Retard ${Math.abs(daysUntilNext)} j`}
          </Text>
        )}
      </View>

      {/* Fertile window card */}
      {fertility && (
        <Card style={styles.fertileCard}>
          <Text style={styles.fertileCardTitle}>
            {inFertileWindow ? '🌟 Fenêtre fertile en cours' : daysUntilFertile != null && daysUntilFertile > 0 ? `Prochaine fenêtre fertile dans ${daysUntilFertile} jour${daysUntilFertile > 1 ? 's' : ''}` : 'Fenêtre fertile passée'}
          </Text>
          <Text style={styles.fertileCardDates}>
            {format(fertility.start, 'd MMM', { locale: fr })} → {format(fertility.end, 'd MMM', { locale: fr })} · Ovulation : {format(fertility.ovulationDay, 'd MMM', { locale: fr })}
          </Text>
        </Card>
      )}

      {/* Calendar */}
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
                >
                  <Text style={[styles.dayText, (isPeriod || isOvulation) && styles.dayTextOnDark, isToday && !isPeriod && styles.dayTextToday]}>
                    {format(day, 'd')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* BBT chart */}
      <View style={styles.section}>
        <SectionHeader title="Température basale" />
        {bbtPoints.length < 5 ? (
          <View style={styles.bbtEmpty}>
            <Text style={styles.bbtEmptyText}>Enregistre ta température basale chaque matin pour suivre ton ovulation.</Text>
          </View>
        ) : (
          <View style={styles.bbtChart}>
            <Svg width={CHART_W} height={CHART_H}>
              {/* Y axis labels */}
              {[35.5, 36.0, 36.5, 37.0, 37.5].map((t) => (
                <React.Fragment key={t}>
                  <Line x1={PAD_L - 4} y1={toY(t)} x2={PAD_L} y2={toY(t)} stroke={Colors.border} strokeWidth={1} />
                </React.Fragment>
              ))}
              {/* Horizontal grid */}
              {[36.0, 36.5, 37.0].map((t) => (
                <Line key={t} x1={PAD_L} y1={toY(t)} x2={CHART_W - PAD_R} y2={toY(t)} stroke={Colors.border} strokeWidth={0.5} strokeDasharray="4,4" />
              ))}
              {/* BBT line */}
              {bbtPath && <Path d={bbtPath} stroke={Colors.primary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
              {/* Data points */}
              {bbtPoints.map((p, i) => (
                <Circle key={i} cx={toX(i, bbtPoints.length)} cy={toY(p.temp)} r={3} fill={Colors.primary} />
              ))}
              {/* Peak ovulation marker */}
              {peakPoint && (() => {
                const idx = bbtPoints.indexOf(peakPoint);
                return (
                  <Circle cx={toX(idx, bbtPoints.length)} cy={toY(peakPoint.temp)} r={6} fill={Colors.success} opacity={0.8} />
                );
              })()}
            </Svg>
            <View style={styles.bbtYLabels}>
              {[37.5, 37.0, 36.5, 36.0, 35.5].map((t) => (
                <Text key={t} style={styles.bbtYLabel}>{t.toFixed(1)}</Text>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Past cycles */}
      {recentCycles.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Cycles passés" count={recentCycles.length} />
          {recentCycles.map((c) => {
            const start = parseISO(c.startDate);
            const end = c.endDate ? parseISO(c.endDate) : null;
            const periodDays = end ? Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1 : null;
            return (
              <TouchableOpacity key={c.id} onPress={() => navigation.navigate('PeriodEditScreen', { profileId, mode: 'editCycle', cycleId: c.id })} accessibilityRole="button">
                <Card style={styles.cycleCard}>
                  <View style={styles.cycleRow}>
                    <View>
                      <Text style={styles.cycleDate}>
                        {format(start, 'd MMM yyyy', { locale: fr })}
                        {end ? ` → ${format(end, 'd MMM', { locale: fr })}` : ' → en cours'}
                      </Text>
                      {periodDays != null && <Text style={styles.cycleMeta}>Règles : {periodDays} j</Text>}
                    </View>
                    <Text style={styles.cycleChevron}>›</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* "Je suis enceinte" */}
      <View style={styles.pregnancyBtnWrapper}>
        <TouchableOpacity
          style={styles.pregnancyBtn}
          onPress={() => {
            const lastCycle = [...profileCycles].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
            navigation.navigate('PregnancyStartScreen', { profileId, prefillLmpDate: lastCycle?.startDate });
          }}
        >
          <Text style={styles.pregnancyBtnText}>🤰 Je suis enceinte</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 }, content: {},
  ttcDisclaimer: { margin: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.warningLight, borderRadius: Radius.md },
  ttcDisclaimerText: { fontSize: 11, color: Colors.warning, lineHeight: 16, textAlign: 'center' },

  ringSection: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  ringWrapper: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringWrapperFertile: { width: RING_SIZE + 20, height: RING_SIZE + 20 },
  ringContent: { alignItems: 'center', gap: 4 },
  phaseLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center', maxWidth: 140 },
  dayOfCycle: { fontSize: 13, color: Colors.textSecondary },
  fertileBadge: { marginTop: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  fertileBadgeText: { fontSize: 11, fontWeight: '700' },
  nextPeriod: { fontSize: 14, fontWeight: '600', color: Colors.primary, textAlign: 'center' },

  fertileCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.success + '44' },
  fertileCardTitle: { fontSize: 14, fontWeight: '700', color: Colors.success, marginBottom: 4 },
  fertileCardDates: { fontSize: 12, color: Colors.textSecondary },

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

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  bbtEmpty: { padding: Spacing.lg, backgroundColor: Colors.backgroundSecondary, borderRadius: Radius.md, alignItems: 'center' },
  bbtEmptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  bbtChart: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.sm, ...Shadow.sm, position: 'relative' },
  bbtYLabels: { position: 'absolute', left: 2, top: PAD_T + 6, height: PLOT_H, justifyContent: 'space-between' },
  bbtYLabel: { fontSize: 9, color: Colors.textMuted },

  cycleCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  cycleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cycleDate: { fontSize: 14, fontWeight: '600', color: Colors.text },
  cycleMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cycleChevron: { fontSize: 18, color: Colors.textMuted },

  pregnancyBtnWrapper: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  pregnancyBtn: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary },
  pregnancyBtnText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
});
