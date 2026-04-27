// src/stores/useAppStore.ts

import { create } from 'zustand';
import { Profile, HealthEvent, Reminder, AppSettings } from '../types';
import * as Storage from '../services/StorageService';
import * as NotificationService from '../services/NotificationService';
import * as PhotoService from '../services/PhotoService';

interface AppState {
  profiles: Profile[];
  events: HealthEvent[];
  reminders: Reminder[];
  settings: AppSettings;
  loading: boolean;

  // Init
  loadAll: () => Promise<void>;

  // Profiles
  upsertProfile: (p: Profile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  archiveProfile: (id: string) => Promise<void>;

  // Events
  upsertEvent: (e: HealthEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsByProfile: (profileId: string) => HealthEvent[];

  // Reminders
  upsertReminder: (r: Reminder) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  // Settings
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  premium: false,
  theme: 'light',
  default_profile_id: null,
  notifications_enabled: true,
  legal_accepted: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  profiles: [],
  events: [],
  reminders: [],
  settings: DEFAULT_SETTINGS,
  loading: true,

  loadAll: async () => {
    set({ loading: true });
    const [profiles, events, reminders, settings] = await Promise.all([
      Storage.getProfiles(),
      Storage.getEvents(),
      Storage.getReminders(),
      Storage.getSettings(),
    ]);
    set({ profiles, events, reminders, settings, loading: false });
  },

  upsertProfile: async (profile) => {
    await Storage.upsertProfile(profile);
    const profiles = await Storage.getProfiles();
    set({ profiles });
  },

  deleteProfile: async (id) => {
    const profileEvents = get().events.filter((e) => e.profile_id === id);
    await Promise.all(
      profileEvents.flatMap((e) => e.photos.map(PhotoService.deletePhoto))
    );
    await Storage.deleteProfile(id);
    const [profiles, events] = await Promise.all([Storage.getProfiles(), Storage.getEvents()]);
    set({ profiles, events });
  },

  archiveProfile: async (id) => {
    const profiles = get().profiles;
    const profile = profiles.find((p) => p.id === id);
    if (!profile) return;
    const updated = { ...profile, archived: true, updated_at: new Date().toISOString() };
    await Storage.upsertProfile(updated);
    set({ profiles: profiles.map((p) => (p.id === id ? updated : p)) });
  },

  upsertEvent: async (event) => {
    await Storage.upsertEvent(event);
    const events = await Storage.getEvents();
    set({ events });
  },

  deleteEvent: async (id) => {
    const event = get().events.find((e) => e.id === id);
    if (event) {
      await Promise.all(event.photos.map(PhotoService.deletePhoto));
    }
    await Storage.deleteEvent(id);
    const events = await Storage.getEvents();
    set({ events });
  },

  getEventsByProfile: (profileId) => {
    return get().events.filter((e) => e.profile_id === profileId);
  },

  upsertReminder: async (reminder) => {
    // Cancel all existing notifications (supports both old string field and new array)
    const oldIds: string[] = Array.isArray(reminder.notification_ids)
      ? reminder.notification_ids
      : reminder.notification_id ? [reminder.notification_id] : [];
    await Promise.all(oldIds.map(NotificationService.cancelNotification));

    // Schedule new notifications (recurring or single)
    let notifIds: string[] = [];
    if (reminder.active) {
      notifIds = await NotificationService.scheduleRecurringNotification(reminder);
    }
    const updated = { ...reminder, notification_ids: notifIds, notification_id: null };
    await Storage.upsertReminder(updated);
    const reminders = await Storage.getReminders();
    set({ reminders });
  },

  deleteReminder: async (id) => {
    const reminders = get().reminders;
    const reminder = reminders.find((r) => r.id === id);
    if (reminder) {
      const ids: string[] = Array.isArray(reminder.notification_ids)
        ? reminder.notification_ids
        : reminder.notification_id ? [reminder.notification_id] : [];
      await Promise.all(ids.map(NotificationService.cancelNotification));
    }
    await Storage.deleteReminder(id);
    set({ reminders: reminders.filter((r) => r.id !== id) });
  },

  updateSettings: async (partial) => {
    const current = get().settings;
    const updated = { ...current, ...partial };
    await Storage.saveSettings(updated);
    set({ settings: updated });
  },
}));
