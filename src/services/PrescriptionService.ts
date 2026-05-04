// src/services/PrescriptionService.ts
// Pure business-logic layer for prescriptions.
// No side effects — no Storage calls, no notifications, no fetch.
// All functions are synchronous and easily unit-testable.

import { PrescribedMedication, Reminder, MEDICATION_UNIT_LABELS } from '../types';
import { generateId } from '../utils/helpers';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a human-readable dose string, e.g. "1 cp", "500 mg", "2 ml".
 * Uses the French label from MEDICATION_UNIT_LABELS.
 */
export function formatDose(med: PrescribedMedication): string {
  const unitLabel = MEDICATION_UNIT_LABELS[med.unit] ?? med.unit;
  return `${med.dose} ${unitLabel}`;
}

/**
 * Returns a compact summary of intake times for UI display.
 * Up to 3 times shown as-is; 4+ times shown as "HH:mm + N autres".
 */
export function summarizeIntakeTimes(intake_times: string[]): string {
  if (intake_times.length === 0) return '—';
  if (intake_times.length <= 3) return intake_times.join(', ');
  const first = intake_times[0];
  const remaining = intake_times.length - 1;
  return `${first} + ${remaining} autres`;
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Generates one Reminder per entry in med.intake_times.
 *
 * Each Reminder is scheduled for today at the given HH:mm. The store is
 * responsible for calling upsertReminder (which invokes NotificationService)
 * and for storing the resulting notification_ids back into the Reminder.
 *
 * Returns [] if med.intake_times is empty.
 * Returns Reminders with active: false if med.active === false (no scheduling
 * will occur, but the objects are created for record-keeping).
 */
export function generateRemindersForMedication(
  med: PrescribedMedication,
  profile_id: string
): Reminder[] {
  if (med.intake_times.length === 0) return [];

  const now = new Date();
  const nowIso = now.toISOString();

  return med.intake_times.map((timeStr) => {
    // Build scheduled_at: today at HH:mm local time
    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const scheduledDate = new Date();
    scheduledDate.setHours(hour, minute, 0, 0);

    // If the time has already passed today, advance to tomorrow
    if (scheduledDate <= now) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    const reminder: Reminder = {
      id: generateId(),
      profile_id,
      event_id: null,
      title: med.name,
      body: formatDose(med),
      scheduled_at: scheduledDate.toISOString(),
      notification_ids: [], // filled by store after scheduleRecurringNotification
      notification_id: null,
      is_recurring: true,
      recurrence_days: 1,
      recurrence: {
        frequency: 'daily',
        interval: 1,
        end_date: med.end_date,
      },
      active: med.active,
      created_at: nowIso,
    };

    return reminder;
  });
}
