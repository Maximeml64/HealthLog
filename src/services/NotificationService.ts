// src/services/NotificationService.ts

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, addMonths } from 'date-fns';
import type { Reminder } from '../types';

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

const MAX_SCHEDULED = 60;

export async function scheduleRecurringNotification(reminder: Reminder): Promise<string[]> {
  if (!reminder.recurrence) {
    const id = await scheduleNotification(reminder.title, reminder.body, new Date(reminder.scheduled_at));
    return id ? [id] : [];
  }

  const { frequency, interval, end_date } = reminder.recurrence;
  const horizon = end_date ? new Date(end_date) : addDays(new Date(), 365);
  const ids: string[] = [];
  let current = new Date(reminder.scheduled_at);

  while (current <= horizon && ids.length < MAX_SCHEDULED) {
    const id = await scheduleNotification(reminder.title, reminder.body, current);
    if (id) ids.push(id);

    if (frequency === 'daily') {
      current = addDays(current, interval);
    } else if (frequency === 'weekly') {
      current = addDays(current, interval * 7);
    } else if (frequency === 'monthly') {
      current = addMonths(current, interval);
    } else {
      break; // 'custom': not yet implemented
    }
  }

  return ids;
}
