// src/services/StorageService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile, HealthEvent, Reminder, AppSettings } from '../types';

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
  return JSON.parse(raw) as Profile[];
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles));
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
  const profiles = await getProfiles();
  await saveProfiles(profiles.filter((p) => p.id !== id));
  // Cascade delete events
  const events = await getEvents();
  await saveEvents(events.filter((e) => e.profile_id !== id));
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function getEvents(): Promise<HealthEvent[]> {
  const raw = await AsyncStorage.getItem(KEYS.EVENTS);
  if (!raw) return [];
  const events = JSON.parse(raw) as HealthEvent[];
  return events.map((e) => (e.photos ? e : { ...e, photos: [] }));
}

export async function saveEvents(events: HealthEvent[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
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
  return JSON.parse(raw) as Reminder[];
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
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as AppSettings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

// ─── Export (premium) ────────────────────────────────────────────────────────

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
  const data = JSON.parse(jsonString);
  if (data.profiles) await saveProfiles(data.profiles);
  if (data.events) await saveEvents(data.events);
  if (data.reminders) await saveReminders(data.reminders);
  if (data.settings) await saveSettings(data.settings);
}

// ─── Clear all ───────────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.PROFILES, KEYS.EVENTS, KEYS.REMINDERS, KEYS.SETTINGS]);
}
