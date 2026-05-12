// src/constants/limits.ts

/**
 * Centralised numeric limits used across the app.
 * Update one place, not eight.
 */

export const LIMITS = {
  /**
   * Hard cap on per-reminder scheduled OS notifications.
   * iOS allows max 64 pending notifications per app — we leave a small
   * headroom for one-shot reminders scheduled by other features.
   * We re-schedule on every app launch, so a recurring reminder is
   * effectively "infinite" as long as the user opens the app at least
   * once per `MAX_NOTIFICATIONS_PER_REMINDER` occurrences.
   */
  MAX_NOTIFICATIONS_PER_REMINDER: 60,

  /** How far into the future to pre-schedule recurring notifications. */
  RECURRING_HORIZON_DAYS: 365,

  /** Maximum chars for a SecureStore-backed note. */
  MAX_NOTE_CHARS: 600,

  /** Maximum number of photos per event. */
  MAX_PHOTOS_PER_EVENT: 5,

  /** Auto-save debounce delay for the add-event draft, in ms. */
  DRAFT_AUTOSAVE_MS: 800,
} as const;
