// src/services/DraftService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EventType } from '../types';

const DRAFT_KEY = 'event_draft_v1';

export interface EventDraft {
  profile_id: string;
  event_type: EventType;
  title: string;
  occurred_at: string;
  note: string;
  numeric_value: string;
  intensity: number | null;
  meta: Record<string, string>;
  photos: string[];
  saved_at: string;
}

/**
 * Persist the current state of the add-event form so an accidental
 * close doesn't lose user input. Stored in AsyncStorage (not
 * SecureStore) since the draft is short-lived and the note field is
 * typically empty mid-edit.
 */
export async function saveDraft(draft: EventDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Non-critical: a missed draft save just means the user loses
    // a few keystrokes if they bail. No user-visible error.
  }
}

export async function loadDraft(): Promise<EventDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EventDraft;
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore — worst case the draft prompts again next time.
  }
}

/**
 * A draft is considered "empty" if the user only saw default values
 * and didn't actually type anything worth restoring.
 */
export function isDraftEmpty(d: EventDraft): boolean {
  return (
    !d.note.trim() &&
    !d.numeric_value.trim() &&
    d.intensity === null &&
    Object.values(d.meta).every((v) => !v || !v.trim()) &&
    d.photos.length === 0
  );
}
