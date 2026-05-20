// src/services/PhotoService.ts

import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

const PHOTO_DIR = (FileSystem.documentDirectory ?? '') + 'photos/';

// Sweet spot for prescription/symptom photos: 1600px width is enough for
// pinch-to-zoom on the original prescription text, and 0.75 JPEG quality
// brings a typical iPhone 12-MP photo from 4-5 MB down to ~400-700 KB.
// Halving the storage footprint × the time to backup-zip every photo.
const MAX_WIDTH = 1600;
const COMPRESS_QUALITY = 0.75;

/**
 * On iOS, files under `documentDirectory` are included in iCloud Backups
 * by default. Health photos can be sensitive (ordonnances, symptômes,
 * suivi menstruel), so we mark the directory as excluded from backup
 * via the NSURLIsExcludedFromBackupKey filesystem attribute. The user
 * can still export an explicit ZIP backup from the Réglages screen.
 *
 * `FileSystem.setBackupAsync` is iOS-only and a no-op elsewhere.
 */
async function setNoBackupFlag(path: string): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const fs = FileSystem as unknown as {
    setBackupAsync?: (opts: { uri: string; backup: boolean }) => Promise<void>;
  };
  try {
    if (typeof fs.setBackupAsync === 'function') {
      await fs.setBackupAsync({ uri: path, backup: false });
    }
  } catch {
    // Best-effort: missing API on older Expo SDKs simply falls back to
    // default backup behaviour. Not worth surfacing to the user.
  }
}

export async function ensurePhotoDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
  await setNoBackupFlag(PHOTO_DIR);
}

export async function savePhoto(uri: string): Promise<string> {
  await ensurePhotoDir();
  // Resize + recompress BEFORE copying into the sandbox. Storing 4-5 MB
  // originals would balloon both the photo dir and every future backup
  // ZIP, with no perceptual benefit for what is essentially a thumbnail
  // of a prescription / symptom.
  const manipulated = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: COMPRESS_QUALITY, format: SaveFormat.JPEG },
  );
  const filename = `event_${Date.now()}_${Math.floor(Math.random() * 100000)}.jpg`;
  const dest = PHOTO_DIR + filename;
  await FileSystem.copyAsync({ from: manipulated.uri, to: dest });
  await setNoBackupFlag(dest);
  return dest;
}

export async function deletePhoto(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // ignore missing files silently
  }
}
