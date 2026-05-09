// src/utils/menstrualCalc.ts
// Pure functions — no store access, no side effects. Safe to unit test in isolation.

import { parseISO, differenceInDays, addDays, subDays } from 'date-fns';
import type { MenstrualCycle, PregnancyData } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CyclePhase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal';

export interface CycleStats {
  avgCycleLength: number;   // default 28 si données insuffisantes
  avgPeriodLength: number;  // default 5 si données insuffisantes
  cyclesAnalyzed: number;   // cycles complets utilisés pour le calcul
  isReliable: boolean;      // true si cyclesAnalyzed >= 3 ET stdDev cycle < 7 jours
}

export interface FertilityWindow {
  start: Date;              // ovulationDay - 5 jours (survie sperme)
  end: Date;                // ovulationDay + 1 jour (survie ovule 24h)
  ovulationDay: Date;
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

const DEFAULT_CYCLE = 28;
const DEFAULT_PERIOD = 5;

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function completedSorted(cycles: MenstrualCycle[]): MenstrualCycle[] {
  return cycles
    .filter((c) => c.startDate != null && c.endDate != null)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function lastCycle(cycles: MenstrualCycle[]): MenstrualCycle | undefined {
  return [...cycles].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
}

// ─── 1. getCycleStats ─────────────────────────────────────────────────────────

export function getCycleStats(cycles: MenstrualCycle[]): CycleStats {
  const completed = completedSorted(cycles);

  if (completed.length < 2) {
    return {
      avgCycleLength: DEFAULT_CYCLE,
      avgPeriodLength: DEFAULT_PERIOD,
      cyclesAnalyzed: completed.length,
      isReliable: false,
    };
  }

  const periodLengths = completed.map(
    (c) => differenceInDays(parseISO(c.endDate!), parseISO(c.startDate)) + 1
  );

  const cycleLengths: number[] = [];
  for (let i = 1; i < completed.length; i++) {
    cycleLengths.push(
      differenceInDays(parseISO(completed[i].startDate), parseISO(completed[i - 1].startDate))
    );
  }

  const cyclesAnalyzed = completed.length;

  return {
    avgCycleLength: Math.round(mean(cycleLengths)),
    avgPeriodLength: Math.round(mean(periodLengths)),
    cyclesAnalyzed,
    isReliable: cyclesAnalyzed >= 3 && stdDev(cycleLengths) < 7,
  };
}

// ─── 2. predictNextPeriod ─────────────────────────────────────────────────────

export function predictNextPeriod(
  cycles: MenstrualCycle[],
  _referenceDate: Date = new Date()
): Date | null {
  if (cycles.length === 0) return null;
  const last = lastCycle(cycles);
  if (!last) return null;
  const stats = getCycleStats(cycles);
  return addDays(parseISO(last.startDate), stats.avgCycleLength);
}

// ─── 3. getCurrentPhase ───────────────────────────────────────────────────────

export function getCurrentPhase(
  cycles: MenstrualCycle[],
  today: Date = new Date()
): CyclePhase | null {
  if (cycles.length === 0) return null;
  const last = lastCycle(cycles);
  if (!last) return null;

  const stats = getCycleStats(cycles);
  const day = differenceInDays(today, parseISO(last.startDate));

  // Cycle fortement en retard → données peu fiables
  if (day > stats.avgCycleLength + 7) return null;

  const ovulationCenter = stats.avgCycleLength - 14;

  if (day < stats.avgPeriodLength) return 'menstruation';
  if (day < ovulationCenter - 2) return 'follicular';
  if (day <= ovulationCenter + 1) return 'ovulation';
  return 'luteal';
}

// ─── 4. getFertilityWindow ────────────────────────────────────────────────────

export function getFertilityWindow(
  cycles: MenstrualCycle[],
  referenceDate: Date = new Date()
): FertilityWindow | null {
  const nextPeriod = predictNextPeriod(cycles, referenceDate);
  if (!nextPeriod) return null;

  // Phase lutéale standard = 14 jours → ovulation = prochain début - 14
  const ovulationDay = subDays(nextPeriod, 14);

  return {
    start: subDays(ovulationDay, 5),
    end: addDays(ovulationDay, 1),
    ovulationDay,
  };
}

// ─── 5. getPregnancyDueDate ───────────────────────────────────────────────────

export function getPregnancyDueDate(lmpDate: Date): Date {
  return addDays(lmpDate, 280); // Règle de Naegele : LMP + 40 semaines
}

// ─── 6. getPregnancyWeek ──────────────────────────────────────────────────────

export function getPregnancyWeek(
  pregnancy: PregnancyData,
  today: Date = new Date()
): number {
  const days = differenceInDays(today, parseISO(pregnancy.startDate));
  if (days < 0) return 0;
  return Math.min(Math.floor(days / 7), 42);
}

// ─── 7. getPregnancyTrimester ─────────────────────────────────────────────────

export function getPregnancyTrimester(
  pregnancy: PregnancyData,
  today: Date = new Date()
): 1 | 2 | 3 {
  const week = getPregnancyWeek(pregnancy, today);
  if (week <= 13) return 1;
  if (week <= 27) return 2;
  return 3;
}

// ─── 8. getDaysUntilNextPeriod ────────────────────────────────────────────────

export function getDaysUntilNextPeriod(
  cycles: MenstrualCycle[],
  today: Date = new Date()
): number | null {
  const next = predictNextPeriod(cycles, today);
  if (!next) return null;
  return differenceInDays(next, today); // négatif si retard
}

// ─── 9. getDayOfCycle ─────────────────────────────────────────────────────────

export function getDayOfCycle(
  cycles: MenstrualCycle[],
  today: Date = new Date()
): number | null {
  if (cycles.length === 0) return null;
  const last = lastCycle(cycles);
  if (!last) return null;
  return differenceInDays(today, parseISO(last.startDate)) + 1;
}
