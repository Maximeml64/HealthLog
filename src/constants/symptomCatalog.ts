// src/constants/symptomCatalog.ts
//
// Common physical symptoms surfaced as quick-pick chips on the symptom
// event form. The `code` is a stable, language-independent identifier
// persisted in HealthEvent.subtype — enables future grouping / stats
// without depending on the user-visible French label.
//
// "Fièvre" intentionally absent: temperature is its own event type
// (HealthEvent.event_type === 'temperature'), with structured numeric
// value + measurement method.

export interface SymptomDef {
  /** Stable identifier persisted in HealthEvent.subtype. Don't rename. */
  code: string;
  /** French display label, used as the event title when picked. */
  label: string;
  /** Emoji icon shown in the chip. */
  icon: string;
}

export const COMMON_SYMPTOMS: SymptomDef[] = [
  { code: 'headache',        label: 'Mal de tête',        icon: '🤕' },
  { code: 'nausea',          label: 'Nausée',             icon: '🤢' },
  { code: 'vomiting',        label: 'Vomissement',        icon: '🤮' },
  { code: 'diarrhea',        label: 'Diarrhée',           icon: '💧' },
  { code: 'abdominal_pain',  label: 'Douleur ventre',     icon: '😣' },
  { code: 'cough',           label: 'Toux',               icon: '😷' },
  { code: 'sore_throat',     label: 'Mal de gorge',       icon: '🦠' },
  { code: 'runny_nose',      label: 'Nez qui coule',      icon: '🤧' },
  { code: 'rash',            label: 'Éruption cutanée',   icon: '🩹' },
  { code: 'dizziness',       label: 'Vertige',            icon: '💫' },
  { code: 'chills',          label: 'Frissons',           icon: '🥶' },
  { code: 'fatigue',         label: 'Fatigue',            icon: '😴' },
];

/** Map for O(1) lookup by code (e.g. when rendering events from history). */
export const SYMPTOM_BY_CODE: Record<string, SymptomDef> = Object.fromEntries(
  COMMON_SYMPTOMS.map((s) => [s.code, s]),
);
