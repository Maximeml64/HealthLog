// src/utils/helpers.ts

import { format, formatDistanceToNow, parseISO, isToday, isYesterday, differenceInYears, differenceInMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatDate(isoString: string): string {
  const date = parseISO(isoString);
  if (isToday(date)) return `Aujourd'hui ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Hier ${format(date, 'HH:mm')}`;
  return format(date, 'dd MMM yyyy · HH:mm', { locale: fr });
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

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
