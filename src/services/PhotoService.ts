// src/services/PhotoService.ts

import * as FileSystem from 'expo-file-system';

const PHOTO_DIR = (FileSystem.documentDirectory ?? '') + 'photos/';

export async function ensurePhotoDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

export async function savePhoto(uri: string): Promise<string> {
  await ensurePhotoDir();
  const filename = `event_${Date.now()}_${Math.floor(Math.random() * 100000)}.jpg`;
  const dest = PHOTO_DIR + filename;
  await FileSystem.copyAsync({ from: uri, to: dest });
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
