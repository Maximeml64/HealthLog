// src/services/NotificationService.ts

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, addMonths } from 'date-fns';
import type { Reminder } from '../types';
import { LIMITS } from '../constants/limits';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleNotification(
  title: string,
  body: string,
  scheduledAt: Date
): Promise<string | null> {
  const now = new Date();
  if (scheduledAt <= now) return null;

  const seconds = Math.floor((scheduledAt.getTime() - now.getTime()) / 1000);
  if (seconds <= 0) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
  });
  return id;
}

export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleRecurringNotification(reminder: Reminder): Promise<string[]> {
  if (!reminder.recurrence) {
    const id = await scheduleNotification(reminder.title, reminder.body, new Date(reminder.scheduled_at));
    return id ? [id] : [];
  }

  const { frequency, interval, end_date } = reminder.recurrence;
  // 'custom' is reserved in the type union but never produced by the
  // current UI. Treat it as "no recurrence" rather than silently
  // dropping every occurrence past the first.
  if (frequency === 'custom') {
    const id = await scheduleNotification(reminder.title, reminder.body, new Date(reminder.scheduled_at));
    return id ? [id] : [];
  }

  const horizon = end_date
    ? new Date(end_date)
    : addDays(new Date(), LIMITS.RECURRING_HORIZON_DAYS);
  const ids: string[] = [];
  let current = new Date(reminder.scheduled_at);

  while (current <= horizon && ids.length < LIMITS.MAX_NOTIFICATIONS_PER_REMINDER) {
    const id = await scheduleNotification(reminder.title, reminder.body, current);
    if (id) ids.push(id);

    if (frequency === 'daily') {
      current = addDays(current, interval);
    } else if (frequency === 'weekly') {
      current = addDays(current, interval * 7);
    } else if (frequency === 'monthly') {
      current = addMonths(current, interval);
    } else {
      break;
    }
  }

  return ids;
}

/**
 * Re-arm all active recurring reminders so a daily reminder doesn't run
 * out of scheduled occurrences (iOS hard-caps at 64 pending). Called at
 * app boot so users who open the app at least once per
 * `MAX_NOTIFICATIONS_PER_REMINDER` days never miss a notification.
 *
 * Returns the updated reminder list with refreshed `notification_ids`,
 * to be persisted by the caller.
 */
export async function rescheduleActiveReminders(
  reminders: Reminder[],
): Promise<Reminder[]> {
  const updated: Reminder[] = [];
  for (const reminder of reminders) {
    if (!reminder.active) {
      updated.push(reminder);
      continue;
    }
    // Skip non-recurring reminders that already fired in the past
    if (!reminder.recurrence && new Date(reminder.scheduled_at) <= new Date()) {
      updated.push(reminder);
      continue;
    }

    try {
      // Cancel existing OS notifications (covers legacy notification_id too)
      const oldIds: string[] = Array.isArray(reminder.notification_ids)
        ? reminder.notification_ids
        : reminder.notification_id
          ? [reminder.notification_id]
          : [];
      await Promise.all(oldIds.map((id) => cancelNotification(id).catch(() => undefined)));

      const newIds = await scheduleRecurringNotification(reminder);
      updated.push({ ...reminder, notification_ids: newIds, notification_id: null });
    } catch {
      // Keep the row even if OS scheduling fails — the user can re-toggle
      // it manually from the Rappels screen.
      updated.push(reminder);
    }
  }
  return updated;
}
