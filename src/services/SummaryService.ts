// src/services/SummaryService.ts

import { HealthEvent, Profile, EVENT_TYPE_LABELS } from '../types';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { safeParseMeta } from '../utils/safeParse';

export interface EpisodeSummary {
  profile: Profile;
  period: { start: Date; end: Date };
  eventCount: number;
  temperatureMin: number | null;
  temperatureMax: number | null;
  temperatureReadings: number;
  eventsByType: Record<string, number>;
  medications: string[];
  appointments: { title: string; date: string; practitioner?: string }[];
  text: string;
}

export function generateEpisodeSummary(
  profile: Profile,
  events: HealthEvent[],
  start: Date,
  end: Date
): EpisodeSummary {
  const filtered = events.filter((e) => {
    const d = parseISO(e.occurred_at);
    return e.profile_id === profile.id && isWithinInterval(d, { start, end });
  });

  const temperatures = filtered
    .filter((e) => e.event_type === 'temperature' && e.numeric_value !== null)
    .map((e) => e.numeric_value as number);

  const eventsByType: Record<string, number> = {};
  for (const e of filtered) {
    const label = EVENT_TYPE_LABELS[e.event_type] ?? e.event_type;
    eventsByType[label] = (eventsByType[label] ?? 0) + 1;
  }

  const medications = filtered
    .filter((e) => e.event_type === 'medication')
    .map((e) => {
      const meta = safeParseMeta<Record<string, string>>(e.metadata_json);
      return meta?.medication_name ?? e.title;
    })
    .filter((v, i, a) => a.indexOf(v) === i);

  const appointments = filtered
    .filter((e) => e.event_type === 'appointment')
    .map((e) => {
      const meta = safeParseMeta<Record<string, string>>(e.metadata_json);
      return {
        title: e.title,
        date: format(parseISO(e.occurred_at), 'dd MMMM', { locale: fr }),
        practitioner: meta?.practitioner,
      };
    });

  const periodStr = `du ${format(start, 'dd MMMM', { locale: fr })} au ${format(end, 'dd MMMM yyyy', { locale: fr })}`;

  let text = `Résumé pour ${profile.display_name} — ${periodStr}\n\n`;

  if (filtered.length === 0) {
    text += 'Aucun événement enregistré sur cette période.';
  } else {
    text += `${filtered.length} événement${filtered.length > 1 ? 's' : ''} enregistré${filtered.length > 1 ? 's' : ''}.\n\n`;

    if (temperatures.length > 0) {
      const min = Math.min(...temperatures);
      const max = Math.max(...temperatures);
      text += `🌡️ Températures : ${temperatures.length} mesure${temperatures.length > 1 ? 's' : ''} — min ${min.toFixed(1)}°C, max ${max.toFixed(1)}°C.\n`;
    }

    const typeEntries = Object.entries(eventsByType);
    if (typeEntries.length > 0) {
      text += '\nRépartition :\n';
      for (const [label, count] of typeEntries) {
        text += `• ${label} : ${count}\n`;
      }
    }

    if (medications.length > 0) {
      text += `\nMédicaments notés : ${medications.join(', ')}.\n`;
    }

    if (appointments.length > 0) {
      text += '\nRendez-vous :\n';
      for (const appt of appointments) {
        text += `• ${appt.title} (${appt.date})${appt.practitioner ? ` — ${appt.practitioner}` : ''}\n`;
      }
    }

    text += '\n⚠️ Ce résumé est un outil d\'organisation personnelle. Il ne remplace pas un professionnel de santé.';
  }

  return {
    profile,
    period: { start, end },
    eventCount: filtered.length,
    temperatureMin: temperatures.length > 0 ? Math.min(...temperatures) : null,
    temperatureMax: temperatures.length > 0 ? Math.max(...temperatures) : null,
    temperatureReadings: temperatures.length,
    eventsByType,
    medications,
    appointments,
    text,
  };
}
