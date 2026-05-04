// src/stores/useAppStore.ts

import { create } from 'zustand';
import {
  Profile,
  HealthEvent,
  Reminder,
  AppSettings,
  Prescription,
  PrescribedMedication,
} from '../types';
import * as Storage from '../services/StorageService';
import * as NotificationService from '../services/NotificationService';
import * as PhotoService from '../services/PhotoService';
import * as PrescriptionService from '../services/PrescriptionService';

interface AppState {
  profiles: Profile[];
  events: HealthEvent[];
  reminders: Reminder[];
  settings: AppSettings;
  prescriptions: Prescription[];
  prescribedMedications: PrescribedMedication[];
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

  // Reminders — returns the persisted Reminder with notification_ids filled
  upsertReminder: (r: Reminder) => Promise<Reminder>;
  deleteReminder: (id: string) => Promise<void>;

  // Prescriptions
  upsertPrescription: (p: Prescription) => Promise<void>;
  deletePrescription: (id: string) => Promise<void>;
  upsertPrescribedMedication: (med: PrescribedMedication) => Promise<void>;
  deletePrescribedMedication: (id: string) => Promise<void>;

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
  prescriptions: [],
  prescribedMedications: [],
  loading: true,

  // ─── Init ──────────────────────────────────────────────────────────────────

  loadAll: async () => {
    set({ loading: true });
    const [profiles, events, reminders, settings, prescriptions, prescribedMedications] =
      await Promise.all([
        Storage.getProfiles(),
        Storage.getEvents(),
        Storage.getReminders(),
        Storage.getSettings(),
        Storage.getPrescriptions(),
        Storage.getPrescribedMedications(),
      ]);
    set({ profiles, events, reminders, settings, prescriptions, prescribedMedications, loading: false });
  },

  // ─── Profiles ──────────────────────────────────────────────────────────────

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

  // ─── Events ────────────────────────────────────────────────────────────────

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

  // ─── Reminders ─────────────────────────────────────────────────────────────
  // MODIFIED: now returns the persisted Reminder with notification_ids filled.
  // Required by upsertPrescribedMedication to collect scheduling results.

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
    const updated: Reminder = { ...reminder, notification_ids: notifIds, notification_id: null };
    await Storage.upsertReminder(updated);
    const reminders = await Storage.getReminders();
    set({ reminders });
    return updated;
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

  // ─── Prescriptions ─────────────────────────────────────────────────────────

  upsertPrescription: async (prescription) => {
    await Storage.upsertPrescription(prescription);
    const prescriptions = await Storage.getPrescriptions();
    set({ prescriptions });
  },

  deletePrescription: async (id) => {
    const { prescribedMedications, reminders } = get();

    // 1. Cancel OS notifications for every reminder linked to this prescription
    const linkedMeds = prescribedMedications.filter((m) => m.prescription_id === id);
    const linkedReminderIdSet = new Set(linkedMeds.flatMap((m) => m.reminder_ids));
    const linkedReminders = reminders.filter((r) => linkedReminderIdSet.has(r.id));
    await Promise.all(
      linkedReminders.flatMap((r) =>
        r.notification_ids.map(NotificationService.cancelNotification)
      )
    );

    // 2. Delete prescription photo from the local filesystem
    const prescription = get().prescriptions.find((p) => p.id === id);
    if (prescription?.image_uri) {
      await PhotoService.deletePhoto(prescription.image_uri);
    }

    // 3. Cascade Storage delete: SecureNotes + meds + reminders rows in AsyncStorage
    await Storage.deletePrescription(id);

    // 4. Reload the three affected slices
    const [prescriptions, updatedMeds, updatedReminders] = await Promise.all([
      Storage.getPrescriptions(),
      Storage.getPrescribedMedications(),
      Storage.getReminders(),
    ]);
    set({ prescriptions, prescribedMedications: updatedMeds, reminders: updatedReminders });
  },

  upsertPrescribedMedication: async (med) => {
    const { prescribedMedications, reminders } = get();

    // 1. If this is an update, cancel and remove all old reminders first
    const existing = prescribedMedications.find((m) => m.id === med.id);
    if (existing && existing.reminder_ids.length > 0) {
      const oldIdSet = new Set(existing.reminder_ids);
      const oldReminders = reminders.filter((r) => oldIdSet.has(r.id));

      // Cancel OS notifications
      await Promise.all(
        oldReminders.flatMap((r) =>
          r.notification_ids.map(NotificationService.cancelNotification)
        )
      );
      // Remove reminder rows from Storage
      await Promise.all(existing.reminder_ids.map(Storage.deleteReminder));
    }

    // 2. Generate fresh Reminder objects (pure, no side effects)
    const newReminders = PrescriptionService.generateRemindersForMedication(med, med.profile_id);

    // 3. Persist and schedule each reminder via the existing upsertReminder action.
    //    upsertReminder returns the Reminder with notification_ids filled.
    //    Reminders are processed sequentially to avoid AsyncStorage write races.
    const persistedReminders: Reminder[] = [];
    for (const r of newReminders) {
      const persisted = await get().upsertReminder(r);
      persistedReminders.push(persisted);
    }

    // 4. Update the medication with the confirmed reminder IDs and persist
    const updatedMed: PrescribedMedication = {
      ...med,
      reminder_ids: persistedReminders.map((r) => r.id),
    };
    await Storage.upsertPrescribedMedication(updatedMed);

    // 5. Reload both slices (reminders already reloaded by upsertReminder above,
    //    but we reload again to guarantee consistency)
    const [updatedMeds, updatedReminders] = await Promise.all([
      Storage.getPrescribedMedications(),
      Storage.getReminders(),
    ]);
    set({ prescribedMedications: updatedMeds, reminders: updatedReminders });
  },

  deletePrescribedMedication: async (id) => {
    const { prescribedMedications, reminders } = get();
    const med = prescribedMedications.find((m) => m.id === id);

    if (med && med.reminder_ids.length > 0) {
      const idSet = new Set(med.reminder_ids);
      const linkedReminders = reminders.filter((r) => idSet.has(r.id));

      // Cancel OS notifications
      await Promise.all(
        linkedReminders.flatMap((r) =>
          r.notification_ids.map(NotificationService.cancelNotification)
        )
      );
      // Remove reminder rows from Storage
      await Promise.all(med.reminder_ids.map(Storage.deleteReminder));
    }

    // Storage cascade also cleans reminder rows, but we already removed them above
    await Storage.deletePrescribedMedication(id);

    const [updatedMeds, updatedReminders] = await Promise.all([
      Storage.getPrescribedMedications(),
      Storage.getReminders(),
    ]);
    set({ prescribedMedications: updatedMeds, reminders: updatedReminders });
  },

  // ─── Settings ──────────────────────────────────────────────────────────────

  updateSettings: async (partial) => {
    const current = get().settings;
    const updated = { ...current, ...partial };
    await Storage.saveSettings(updated);
    set({ settings: updated });
  },
}));
