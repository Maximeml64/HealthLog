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
  clearAllData,
} from './StorageService';
import { ensurePhotoDir } from './PhotoService';
import { Profile, HealthEvent, Reminder, AppSettings } from '../types';

const PHOTO_DIR = (FileSystem.documentDirectory ?? '') + 'photos/';

interface BackupMetadata {
  version: 1;
  exported_at: string;
  app_version: string;
}

interface BackupData {
  metadata: BackupMetadata;
  profiles: Profile[];
  events: HealthEvent[];
  reminders: Reminder[];
  settings: AppSettings;
}

function filenameFromUri(uri: string): string {
  return uri.split('/').pop() ?? uri;
}

export async function exportBackup(): Promise<string> {
  const [profiles, events, reminders, settings] = await Promise.all([
    getProfiles(),
    getEvents(),
    getReminders(),
    getSettings(),
  ]);

  const zip = new JSZip();
  const photosFolder = zip.folder('photos');

  const eventsForBackup: HealthEvent[] = await Promise.all(
    events.map(async (event) => {
      if (!event.photos || event.photos.length === 0) return event;

      const filenames: string[] = [];
      for (const photoUri of event.photos) {
        const filename = filenameFromUri(photoUri);
        try {
          const info = await FileSystem.getInfoAsync(photoUri);
          if (info.exists) {
            const base64 = await FileSystem.readAsStringAsync(photoUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            photosFolder?.file(filename, base64, { base64: true });
          }
        } catch {
          // photo missing or unreadable — skip silently
        }
        filenames.push(filename);
      }
      return { ...event, photos: filenames };
    })
  );

  const backupData: BackupData = {
    metadata: {
      version: 1,
      exported_at: new Date().toISOString(),
      app_version: '1.0.0',
    },
    profiles,
    events: eventsForBackup,
    reminders,
    settings,
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

export async function importBackup(
  zipUri: string,
  mode: 'replace' | 'merge'
): Promise<{ profiles: number; events: number; reminders: number; photos: number }> {
  const base64 = await FileSystem.readAsStringAsync(zipUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const zip = await JSZip.loadAsync(base64, { base64: true });

  const dataFile = zip.file('data.json');
  if (!dataFile) throw new Error('Format invalide : data.json introuvable dans le ZIP.');

  const dataJson = await dataFile.async('string');
  const data = JSON.parse(dataJson) as BackupData;

  if (data.metadata?.version !== 1) {
    throw new Error('Format incompatible : version de backup non supportée.');
  }

  await ensurePhotoDir();

  let photoCount = 0;
  const restoredEvents: HealthEvent[] = await Promise.all(
    data.events.map(async (event) => {
      if (!event.photos || event.photos.length === 0) return event;

      const restoredUris: string[] = [];
      for (const filename of event.photos) {
        const photoFile = zip.file(`photos/${filename}`);
        if (photoFile) {
          try {
            const photoBase64 = await photoFile.async('base64');
            const dest = PHOTO_DIR + filename;
            await FileSystem.writeAsStringAsync(dest, photoBase64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            restoredUris.push(dest);
            photoCount++;
          } catch {
            // skip photos that fail to write
          }
        }
      }
      return { ...event, photos: restoredUris };
    })
  );

  if (mode === 'replace') {
    await clearAllData();
    await Promise.all([
      saveProfiles(data.profiles),
      saveEvents(restoredEvents),
      saveReminders(data.reminders),
      saveSettings(data.settings),
    ]);
  } else {
    const [existingProfiles, existingEvents, existingReminders] = await Promise.all([
      getProfiles(),
      getEvents(),
      getReminders(),
    ]);

    const existingProfileIds = new Set(existingProfiles.map((p) => p.id));
    const existingEventIds = new Set(existingEvents.map((e) => e.id));
    const existingReminderIds = new Set(existingReminders.map((r) => r.id));

    await Promise.all([
      saveProfiles([...existingProfiles, ...data.profiles.filter((p) => !existingProfileIds.has(p.id))]),
      saveEvents([...existingEvents, ...restoredEvents.filter((e) => !existingEventIds.has(e.id))]),
      saveReminders([...existingReminders, ...data.reminders.filter((r) => !existingReminderIds.has(r.id))]),
    ]);
  }

  return {
    profiles: data.profiles.length,
    events: data.events.length,
    reminders: data.reminders.length,
    photos: photoCount,
  };
}
