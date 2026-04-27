// src/utils/helpers.ts

import { format, formatDistanceToNow, parseISO, isToday, isYesterday, differenceInYears, differenceInMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatDate(isoString: string): string {
  const date = parseISO(isoString);
  if (isToday(date)) return `Aujourd'hui ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Hier ${format(date, 'HH:mm')}`;
  return format(date, 'dd MMM yyyy · HH:mm', { locale: fr });
}

export function formatDateShort(isoString: string): string {
  const date = parseISO(isoString);
  if (isToday(date)) return `Aujourd'hui`;
  if (isYesterday(date)) return `Hier`;
  return format(date, 'dd MMM', { locale: fr });
}

export function formatDateHeader(isoString: string): string {
  const date = parseISO(isoString);
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'EEEE dd MMMM', { locale: fr });
}

export function formatRelativeTime(isoString: string): string {
  return formatDistanceToNow(parseISO(isoString), { addSuffix: true, locale: fr });
}

export function formatAge(birthDateIso: string): string {
  const birth = parseISO(birthDateIso);
  const now = new Date();
  const totalMonths = differenceInMonths(now, birth);
  if (totalMonths < 24) return `${totalMonths} mois`;
  return `${differenceInYears(now, birth)} ans`;
}

// ─── Date input helpers (format français JJ/MM/AAAA) ─────────────────────────
// @deprecated Remplacé par le composant DateTimeField (picker natif)

/** @deprecated Utiliser DateTimeField à la place. */
export function formatDateInputFR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** @deprecated Utiliser DateTimeField à la place. */
export function isoToDateInputFR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** @deprecated Utiliser DateTimeField à la place. */
export function parseDateInputFR(french: string): string {
  const [d, m, y] = french.split('/');
  if (!d || !m || !y || y.length !== 4) return '';
  return `${y}-${m}-${d}`;
}

// ─────────────────────────────────────────────────────────────────────────────

export function groupEventsByDay(events: { occurred_at: string }[]): Record<string, typeof events> {
  const groups: Record<string, typeof events> = {};
  for (const event of events) {
    const day = format(parseISO(event.occurred_at), 'yyyy-MM-dd');
    if (!groups[day]) groups[day] = [];
    groups[day].push(event);
  }
  return groups;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

