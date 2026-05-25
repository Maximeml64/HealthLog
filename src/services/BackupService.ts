// src/services/BackupService.ts

import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system';
import { format } from 'date-fns';
import {
  getProfiles,
  getEvents,
  getReminders,
  getSettings,
  saveProfiles,
  saveEvents,
  saveReminders,
  saveSettings,
  getPrescriptions,
  getPrescribedMedications,
  savePrescriptions,
  savePrescribedMedications,
  upsertReminder as storageUpsertReminder,
  clearAllData,
} from './StorageService';
import {
  getMenstrualBackupData,
  persistMenstrualBackupData,
  clearMenstrualData,
} from '../stores/useMenstrualStore';
import { ensurePhotoDir } from './PhotoService';
import * as NotificationService from './NotificationService';
import {
  Profile,
  HealthEvent,
  Reminder,
  AppSettings,
  Prescription,
  PrescribedMedication,
  MenstrualCycle,
  PregnancyData,
} from '../types';

const PHOTO_DIR = (FileSystem.documentDirectory ?? '') + 'photos/';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BackupMetadata {
  version: 1 | 2 | 3;
  exported_at: string;
  app_version: string;
}

interface BackupData {
  metadata: BackupMetadata;
  profiles: Profile[];
  events: HealthEvent[];
  reminders: Reminder[];
  settings: AppSettings;
  // v2+ fields — absent in v1 backups, treated as empty arrays on restore
  prescriptions?: Prescription[];
  prescribedMedications?: PrescribedMedication[];
  // v3+ fields — absent in v1/v2 backups, treated as empty arrays on restore
  cycles?: MenstrualCycle[];
  pregnancies?: PregnancyData[];
}

// ─── Photo helpers ────────────────────────────────────────────────────────────

function filenameFromUri(uri: string): string {
  return uri.split('/').pop() ?? uri;
}

/**
 * Reads a photo from the local filesystem and adds it to a JSZip folder.
 * Returns the filename used in the ZIP (to store in the manifest / updated entity).
 * Silently skips if the file is missing or unreadable.
 */
async function addPhotoToZip(folder: JSZip | null, uri: string): Promise<string> {
  const filename = filenameFromUri(uri);
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      folder?.file(filename, base64, { base64: true });
    }
  } catch {
    // photo missing or unreadable — skip silently
  }
  return filename;
}

/**
 * Extracts a photo from a JSZip archive and writes it to PHOTO_DIR.
 * Returns the restored local URI, or null if not found / write failed.
 */
async function restorePhotoFromZip(zip: JSZip, filename: string): Promise<string | null> {
  const photoFile = zip.file(`photos/${filename}`);
  if (!photoFile) return null;
  try {
    const photoBase64 = await photoFile.async('base64');
    const dest = PHOTO_DIR + filename;
    await FileSystem.writeAsStringAsync(dest, photoBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return dest;
  } catch {
    return null;
  }
}

// ─── Notification re-scheduling ───────────────────────────────────────────────

/**
 * Schedules OS notifications for the supplied active reminders and persists
 * the resulting notification_ids to Storage.
 * Called after import to prevent dead reminders (no side effect on the store).
 */
async function rescheduleReminders(reminders: Reminder[]): Promise<void> {
  const active = reminders.filter((r) => r.active);
  await Promise.all(
    active.map(async (reminder) => {
      try {
        const notifIds = await NotificationService.scheduleRecurringNotification(reminder);
        await storageUpsertReminder({
          ...reminder,
          notification_ids: notifIds,
          notification_id: null,
        });
      } catch {
        // Non-critical: reminder row survives even if OS scheduling fails
      }
    }),
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportBackup(): Promise<string> {
  const [profiles, events, reminders, settings, prescriptions, prescribedMedications, menstrualData] =
    await Promise.all([
      getProfiles(),
      getEvents(),
      getReminders(),
      getSettings(),
      getPrescriptions(),
      getPrescribedMedications(),
      getMenstrualBackupData(),
    ]);

  const zip = new JSZip();
  const photosFolder = zip.folder('photos');

  // ── Event photos ──
  const eventsForBackup: HealthEvent[] = await Promise.all(
    events.map(async (event) => {
      if (!event.photos || event.photos.length === 0) return event;
      const filenames = await Promise.all(
        event.photos.map((photoUri) => addPhotoToZip(photosFolder, photoUri)),
      );
      return { ...event, photos: filenames };
    })
  );

  // ── Prescription photos (same folder as event photos) ──
  const prescriptionsForBackup: Prescription[] = await Promise.all(
    prescriptions.map(async (p) => {
      if (!p.image_uri) return p;
      const filename = await addPhotoToZip(photosFolder, p.image_uri);
      return { ...p, image_uri: filename };
    })
  );

  const backupData: BackupData = {
    metadata: {
      version: 3,
      exported_at: new Date().toISOString(),
      app_version: '1.0.0',
    },
    profiles,
    events: eventsForBackup,
    reminders,
    settings,
    prescriptions: prescriptionsForBackup,
    prescribedMedications,
    cycles: menstrualData.cycles,
    pregnancies: menstrualData.pregnancies,
  };

  zip.file('data.json', JSON.stringify(backupData, null, 2));

  const base64 = await zip.generateAsync({ type: 'base64' });
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const zipPath = `${FileSystem.documentDirectory}healthlog-backup-${dateStr}.zip`;

  await FileSystem.writeAsStringAsync(zipPath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return zipPath;
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importBackup(
  zipUri: string,
  mode: 'replace' | 'merge'
): Promise<{
  profiles: number;
  events: number;
  reminders: number;
  photos: number;
  prescriptions: number;
  prescribedMedications: number;
  cycles: number;
  pregnancies: number;
}> {
  const base64 = await FileSystem.readAsStringAsync(zipUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const zip = await JSZip.loadAsync(base64, { base64: true });

  const dataFile = zip.file('data.json');
  if (!dataFile) throw new Error('Format invalide : data.json introuvable dans le ZIP.');

  const dataJson = await dataFile.async('string');
  let data: BackupData;
  try {
    data = JSON.parse(dataJson) as BackupData;
  } catch {
    throw new Error('Format invalide : data.json est corrompu.');
  }

  // Guard: accept v1 (legacy, no prescriptions/menstrual), v2 (no menstrual), v3
  const version = data.metadata?.version;
  if (version !== 1 && version !== 2 && version !== 3) {
    throw new Error('Format incompatible : version de backup non supportée.');
  }

  // Minimal shape check — prevent a malformed JSON from corrupting storage
  if (!Array.isArray(data.profiles) || !Array.isArray(data.events) || !Array.isArray(data.reminders)) {
    throw new Error('Format invalide : champs profils / événements / rappels manquants.');
  }

  // Strip premium flag: backups must never grant entitlements. The user's
  // RevenueCat sync handles premium state; we only restore user preferences.
  const safeSettings: AppSettings | undefined = data.settings
    ? { ...data.settings, premium: false }
    : undefined;

  const isV2 = version === 2 || version === 3;
  const isV3 = version === 3;

  await ensurePhotoDir();

  // ── Restore event photos ──
  let photoCount = 0;
  const restoredEvents: HealthEvent[] = await Promise.all(
    data.events.map(async (event) => {
      if (!event.photos || event.photos.length === 0) return event;
      const results = await Promise.all(
        event.photos.map((filename) => restorePhotoFromZip(zip, filename)),
      );
      const restoredUris: string[] = [];
      for (const uri of results) {
        if (uri) {
          restoredUris.push(uri);
          photoCount++;
        }
      }
      return { ...event, photos: restoredUris };
    })
  );

  // ── Restore prescription photos (v2 only) ──
  const incomingPrescriptions: Prescription[] = isV2 ? (data.prescriptions ?? []) : [];
  const restoredPrescriptions: Prescription[] = await Promise.all(
    incomingPrescriptions.map(async (p) => {
      if (!p.image_uri) return p;
      const uri = await restorePhotoFromZip(zip, p.image_uri);
      if (uri) photoCount++;
      return { ...p, image_uri: uri ?? null };
    })
  );

  const incomingMedications: PrescribedMedication[] = isV2
    ? (data.prescribedMedications ?? [])
    : [];

  const incomingCycles: MenstrualCycle[] = isV3 ? (data.cycles ?? []) : [];
  const incomingPregnancies: PregnancyData[] = isV3 ? (data.pregnancies ?? []) : [];

  // ── Persist and re-schedule ──
  if (mode === 'replace') {
    await clearAllData();
    await clearMenstrualData();

    await Promise.all([
      saveProfiles(data.profiles),
      saveEvents(restoredEvents),
      saveReminders(data.reminders),
      ...(safeSettings ? [saveSettings(safeSettings)] : []),
      ...(isV2
        ? [
            savePrescriptions(restoredPrescriptions),
            savePrescribedMedications(incomingMedications),
          ]
        : []),
      persistMenstrualBackupData({ cycles: incomingCycles, pregnancies: incomingPregnancies }),
    ]);

    // Re-schedule all active reminders (all existing OS notifications are now cancelled
    // because clearAllData wipes AsyncStorage; the OS side may still have stale slots)
    await NotificationService.cancelAllNotifications();
    await rescheduleReminders(data.reminders);
  } else {
    // merge: add only non-duplicate entries
    const [existingProfiles, existingEvents, existingReminders] = await Promise.all([
      getProfiles(),
      getEvents(),
      getReminders(),
    ]);

    const existingProfileIds = new Set(existingProfiles.map((p) => p.id));
    const existingEventIds = new Set(existingEvents.map((e) => e.id));
    const existingReminderIds = new Set(existingReminders.map((r) => r.id));

    const newReminders = data.reminders.filter((r) => !existingReminderIds.has(r.id));

    await Promise.all([
      saveProfiles([
        ...existingProfiles,
        ...data.profiles.filter((p) => !existingProfileIds.has(p.id)),
      ]),
      saveEvents([
        ...existingEvents,
        ...restoredEvents.filter((e) => !existingEventIds.has(e.id)),
      ]),
      saveReminders([...existingReminders, ...newReminders]),
    ]);

    // Re-schedule only the newly imported reminders
    await rescheduleReminders(newReminders);

    if (isV2) {
      const [existingPrescriptions, existingMedications] = await Promise.all([
        getPrescriptions(),
        getPrescribedMedications(),
      ]);
      const existingPrescriptionIds = new Set(existingPrescriptions.map((p) => p.id));
      const existingMedicationIds = new Set(existingMedications.map((m) => m.id));

      await Promise.all([
        savePrescriptions([
          ...existingPrescriptions,
          ...restoredPrescriptions.filter((p) => !existingPrescriptionIds.has(p.id)),
        ]),
        savePrescribedMedications([
          ...existingMedications,
          ...incomingMedications.filter((m) => !existingMedicationIds.has(m.id)),
        ]),
      ]);
    }

    if (isV3) {
      const existing = await getMenstrualBackupData();
      const existingCycleIds = new Set(existing.cycles.map((c) => c.id));
      const existingPregnancyIds = new Set(existing.pregnancies.map((p) => p.id));

      await persistMenstrualBackupData({
        cycles: [
          ...existing.cycles,
          ...incomingCycles.filter((c) => !existingCycleIds.has(c.id)),
        ],
        pregnancies: [
          ...existing.pregnancies,
          ...incomingPregnancies.filter((p) => !existingPregnancyIds.has(p.id)),
        ],
      });
    }
  }

  return {
    profiles: data.profiles.length,
    events: data.events.length,
    reminders: data.reminders.length,
    photos: photoCount,
    prescriptions: restoredPrescriptions.length,
    prescribedMedications: incomingMedications.length,
    cycles: incomingCycles.length,
    pregnancies: incomingPregnancies.length,
  };
}
