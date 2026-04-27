// src/types/index.ts

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
