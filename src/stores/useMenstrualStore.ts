// src/stores/useMenstrualStore.ts

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DayLog, MenstrualCycle, PregnancyData } from '../types';
import { generateId } from '../utils/helpers';

const KEYS = {
  CYCLES: '@healthlog/menstrual_cycles',
  PREGNANCIES: '@healthlog/menstrual_pregnancies',
} as const;

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function loadCycles(): Promise<MenstrualCycle[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CYCLES);
    return raw ? (JSON.parse(raw) as MenstrualCycle[]) : [];
  } catch {
    return [];
  }
}

async function loadPregnancies(): Promise<PregnancyData[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PREGNANCIES);
    return raw ? (JSON.parse(raw) as PregnancyData[]) : [];
  } catch {
    return [];
  }
}

async function persistCycles(cycles: MenstrualCycle[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CYCLES, JSON.stringify(cycles));
}

async function persistPregnancies(pregnancies: PregnancyData[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.PREGNANCIES, JSON.stringify(pregnancies));
}

function lmpToDueDate(lmp: string): string {
  const d = new Date(lmp);
  d.setDate(d.getDate() + 280);
  return d.toISOString().slice(0, 10);
}

// ─── Backup helpers (exported for BackupService) ──────────────────────────────

export async function getMenstrualBackupData(): Promise<{
  cycles: MenstrualCycle[];
  pregnancies: PregnancyData[];
}> {
  const [cycles, pregnancies] = await Promise.all([loadCycles(), loadPregnancies()]);
  return { cycles, pregnancies };
}

export async function persistMenstrualBackupData(data: {
  cycles: MenstrualCycle[];
  pregnancies: PregnancyData[];
}): Promise<void> {
  await Promise.all([
    persistCycles(data.cycles),
    persistPregnancies(data.pregnancies),
  ]);
}

export async function clearMenstrualData(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.CYCLES, KEYS.PREGNANCIES]);
}

// ─── Public helper — exported for use in BLOC B (computations) ────────────────

export function computeProfileAverages(
  profileId: string,
  cycles: MenstrualCycle[]
): { avgCycle: number; avgPeriod: number } | null {
  const completed = cycles
    .filter((c) => c.profileId === profileId && c.endDate != null)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (completed.length < 2) return null;

  // Cycle length = days between consecutive start dates
  const cycleLengths: number[] = [];
  for (let i = 1; i < completed.length; i++) {
    const ms =
      new Date(completed[i].startDate).getTime() -
      new Date(completed[i - 1].startDate).getTime();
    cycleLengths.push(Math.round(ms / 86_400_000));
  }

  // Period length = start→end inclusive
  const periodLengths = completed.map((c) => {
    const ms = new Date(c.endDate!).getTime() - new Date(c.startDate).getTime();
    return Math.round(ms / 86_400_000) + 1;
  });

  const avg = (arr: number[]) =>
    Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);

  return { avgCycle: avg(cycleLengths), avgPeriod: avg(periodLengths) };
}

// ─── State interface ──────────────────────────────────────────────────────────

interface MenstrualState {
  cycles: MenstrualCycle[];
  pregnancies: PregnancyData[];
  loading: boolean;

  // Init
  loadMenstrualData: () => Promise<void>;

  // Cycles CRUD
  addCycle: (profileId: string, startDate: string, endDate?: string) => Promise<string>;
  updateCycle: (id: string, updates: Partial<MenstrualCycle>) => Promise<void>;
  deleteCycle: (id: string) => Promise<void>;

  // Day logs
  upsertDayLog: (cycleId: string, dayLog: DayLog) => Promise<void>;
  removeDayLog: (cycleId: string, date: string) => Promise<void>;

  // Queries (synchronous — read from store state)
  getCyclesByProfile: (profileId: string) => MenstrualCycle[];
  getActiveCycle: (profileId: string) => MenstrualCycle | undefined;
  getCycleById: (id: string) => MenstrualCycle | undefined;

  // Pregnancies CRUD
  addPregnancy: (profileId: string, startDate: string, dueDate?: string) => Promise<string>;
  updatePregnancy: (id: string, updates: Partial<PregnancyData>) => Promise<void>;
  deletePregnancy: (id: string) => Promise<void>;
  getActivePregnancy: (profileId: string) => PregnancyData | undefined;

  // Appointment CRUD (within a pregnancy)
  addAppointment: (pregnancyId: string, appt: PregnancyData['appointments'][number]) => Promise<void>;
  updateAppointment: (pregnancyId: string, apptId: string, updates: Partial<PregnancyData['appointments'][number]>) => Promise<void>;
  removeAppointment: (pregnancyId: string, apptId: string) => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMenstrualStore = create<MenstrualState>((set, get) => ({
  cycles: [],
  pregnancies: [],
  loading: true,

  // ── Init ────────────────────────────────────────────────────────────────────

  loadMenstrualData: async () => {
    set({ loading: true });
    const [cycles, pregnancies] = await Promise.all([loadCycles(), loadPregnancies()]);
    set({ cycles, pregnancies, loading: false });
  },

  // ── Cycles ──────────────────────────────────────────────────────────────────

  addCycle: async (profileId, startDate, endDate) => {
    const id = generateId();
    const now = new Date().toISOString();
    const cycle: MenstrualCycle = {
      id,
      profileId,
      startDate,
      ...(endDate !== undefined ? { endDate } : {}),
      dayLogs: [],
      createdAt: now,
      updatedAt: now,
    };
    const cycles = [...get().cycles, cycle];
    await persistCycles(cycles);
    set({ cycles });
    return id;
  },

  updateCycle: async (id, updates) => {
    const cycles = get().cycles.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
    );
    await persistCycles(cycles);
    set({ cycles });
  },

  deleteCycle: async (id) => {
    const cycles = get().cycles.filter((c) => c.id !== id);
    await persistCycles(cycles);
    set({ cycles });
  },

  // ── Day logs ────────────────────────────────────────────────────────────────

  upsertDayLog: async (cycleId, dayLog) => {
    const cycles = get().cycles.map((c) => {
      if (c.id !== cycleId) return c;
      const rest = c.dayLogs.filter((d) => d.date !== dayLog.date);
      return { ...c, dayLogs: [...rest, dayLog], updatedAt: new Date().toISOString() };
    });
    await persistCycles(cycles);
    set({ cycles });
  },

  removeDayLog: async (cycleId, date) => {
    const cycles = get().cycles.map((c) => {
      if (c.id !== cycleId) return c;
      return {
        ...c,
        dayLogs: c.dayLogs.filter((d) => d.date !== date),
        updatedAt: new Date().toISOString(),
      };
    });
    await persistCycles(cycles);
    set({ cycles });
  },

  // ── Queries ─────────────────────────────────────────────────────────────────

  getCyclesByProfile: (profileId) =>
    get().cycles.filter((c) => c.profileId === profileId),

  getActiveCycle: (profileId) =>
    get().cycles.find((c) => c.profileId === profileId && c.endDate == null),

  getCycleById: (id) =>
    get().cycles.find((c) => c.id === id),

  // ── Pregnancies ─────────────────────────────────────────────────────────────

  addPregnancy: async (profileId, startDate, dueDate) => {
    const id = generateId();
    const now = new Date().toISOString();
    const pregnancy: PregnancyData = {
      id,
      profileId,
      startDate,
      dueDate: dueDate ?? lmpToDueDate(startDate),
      appointments: [],
      createdAt: now,
      updatedAt: now,
    };
    const pregnancies = [...get().pregnancies, pregnancy];
    await persistPregnancies(pregnancies);
    set({ pregnancies });
    return id;
  },

  updatePregnancy: async (id, updates) => {
    const pregnancies = get().pregnancies.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    await persistPregnancies(pregnancies);
    set({ pregnancies });
  },

  deletePregnancy: async (id) => {
    const pregnancies = get().pregnancies.filter((p) => p.id !== id);
    await persistPregnancies(pregnancies);
    set({ pregnancies });
  },

  getActivePregnancy: (profileId) =>
    get().pregnancies.find((p) => p.profileId === profileId && p.endDate == null),

  // ── Appointments ────────────────────────────────────────────────────────────

  addAppointment: async (pregnancyId, appt) => {
    const pregnancies = get().pregnancies.map((p) =>
      p.id !== pregnancyId ? p
        : { ...p, appointments: [...p.appointments, appt], updatedAt: new Date().toISOString() }
    );
    await persistPregnancies(pregnancies);
    set({ pregnancies });
  },

  updateAppointment: async (pregnancyId, apptId, updates) => {
    const pregnancies = get().pregnancies.map((p) =>
      p.id !== pregnancyId ? p : {
        ...p,
        appointments: p.appointments.map((a) => a.id === apptId ? { ...a, ...updates } : a),
        updatedAt: new Date().toISOString(),
      }
    );
    await persistPregnancies(pregnancies);
    set({ pregnancies });
  },

  removeAppointment: async (pregnancyId, apptId) => {
    const pregnancies = get().pregnancies.map((p) =>
      p.id !== pregnancyId ? p : {
        ...p,
        appointments: p.appointments.filter((a) => a.id !== apptId),
        updatedAt: new Date().toISOString(),
      }
    );
    await persistPregnancies(pregnancies);
    set({ pregnancies });
  },
}));
