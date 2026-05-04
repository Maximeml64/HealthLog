// src/services/StorageService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile, HealthEvent, Reminder, AppSettings, Prescription, PrescribedMedication } from '../types';
import * as SecureNotes from './SecureNotesService';

const KEYS = {
  PROFILES: 'profiles',
  EVENTS: 'events',
  REMINDERS: 'reminders',
  SETTINGS: 'settings',
  PRESCRIPTIONS: 'prescriptions',
  PRESCRIBED_MEDICATIONS: 'prescribed_medications',
} as const;

// ─── Profiles ────────────────────────────────────────────────────────────────

export async function getProfiles(): Promise<Profile[]> {
  const raw = await AsyncStorage.getItem(KEYS.PROFILES);
  if (!raw) return [];
  let profiles: Profile[];
  try {
    profiles = JSON.parse(raw) as Profile[];
  } catch {
    console.warn('[StorageService] Failed to parse profiles from storage');
    return [];
  }
  // Inject notes from SecureStore
  return Promise.all(
    profiles.map(async (p) => ({ ...p, notes: await SecureNotes.getNote('profile', p.id) }))
  );
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
  // Persist notes to SecureStore, strip from AsyncStorage payload
  await Promise.all(profiles.map((p) => SecureNotes.saveNote('profile', p.id, p.notes)));
  const stripped = profiles.map((p) => ({ ...p, notes: '' }));
  await AsyncStorage.setItem(KEYS.PROFILES, JSON.stringify(stripped));
}

export async function upsertProfile(profile: Profile): Promise<void> {
  const profiles = await getProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }
  await saveProfiles(profiles);
}

export async function deleteProfile(id: string): Promise<void> {
  // Cascade: delete notes for profile's events first, then profile note
  const events = await getEvents();
  const profileEvents = events.filter((e) => e.profile_id === id);
  await Promise.all(profileEvents.map((e) => SecureNotes.deleteNote('event', e.id)));
  await SecureNotes.deleteNote('profile', id);

  const profiles = await getProfiles();
  await saveProfiles(profiles.filter((p) => p.id !== id));
  await saveEvents(events.filter((e) => e.profile_id !== id));
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function getEvents(): Promise<HealthEvent[]> {
  const raw = await AsyncStorage.getItem(KEYS.EVENTS);
  if (!raw) return [];
  let events: HealthEvent[];
  try {
    events = JSON.parse(raw) as HealthEvent[];
  } catch {
    console.warn('[StorageService] Failed to parse events from storage');
    return [];
  }
  // Ensure photos field + inject notes from SecureStore
  return Promise.all(
    events.map(async (e) => ({
      ...(e.photos ? e : { ...e, photos: [] }),
      note: await SecureNotes.getNote('event', e.id),
    }))
  );
}

export async function saveEvents(events: HealthEvent[]): Promise<void> {
  // Persist notes to SecureStore, strip from AsyncStorage payload
  await Promise.all(events.map((e) => SecureNotes.saveNote('event', e.id, e.note)));
  const stripped = events.map((e) => ({ ...e, note: '' }));
  await AsyncStorage.setItem(KEYS.EVENTS, JSON.stringify(stripped));
}

export async function upsertEvent(event: HealthEvent): Promise<void> {
  const events = await getEvents();
  const idx = events.findIndex((e) => e.id === event.id);
  if (idx >= 0) {
    events[idx] = event;
  } else {
    events.push(event);
  }
  await saveEvents(events);
}

export async function deleteEvent(id: string): Promise<void> {
  await SecureNotes.deleteNote('event', id);
  const events = await getEvents();
  await saveEvents(events.filter((e) => e.id !== id));
}

export async function getEventsByProfile(profileId: string): Promise<HealthEvent[]> {
  const events = await getEvents();
  return events.filter((e) => e.profile_id === profileId);
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export async function getReminders(): Promise<Reminder[]> {
  const raw = await AsyncStorage.getItem(KEYS.REMINDERS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Reminder[];
  } catch {
    console.warn('[StorageService] Failed to parse reminders from storage');
    return [];
  }
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.REMINDERS, JSON.stringify(reminders));
}

export async function upsertReminder(reminder: Reminder): Promise<void> {
  const reminders = await getReminders();
  const idx = reminders.findIndex((r) => r.id === reminder.id);
  if (idx >= 0) {
    reminders[idx] = reminder;
  } else {
    reminders.push(reminder);
  }
  await saveReminders(reminders);
}

export async function deleteReminder(id: string): Promise<void> {
  const reminders = await getReminders();
  await saveReminders(reminders.filter((r) => r.id !== id));
}

// ─── Settings ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  premium: false,
  theme: 'light',
  default_profile_id: null,
  notifications_enabled: true,
  legal_accepted: false,
};

export async function getSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as AppSettings;
  } catch {
    console.warn('[StorageService] Failed to parse settings from storage');
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

// ─── Prescriptions ────────────────────────────────────────────────────────────
// notes → SecureStore (entityType 'prescription'), stripped in AsyncStorage payload

export async function getPrescriptions(): Promise<Prescription[]> {
  const raw = await AsyncStorage.getItem(KEYS.PRESCRIPTIONS);
  if (!raw) return [];
  let prescriptions: Prescription[];
  try {
    prescriptions = JSON.parse(raw) as Prescription[];
  } catch {
    console.warn('[StorageService] Failed to parse prescriptions from storage');
    return [];
  }
  return Promise.all(
    prescriptions.map(async (p) => ({
      ...p,
      notes: await SecureNotes.getNote('prescription', p.id),
    }))
  );
}

export async function savePrescriptions(prescriptions: Prescription[]): Promise<void> {
  await Promise.all(
    prescriptions.map((p) => SecureNotes.saveNote('prescription', p.id, p.notes))
  );
  const stripped = prescriptions.map((p) => ({ ...p, notes: '' }));
  await AsyncStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(stripped));
}

export async function upsertPrescription(prescription: Prescription): Promise<void> {
  const prescriptions = await getPrescriptions();
  const idx = prescriptions.findIndex((p) => p.id === prescription.id);
  if (idx >= 0) {
    prescriptions[idx] = prescription;
  } else {
    prescriptions.push(prescription);
  }
  await savePrescriptions(prescriptions);
}

/**
 * Cascade delete: SecureNotes + linked PrescribedMedications + their Reminders.
 * Photo deletion is handled at the store/service layer (requires PhotoService).
 */
export async function deletePrescription(id: string): Promise<void> {
  // 1. Delete prescription note from SecureStore
  await SecureNotes.deleteNote('prescription', id);

  // 2. Collect linked medications to get their reminder_ids before deletion
  const allMeds = await getPrescribedMedications();
  const linkedMeds = allMeds.filter((m) => m.prescription_id === id);
  const reminderIdsToDelete = linkedMeds.flatMap((m) => m.reminder_ids);

  // 3. Delete linked prescribed_medications
  await savePrescribedMedications(allMeds.filter((m) => m.prescription_id !== id));

  // 4. Delete reminders that belonged to these medications
  if (reminderIdsToDelete.length > 0) {
    const reminders = await getReminders();
    const reminderIdSet = new Set(reminderIdsToDelete);
    await saveReminders(reminders.filter((r) => !reminderIdSet.has(r.id)));
  }

  // 5. Delete the prescription itself
  const prescriptions = await getPrescriptions();
  await savePrescriptions(prescriptions.filter((p) => p.id !== id));
}

// ─── PrescribedMedications ───────────────────────────────────────────────────
// Pure AsyncStorage — no sensitive fields to route via SecureStore

export async function getPrescribedMedications(): Promise<PrescribedMedication[]> {
  const raw = await AsyncStorage.getItem(KEYS.PRESCRIBED_MEDICATIONS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PrescribedMedication[];
  } catch {
    console.warn('[StorageService] Failed to parse prescribed_medications from storage');
    return [];
  }
}

export async function savePrescribedMedications(meds: PrescribedMedication[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.PRESCRIBED_MEDICATIONS, JSON.stringify(meds));
}

export async function upsertPrescribedMedication(med: PrescribedMedication): Promise<void> {
  const meds = await getPrescribedMedications();
  const idx = meds.findIndex((m) => m.id === med.id);
  if (idx >= 0) {
    meds[idx] = med;
  } else {
    meds.push(med);
  }
  await savePrescribedMedications(meds);
}

/**
 * Cascade delete: removes the medication + all Reminders listed in its reminder_ids.
 * Notification cancellation is handled at the store layer (requires NotificationService).
 */
export async function deletePrescribedMedication(id: string): Promise<void> {
  const meds = await getPrescribedMedications();
  const med = meds.find((m) => m.id === id);

  // Remove reminders from AsyncStorage that belong to this medication
  if (med && med.reminder_ids.length > 0) {
    const reminders = await getReminders();
    const idSet = new Set(med.reminder_ids);
    await saveReminders(reminders.filter((r) => !idSet.has(r.id)));
  }

  await savePrescribedMedications(meds.filter((m) => m.id !== id));
}

// ─── Export (legacy) ─────────────────────────────────────────────────────────

export async function exportAllData(): Promise<string> {
  const [profiles, events, reminders, settings, prescriptions, prescribedMedications] =
    await Promise.all([
      getProfiles(),
      getEvents(),
      getReminders(),
      getSettings(),
      getPrescriptions(),
      getPrescribedMedications(),
    ]);
  return JSON.stringify(
    { profiles, events, reminders, settings, prescriptions, prescribedMedications, exported_at: new Date().toISOString() },
    null,
    2
  );
}

export async function importAllData(jsonString: string): Promise<void> {
  try {
    const data = JSON.parse(jsonString);
    if (data.profiles) await saveProfiles(data.profiles);
    if (data.events) await saveEvents(data.events);
    if (data.reminders) await saveReminders(data.reminders);
    if (data.settings) await saveSettings(data.settings);
    if (data.prescriptions) await savePrescriptions(data.prescriptions);
    if (data.prescribedMedications) await savePrescribedMedications(data.prescribedMedications);
  } catch {
    console.warn('[StorageService] Failed to parse import data');
    throw new Error('Format de données invalide');
  }
}

// ─── Clear all ───────────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  // Clear SecureStore notes before wiping AsyncStorage
  try {
    const [profiles, events, prescriptions] = await Promise.all([
      getProfiles(),
      getEvents(),
      getPrescriptions(),
    ]);
    await Promise.all([
      ...profiles.map((p) => SecureNotes.deleteNote('profile', p.id)),
      ...events.map((e) => SecureNotes.deleteNote('event', e.id)),
      ...prescriptions.map((p) => SecureNotes.deleteNote('prescription', p.id)),
    ]);
  } catch {
    console.warn('[StorageService] Could not clear all SecureStore notes');
  }
  await AsyncStorage.multiRemove([
    KEYS.PROFILES,
    KEYS.EVENTS,
    KEYS.REMINDERS,
    KEYS.SETTINGS,
    KEYS.PRESCRIPTIONS,
    KEYS.PRESCRIBED_MEDICATIONS,
  ]);
}
