// src/services/SecureNotesService.ts
// Stores sensitive notes in the iOS Keychain via expo-secure-store.
// SecureStore has a ~2048-byte limit per key on iOS.

import * as SecureStore from 'expo-secure-store';

const MAX_CHARS = 600; // conservative: ~1800 bytes worst-case UTF-8, safe under 2048

function noteKey(entityType: 'event' | 'profile' | 'prescription', entityId: string): string {
  return `note_${entityType}_${entityId}`;
}

export async function saveNote(
  entityType: 'event' | 'profile' | 'prescription',
  entityId: string,
  note: string
): Promise<void> {
  const key = noteKey(entityType, entityId);
  if (!note) {
    try { await SecureStore.deleteItemAsync(key); } catch { /* already absent */ }
    return;
  }
  let value = note;
  if (value.length > MAX_CHARS) {
    console.warn(`[SecureNotes] Note for ${entityType}:${entityId} exceeds ${MAX_CHARS} chars, truncating`);
    value = value.slice(0, MAX_CHARS);
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getNote(
  entityType: 'event' | 'profile' | 'prescription',
  entityId: string
): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(noteKey(entityType, entityId))) ?? '';
  } catch {
    return '';
  }
}

export async function deleteNote(
  entityType: 'event' | 'profile' | 'prescription',
  entityId: string
): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(noteKey(entityType, entityId));
  } catch { /* already absent */ }
}
