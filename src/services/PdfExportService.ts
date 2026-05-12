// src/services/PdfExportService.ts

import * as Print from 'expo-print';
import { format, parseISO, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Profile, HealthEvent, EVENT_TYPE_LABELS, INTENSITY_LABELS, TEMPERATURE_METHOD_LABELS } from '../types';
import { generateEpisodeSummary } from './SummaryService';
import { safeParseMeta } from '../utils/safeParse';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEventHtml(event: HealthEvent): string {
  const dateStr = format(parseISO(event.occurred_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  const typeLabel = EVENT_TYPE_LABELS[event.event_type] ?? event.event_type;

  let valueHtml = '';
  if (event.numeric_value !== null) {
    const unit = event.unit ? ` ${escapeHtml(event.unit)}` : '';
    valueHtml = `<div class="event-meta">Valeur : ${event.numeric_value}${unit}</div>`;
  }

  let intensityHtml = '';
  if (event.intensity !== null) {
    const label = INTENSITY_LABELS[event.intensity] ?? '';
    intensityHtml = `<div class="event-meta">Intensité : ${event.intensity}/5${label ? ` — ${escapeHtml(label)}` : ''}</div>`;
  }

  let metaHtml = '';
  const meta = safeParseMeta<Record<string, string>>(event.metadata_json);
  if (meta) {
    const parts: string[] = [];
    if (meta.medication_name) parts.push(`Médicament : ${escapeHtml(meta.medication_name)}`);
    if (meta.dosage_text) parts.push(`Dosage : ${escapeHtml(meta.dosage_text)}`);
    if (meta.practitioner) parts.push(`Praticien : ${escapeHtml(meta.practitioner)}`);
    if (meta.location) parts.push(`Lieu : ${escapeHtml(meta.location)}`);
    if (meta.method) parts.push(`Méthode : ${escapeHtml(TEMPERATURE_METHOD_LABELS[meta.method] ?? meta.method)}`);
    if (meta.category) parts.push(`Catégorie : ${escapeHtml(meta.category)}`);
    if (parts.length > 0) {
      metaHtml = `<div class="event-meta">${parts.join(' · ')}</div>`;
    }
  }

  const noteHtml = event.note ? `<div class="event-note">${escapeHtml(event.note)}</div>` : '';

  return `
    <div class="event">
      <div class="event-date">${dateStr}</div>
      <div class="event-header">${escapeHtml(typeLabel)} — ${escapeHtml(event.title)}</div>
      ${valueHtml}${intensityHtml}${metaHtml}${noteHtml}
    </div>`;
}

export async function generateMedicalPdf(params: {
  profile: Profile;
  events: HealthEvent[];
  periodStart: Date;
  periodEnd: Date;
}): Promise<string> {
  const { profile, events, periodStart, periodEnd } = params;

  const filtered = events
    .filter((e) => {
      const d = parseISO(e.occurred_at);
      return e.profile_id === profile.id && d >= periodStart && d <= periodEnd;
    })
    .sort((a, b) => parseISO(b.occurred_at).getTime() - parseISO(a.occurred_at).getTime());

  const summary = generateEpisodeSummary(profile, events, periodStart, periodEnd);

  const temps = filtered
    .filter((e) => e.event_type === 'temperature' && e.numeric_value !== null)
    .map((e) => e.numeric_value as number);

  const tempMin = temps.length > 0 ? Math.min(...temps) : null;
  const tempMax = temps.length > 0 ? Math.max(...temps) : null;
  const tempAvg = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;

  const birthDate = profile.birth_date
    ? format(parseISO(profile.birth_date), 'dd/MM/yyyy')
    : null;
  const age = profile.birth_date
    ? differenceInYears(new Date(), parseISO(profile.birth_date))
    : null;

  const periodStartStr = format(periodStart, 'dd/MM/yyyy', { locale: fr });
  const periodEndStr = format(periodEnd, 'dd/MM/yyyy', { locale: fr });
  const editionDate = format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr });

  const statsRows = Object.entries(summary.eventsByType)
    .map(([type, count]) => `<tr><td>${escapeHtml(type)}</td><td>${count}</td></tr>`)
    .join('');

  const tempStatsHtml =
    temps.length > 0
      ? `<p><strong>Températures (${temps.length} mesure${temps.length > 1 ? 's' : ''}) :</strong> ` +
        `min ${tempMin!.toFixed(1)}°C, max ${tempMax!.toFixed(1)}°C, moy. ${tempAvg!.toFixed(1)}°C</p>`
      : '';

  const medsHtml =
    summary.medications.length > 0
      ? `<p><strong>Médicaments notés :</strong> ${summary.medications.map(escapeHtml).join(', ')}</p>`
      : '';

  const birthLine = birthDate
    ? `Né(e) le ${birthDate}${age !== null ? ` (${age} ans)` : ''} · `
    : '';

  const summaryTextHtml = escapeHtml(summary.text).replace(/\n/g, '<br>');

  const eventsHtml =
    filtered.length === 0
      ? '<p><em>Aucun événement sur cette période.</em></p>'
      : filtered.map(buildEventHtml).join('');

  const html = `<html>
  <head><meta charset="utf-8"><style>
    body { font-family: -apple-system, system-ui, sans-serif; padding: 40px; color: #000; font-size: 12px; line-height: 1.5; }
    h1 { font-size: 18px; margin: 0 0 4px 0; }
    h2 { font-size: 14px; margin: 24px 0 8px 0; border-bottom: 1px solid #999; padding-bottom: 4px; }
    .meta { color: #666; font-size: 10px; margin-bottom: 24px; }
    .disclaimer { background: #f5f5f5; padding: 8px; font-size: 9px; color: #666; margin-bottom: 24px; }
    .event { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dotted #ccc; }
    .event-header { font-weight: bold; }
    .event-date { color: #666; font-size: 10px; }
    .event-meta { margin-top: 4px; font-size: 11px; }
    .event-note { margin-top: 4px; font-style: italic; color: #444; font-size: 11px; }
    table { border-collapse: collapse; width: 100%; }
    td, th { padding: 4px 8px; border-bottom: 1px solid #eee; text-align: left; }
    th { border-bottom: 1px solid #ccc; font-weight: bold; }
  </style></head>
  <body>
    <h1>${escapeHtml(profile.display_name)}</h1>
    <div class="meta">${birthLine}Période : ${periodStartStr} – ${periodEndStr} · Édité le ${editionDate}</div>
    <div class="disclaimer">Document généré par Healthlog — Outil d'organisation personnelle, ne remplace pas un avis médical</div>

    <h2>Résumé</h2>
    <p>${summaryTextHtml}</p>

    <h2>Statistiques</h2>
    <p><strong>Total :</strong> ${filtered.length} événement${filtered.length > 1 ? 's' : ''}</p>
    ${tempStatsHtml}${medsHtml}
    <table>
      <tr><th>Type</th><th>Nombre</th></tr>
      ${statsRows}
    </table>

    <h2>Événements (${filtered.length})</h2>
    ${eventsHtml}
  </body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}
