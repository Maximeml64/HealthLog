// src/constants/sleepCatalog.ts
//
// Common sleep-event qualifiers surfaced as quick-pick chips. Captures
// the "shape" of a night (or nap). Codes are stable IDs persisted in
// HealthEvent.subtype for future aggregation (e.g. "5 réveils nocturnes
// ce mois").

export interface SleepDef {
  /** Stable identifier persisted in HealthEvent.subtype. Don't rename. */
  code: string;
  /** French display label, used as the event title when picked. */
  label: string;
  /** Emoji icon shown in the chip. */
  icon: string;
}

export const COMMON_SLEEP: SleepDef[] = [
  { code: 'good_night',     label: 'Bonne nuit',               icon: '💤' },
  { code: 'normal_night',   label: 'Nuit normale',             icon: '🌙' },
  { code: 'poor_night',     label: 'Mauvaise nuit',            icon: '⏰' },
  { code: 'night_wakings',  label: 'Réveils nocturnes',        icon: '🌃' },
  { code: 'hard_to_sleep',  label: 'Endormissement difficile', icon: '🛌' },
  { code: 'insomnia',       label: 'Insomnie',                 icon: '🌌' },
  { code: 'nightmares',     label: 'Cauchemars',               icon: '👻' },
  { code: 'nap',            label: 'Sieste',                   icon: '😴' },
];

/** O(1) lookup by code. */
export const SLEEP_BY_CODE: Record<string, SleepDef> = Object.fromEntries(
  COMMON_SLEEP.map((s) => [s.code, s]),
);
