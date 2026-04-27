// src/services/StorageService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile, HealthEvent, Reminder, AppSettings } from '../types';
import * as SecureNotes from './SecureNotesService';

const KEYS = {
  PROFILES: 'profiles',
  EVENTS: 'events',
  REMINDERS: 'reminders',
  SETTINGS: 'settings',
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

// ─── Export (legacy) ─────────────────────────────────────────────────────────

export async function exportAllData(): Promise<string> {
  const [profiles, events, reminders, settings] = await Promise.all([
    getProfiles(),
    getEvents(),
    getReminders(),
    getSettings(),
  ]);
  return JSON.stringify({ profiles, events, reminders, settings, exported_at: new Date().toISOString() }, null, 2);
}

export async function importAllData(jsonString: string): Promise<void> {
  try {
    const data = JSON.parse(jsonString);
    if (data.profiles) await saveProfiles(data.profiles);
    if (data.events) await saveEvents(data.events);
    if (data.reminders) await saveReminders(data.reminders);
    if (data.settings) await saveSettings(data.settings);
  } catch {
    console.warn('[StorageService] Failed to parse import data');
    throw new Error('Format de données invalide');
  }
}

// ─── Clear all ───────────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  // Clear SecureStore notes before wiping AsyncStorage
  try {
    const [profiles, events] = await Promise.all([getProfiles(), getEvents()]);
    await Promise.all([
      ...profiles.map((p) => SecureNotes.deleteNote('profile', p.id)),
      ...events.map((e) => SecureNotes.deleteNote('event', e.id)),
    ]);
  } catch {
    console.warn('[StorageService] Could not clear all SecureStore notes');
  }
  await AsyncStorage.multiRemove([KEYS.PROFILES, KEYS.EVENTS, KEYS.REMINDERS, KEYS.SETTINGS]);
}
