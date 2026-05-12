// src/stores/useAppStore.ts

import * as Sentry from '@sentry/react-native';
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

/**
 * Reads stored reminders, migrates any legacy `notification_id` rows
 * into the array-based `notification_ids`, and re-schedules active
 * recurring reminders so they never run out of OS-scheduled
 * occurrences. Idempotent; safe to call on every app boot.
 */
async function migrateAndRescheduleReminders(stored: Reminder[]): Promise<Reminder[]> {
  // Normalize legacy shape upfront so downstream code only deals with
  // notification_ids: string[].
  const normalized = stored.map((r) => {
    if (!Array.isArray(r.notification_ids)) {
      const legacy = r.notification_id ? [r.notification_id] : [];
      return { ...r, notification_ids: legacy, notification_id: null };
    }
    return r.notification_id ? { ...r, notification_id: null } : r;
  });

  let migrated: Reminder[];
  try {
    migrated = await NotificationService.rescheduleActiveReminders(normalized);
  } catch (e) {
    Sentry.captureException(e, { tags: { context: 'reminder_reschedule_boot' } });
    migrated = normalized;
  }

  // Persist only if anything actually changed (avoid an unnecessary write
  // on cold boot when no migration was needed).
  const changed =
    migrated.length !== stored.length ||
    migrated.some((m, i) => {
      const s = stored[i];
      if (!s || s.id !== m.id) return true;
      if ((s.notification_id ?? null) !== (m.notification_id ?? null)) return true;
      const a = m.notification_ids ?? [];
      const b = s.notification_ids ?? [];
      if (a.length !== b.length) return true;
      return a.some((id, j) => id !== b[j]);
    });
  if (changed) {
    try {
      await Storage.saveReminders(migrated);
    } catch (e) {
      Sentry.captureException(e, { tags: { context: 'reminder_persist_boot' } });
    }
  }
  return migrated;
}

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
    const [profiles, events, storedReminders, settings, prescriptions, prescribedMedications] =
      await Promise.all([
        Storage.getProfiles(),
        Storage.getEvents(),
        Storage.getReminders(),
        Storage.getSettings(),
        Storage.getPrescriptions(),
        Storage.getPrescribedMedications(),
      ]);
    const reminders = await migrateAndRescheduleReminders(storedReminders);
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
    const photoResults = await Promise.allSettled(
      profileEvents.flatMap((e) => e.photos.map(PhotoService.deletePhoto)),
    );
    photoResults
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .forEach((r) =>
        Sentry.captureException(r.reason, { tags: { context: 'delete_profile_photo' } }),
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
      const photoResults = await Promise.allSettled(
        event.photos.map(PhotoService.deletePhoto),
      );
      photoResults
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .forEach((r) =>
          Sentry.captureException(r.reason, { tags: { context: 'delete_event_photo' } }),
        );
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
      try {
        await PhotoService.deletePhoto(prescription.image_uri);
      } catch (e) {
        Sentry.captureException(e, { tags: { context: 'delete_prescription_photo' } });
      }
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
