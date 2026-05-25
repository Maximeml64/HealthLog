// src/constants/appetiteCatalog.ts
//
// Common appetite-event qualifiers surfaced as quick-pick chips.
// Codes are stable, language-independent identifiers persisted in
// HealthEvent.subtype for future aggregation (e.g. "5 jours avec
// appétit faible ce mois").

export interface AppetiteDef {
  /** Stable identifier persisted in HealthEvent.subtype. Don't rename. */
  code: string;
  /** French display label, used as the event title when picked. */
  label: string;
  /** Emoji icon shown in the chip. */
  icon: string;
}

export const COMMON_APPETITE: AppetiteDef[] = [
  { code: 'excellent', label: 'Excellent', icon: '🍽️' },
  { code: 'normal',    label: 'Normal',    icon: '👍' },
  { code: 'low',       label: 'Faible',    icon: '🥄' },
  { code: 'none',      label: 'Aucun',     icon: '🚫' },
  { code: 'cravings',  label: 'Fringales', icon: '🍫' },
  { code: 'picky',     label: 'Difficile', icon: '😐' },
];

/** O(1) lookup by code. */
export const APPETITE_BY_CODE: Record<string, AppetiteDef> = Object.fromEntries(
  COMMON_APPETITE.map((a) => [a.code, a]),
);
