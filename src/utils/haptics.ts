// src/utils/haptics.ts
//
// Tiny wrapper around expo-haptics. Centralised so we don't sprinkle
// `Haptics.notificationAsync(...)` calls across screens — and so the
// whole feature can be silenced in one place if we ever add an
// "Effets haptiques" toggle in Réglages.
//
// All calls are fire-and-forget: errors swallowed, never blocks UI.

import * as Haptics from 'expo-haptics';

function safe(fn: () => Promise<unknown>): void {
  void fn().catch(() => undefined);
}

export const haptic = {
  /** Light tap — neutral interaction (FAB press, chip toggle). */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /** Medium impact — meaningful selection (Premium tier picked). */
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /** Success notification — event saved, purchase confirmed. */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),

  /** Warning — destructive confirmation accepted (delete). */
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),

  /** Error — purchase failed, validation error. */
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
