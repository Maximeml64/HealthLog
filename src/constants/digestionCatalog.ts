// src/constants/digestionCatalog.ts
//
// Common digestion-event qualifiers surfaced as quick-pick chips.
// Codes are stable, language-independent identifiers persisted in
// HealthEvent.subtype for future aggregation.
//
// Some codes (nausea, diarrhea) intentionally overlap with the
// symptom catalogue: a "symptom event" and a "digestion event"
// answer different questions ("what's wrong?" vs "how is the gut
// today?"), so we don't try to deduplicate at the catalogue level.

export interface DigestionDef {
  /** Stable identifier persisted in HealthEvent.subtype. Don't rename. */
  code: string;
  /** French display label, used as the event title when picked. */
  label: string;
  /** Emoji icon shown in the chip. */
  icon: string;
}

export const COMMON_DIGESTION: DigestionDef[] = [
  { code: 'transit_normal', label: 'Transit normal', icon: '✅' },
  { code: 'constipation',   label: 'Constipation',   icon: '🚫' },
  { code: 'diarrhea',       label: 'Diarrhée',       icon: '💧' },
  { code: 'bloating',       label: 'Ballonnements',  icon: '🎈' },
  { code: 'nausea',         label: 'Nausées',        icon: '🤢' },
  { code: 'heartburn',      label: 'Reflux',         icon: '🔥' },
  { code: 'stomach_ache',   label: 'Mal au ventre',  icon: '😣' },
  { code: 'gas',            label: 'Gaz',            icon: '💨' },
];

/** O(1) lookup by code. */
export const DIGESTION_BY_CODE: Record<string, DigestionDef> = Object.fromEntries(
  COMMON_DIGESTION.map((d) => [d.code, d]),
);
