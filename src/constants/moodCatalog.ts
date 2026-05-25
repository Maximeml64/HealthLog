// src/constants/moodCatalog.ts
//
// Common mood states surfaced as quick-pick chips on mood events.
// Same shape as symptomCatalog — codes are stable identifiers persisted
// in HealthEvent.subtype.

export interface MoodDef {
  /** Stable identifier persisted in HealthEvent.subtype. Don't rename. */
  code: string;
  /** French display label, used as the event title when picked. */
  label: string;
  /** Emoji icon shown in the chip. */
  icon: string;
}

export const COMMON_MOODS: MoodDef[] = [
  { code: 'happy',     label: 'Heureux',    icon: '😊' },
  { code: 'energetic', label: 'Énergique',  icon: '⚡' },
  { code: 'calm',      label: 'Calme',      icon: '😌' },
  { code: 'tired',     label: 'Fatigué',    icon: '😴' },
  { code: 'anxious',   label: 'Anxieux',    icon: '😟' },
  { code: 'stressed',  label: 'Stressé',    icon: '😰' },
  { code: 'sad',       label: 'Triste',     icon: '😢' },
  { code: 'angry',     label: 'En colère',  icon: '😠' },
];

/** O(1) lookup by code. */
export const MOOD_BY_CODE: Record<string, MoodDef> = Object.fromEntries(
  COMMON_MOODS.map((m) => [m.code, m]),
);
