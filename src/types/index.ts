// src/types/index.ts

// ─── Menstrual tracking ───────────────────────────────────────────────────────

export type Sex = 'female' | 'male' | 'non_binary' | 'unspecified';

export type MenstrualMode = 'tracking' | 'ttc' | 'pregnancy';

export type FlowIntensity = 'light' | 'medium' | 'heavy';

export type MenstrualSymptom =
  | 'cramps'
  | 'headache'
  | 'fatigue'
  | 'mood_swings'
  | 'bloating'
  | 'acne'
  | 'breast_tenderness'
  | 'back_pain'
  | 'nausea'
  | 'food_cravings'
  | 'insomnia';

export type BloodColor =
  | 'pink'        // Rose clair — début/fin, faible flux
  | 'bright_red'  // Rouge vif — sang frais, normal
  | 'dark_red'    // Rouge foncé — flux abondant
  | 'brown'       // Marron — sang oxydé, début/fin
  | 'black'       // Noir/brun très foncé — sang ancien
  | 'orange'      // Orange — signe potentiel d'infection
  | 'gray';       // Gris — signe potentiel d'infection sérieuse

export type BloodTexture =
  | 'fluid'        // Fluide
  | 'small_clots'  // Petits caillots (normal en flux abondant)
  | 'large_clots'  // Gros caillots (à surveiller si fréquent)
  | 'watery'       // Aqueux/dilué (peut indiquer une carence)
  | 'mucousy';     // Muqueux

export interface DayLog {
  date: string;            // ISO YYYY-MM-DD
  flow?: FlowIntensity;
  symptoms?: MenstrualSymptom[];
  notes?: string;
  basalTemperature?: number; // °C, ex. 36.7
  color?: BloodColor;
  texture?: BloodTexture;
}

export interface MenstrualCycle {
  id: string;
  profileId: string;
  startDate: string;       // ISO YYYY-MM-DD
  endDate?: string;        // undefined si cycle en cours
  dayLogs: DayLog[];
  createdAt: string;
  updatedAt: string;
}

export interface PregnancyData {
  id: string;
  profileId: string;
  startDate: string;       // LMP — dernières règles avant grossesse
  dueDate: string;         // LMP + 280 jours (éditable)
  endDate?: string;        // accouchement / fausse couche / IVG
  notes?: string;
  appointments: Array<{
    id: string;
    date: string;          // ISO datetime
    type: 'echo_1' | 'echo_2' | 'echo_3' | 'consultation' | 'analysis' | 'other';
    label?: string;
    notes?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export type RelationType =
  | 'self'
  | 'child'
  | 'parent'
  | 'partner'
  | 'sibling'
  | 'other';

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export interface Profile {
  id: string;
  display_name: string;
  avatar_uri: string | null;
  color: string;
  birth_date: string | null; // ISO string
  relation_type: RelationType;
  blood_type: BloodType | null;
  notes: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // ── Menstrual tracking (optional — default via ?? at read site) ────────────
  sex?: Sex;
  menstrualTrackingEnabled?: boolean;
  menstrualMode?: MenstrualMode;
  averageCycleLength?: number;
  averagePeriodLength?: number;
}

export type EventType =
  | 'symptom'
  | 'temperature'
  | 'medication'
  | 'appointment'
  | 'vaccine'
  | 'weight'
  | 'height'
  | 'sleep'
  | 'digestion'
  | 'appetite'
  | 'mood'
  | 'note';

export interface HealthEvent {
  id: string;
  profile_id: string;
  event_type: EventType;
  title: string;
  occurred_at: string; // ISO string
  note: string;
  numeric_value: number | null;
  unit: string | null;
  intensity: number | null; // 1-5
  subtype: string | null;
  metadata_json: string | null; // JSON string
  attachment_uris: string[];
  photos: string[];
  created_at: string;
  updated_at: string;
}

// Parsed metadata types per event_type
export interface TemperatureMetadata {
  method: 'oral' | 'axillary' | 'rectal' | 'ear' | 'forehead';
}

export const TEMPERATURE_METHOD_LABELS: Record<string, string> = {
  oral: 'Buccale',
  axillary: 'Axillaire',
  rectal: 'Rectale',
  ear: 'Auriculaire',
  forehead: 'Frontale',
  other: 'Autre',
};

export interface MedicationMetadata {
  medication_name: string;
  dosage_text: string;
  taken_at: string;
  next_reminder_at: string | null;
}

export interface AppointmentMetadata {
  practitioner: string;
  location: string;
  reminder_at: string | null;
}

export interface SymptomMetadata {
  category: string;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // every X days/weeks/months
  end_date: string | null; // ISO date, null = no end
}

export interface Reminder {
  id: string;
  profile_id: string;
  event_id: string | null;
  title: string;
  body: string;
  scheduled_at: string; // ISO string
  /** @deprecated use notification_ids */
  notification_id?: string | null;
  notification_ids: string[];
  is_recurring: boolean;
  recurrence_days: number | null;
  recurrence: RecurrenceRule | null;
  active: boolean;
  created_at: string;
}

export interface AppSettings {
  premium: boolean;
  theme: 'light' | 'dark';
  default_profile_id: string | null;
  notifications_enabled: boolean;
  legal_accepted: boolean;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  symptom: 'Symptôme',
  temperature: 'Température',
  medication: 'Médicament',
  appointment: 'Rendez-vous',
  vaccine: 'Vaccin',
  weight: 'Poids',
  height: 'Taille',
  sleep: 'Sommeil',
  digestion: 'Digestion',
  appetite: 'Appétit',
  mood: 'Humeur',
  note: 'Note libre',
};

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  symptom: '🤒',
  temperature: '🌡️',
  medication: '💊',
  appointment: '📅',
  vaccine: '💉',
  weight: '⚖️',
  height: '📏',
  sleep: '😴',
  digestion: '🫃',
  appetite: '🍽️',
  mood: '😊',
  note: '📝',
};

export const PROFILE_COLORS = [
  '#FF6B6B',
  '#FF9F43',
  '#FECA57',
  '#48DBFB',
  '#1DD1A1',
  '#54A0FF',
  '#A29BFE',
  '#FD79A8',
  '#6C5CE7',
  '#00CEC9',
];

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  self: 'Moi',
  child: 'Enfant',
  parent: 'Parent',
  partner: 'Partenaire',
  sibling: 'Frère / Sœur',
  other: 'Autre',
};

export const INTENSITY_LABELS: Record<number, string> = {
  1: 'Très léger',
  2: 'Léger',
  3: 'Modéré',
  4: 'Fort',
  5: 'Très fort',
};

// ─── Prescriptions ────────────────────────────────────────────────────────────

export type MedicationUnit =
  | 'cp'
  | 'ml'
  | 'mg'
  | 'mcg'
  | 'gélule'
  | 'sachet'
  | 'goutte'
  | 'application'
  | 'autre';

export const MEDICATION_UNIT_LABELS: Record<MedicationUnit, string> = {
  cp: 'Comprimé(s)',
  ml: 'mL',
  mg: 'mg',
  mcg: 'mcg',
  gélule: 'Gélule(s)',
  sachet: 'Sachet(s)',
  goutte: 'Goutte(s)',
  application: 'Application(s)',
  autre: 'Autre',
};

export const MEDICATION_UNITS: MedicationUnit[] = [
  'cp',
  'gélule',
  'sachet',
  'ml',
  'mg',
  'mcg',
  'goutte',
  'application',
  'autre',
];

/** Une ordonnance émise par un médecin pour un profil donné. */
export interface Prescription {
  id: string;
  profile_id: string;
  /** URI locale de la photo de l'ordonnance (sandbox expo-file-system), null si absente. */
  image_uri: string | null;
  /** Date de prescription au format ISO YYYY-MM-DD. */
  prescribed_date: string;
  doctor_name: string;
  /** Notes sensibles — stockées dans SecureNotesService, jamais dans AsyncStorage. */
  notes: string;
  /** Date d'expiration optionnelle au format ISO YYYY-MM-DD. */
  valid_until: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

/** Un médicament saisi depuis une ordonnance, avec son planning de prises. */
export interface PrescribedMedication {
  id: string;
  /** ID de l'ordonnance parente, null si médicament libre (hors ordonnance). */
  prescription_id: string | null;
  profile_id: string;
  name: string;
  dose: number;
  unit: MedicationUnit;
  /** Heures de prise au format HH:mm (ex. ["08:00","12:00","20:00"]). */
  intake_times: string[];
  /** Date de début au format ISO YYYY-MM-DD. */
  start_date: string;
  /** Date de fin au format ISO YYYY-MM-DD, null si indéfinie. */
  end_date: string | null;
  /** IDs des Reminders générés (1 par intake_time). */
  reminder_ids: string[];
  /** false = rappels en pause, médicament non supprimé. */
  active: boolean;
  created_at: string;
  updated_at: string;
}
