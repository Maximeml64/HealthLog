// src/components/MenstrualCard.tsx

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppStore } from '../stores/useAppStore';
import { useMenstrualStore } from '../stores/useMenstrualStore';
import {
  getCycleStats, getCurrentPhase, getDayOfCycle, getDaysUntilNextPeriod,
  getFertilityWindow, getPregnancyTrimester, getPregnancyWeek, type CyclePhase,
} from '../utils/menstrualCalc';
import { Colors, Radius, Shadow, Spacing } from '../utils/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const RING_SIZE = 72;
const RING_RADIUS = 28;
const STROKE_WIDTH = 9;

const PHASE_COLORS: Record<CyclePhase, string> = {
  menstruation: Colors.danger,
  follicular:   Colors.warning,
  ovulation:    Colors.success,
  luteal:       Colors.primary,
};

const PHASE_LABELS: Record<CyclePhase, string> = {
  menstruation: 'Règles',
  follicular:   'Phase folliculaire',
  ovulation:    'Ovulation',
  luteal:       'Phase lutéale',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface MenstrualCardProps {
  profileId: string;
  onPress: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MenstrualCard: React.FC<MenstrualCardProps> = ({ profileId, onPress }) => {
  const profiles = useAppStore((s) => s.profiles);
  const { cycles, pregnancies, loadMenstrualData } = useMenstrualStore();

  useEffect(() => { loadMenstrualData(); }, [loadMenstrualData]);

  const profile = profiles.find((p) => p.id === profileId);
  const profileCycles = useMemo(() => cycles.filter((c) => c.profileId === profileId), [cycles, profileId]);
  const activePregnancy = useMemo(
    () => pregnancies.find((p) => p.profileId === profileId && p.endDate == null),
    [pregnancies, profileId]
  );
  const today = useMemo(() => new Date(), []);

  if (!profile) return null;

  const mode = profile.menstrualMode ?? 'tracking';

  // ── Computed ─────────────────────────────────────────────────────────────

  const phase         = getCurrentPhase(profileCycles, today);
  const dayOfCycle    = getDayOfCycle(profileCycles, today);
  const daysUntilNext = getDaysUntilNextPeriod(profileCycles, today);
  const fertility     = getFertilityWindow(profileCycles, today);
  const stats         = getCycleStats(profileCycles);

  const isFertileNow = fertility != null && today >= fertility.start && today <= fertility.end;
  const pregnancyWeek     = activePregnancy ? getPregnancyWeek(activePregnancy, today) : null;
  const pregnancyTrimester = activePregnancy ? getPregnancyTrimester(activePregnancy, today) : null;

  // ── Ring ─────────────────────────────────────────────────────────────────

  const ringColor = mode === 'pregnancy' ? Colors.primary : (phase ? PHASE_COLORS[phase] : Colors.border);

  const ringCenter = mode === 'pregnancy' && pregnancyWeek != null
    ? <Text style={[styles.ringWeek, { color: ringColor }]}>S{pregnancyWeek}</Text>
    : dayOfCycle != null
    ? (
      <View style={styles.ringDayRow}>
        <Text style={[styles.ringDay, { color: ringColor }]}>{dayOfCycle}</Text>
        <Text style={[styles.ringJ, { color: ringColor }]}>J</Text>
      </View>
    )
    : <Text style={styles.ringEmpty}>📅</Text>;

  // ── Labels ───────────────────────────────────────────────────────────────

  const cardTitle  = mode === 'pregnancy' ? 'Grossesse' : 'Cycle';

  const phaseLabel = mode === 'pregnancy'
    ? (pregnancyTrimester ? `Trimestre ${pregnancyTrimester}` : 'Grossesse')
    : (phase ? PHASE_LABELS[phase] : 'Données insuffisantes');

  let infoLine = '';
  if (mode === 'pregnancy') {
    infoLine = activePregnancy
      ? `DPA : ${format(parseISO(activePregnancy.dueDate), 'd MMM yyyy', { locale: fr })}`
      : 'Aucune grossesse active';
  } else if (profileCycles.length === 0) {
    infoLine = 'Ajoute ta première période';
  } else if (phase === 'menstruation' && dayOfCycle != null) {
    infoLine = `En cours · J${dayOfCycle}/${stats.avgPeriodLength}`;
  } else if (isFertileNow) {
    infoLine = 'Fenêtre fertile en cours';
  } else if (daysUntilNext != null) {
    infoLine = daysUntilNext > 0
      ? `Règles dans ${daysUntilNext} j`
      : daysUntilNext === 0
      ? "Règles aujourd'hui"
      : `Retard de ${Math.abs(daysUntilNext)} j`;
  } else {
    infoLine = 'Données insuffisantes';
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Voir le suivi de cycle"
    >
      {/* Left — ring */}
      <View style={styles.left}>
        <View style={styles.ringWrapper}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
              stroke={Colors.backgroundSecondary} strokeWidth={STROKE_WIDTH} fill="none"
            />
            <Circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
              stroke={ringColor} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round"
            />
          </Svg>
          <View style={styles.ringContent}>{ringCenter}</View>
        </View>
      </View>

      {/* Right — text */}
      <View style={styles.right}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>{cardTitle}</Text>
          {mode === 'ttc' && (
            <View style={styles.ttcBadge}>
              <Text style={styles.ttcBadgeText}>TTC</Text>
            </View>
          )}
        </View>
        <Text style={styles.phaseLabel} numberOfLines={1}>{phaseLabel}</Text>
        <Text style={styles.infoLine} numberOfLines={1}>{infoLine}</Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    gap: Spacing.md,
    ...Shadow.md,
  },

  // Ring
  left: { alignItems: 'center', justifyContent: 'center' },
  ringWrapper: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringContent: { alignItems: 'center', justifyContent: 'center' },
  ringDayRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  ringDay: { fontSize: 20, fontWeight: '800', lineHeight: 24 },
  ringJ: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  ringWeek: { fontSize: 14, fontWeight: '800' },
  ringEmpty: { fontSize: 20 },

  // Right panel
  right: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  ttcBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full, backgroundColor: Colors.primaryMuted },
  ttcBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  phaseLabel: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  infoLine: { fontSize: 12, color: Colors.textSecondary },

  chevron: { fontSize: 20, color: Colors.textMuted },
});
