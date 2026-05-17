// src/utils/useEventSearch.ts

import { useMemo } from 'react';
import type { HealthEvent } from '../types';
import { safeParseMeta } from './safeParse';

/**
 * Filters a list of HealthEvents against a free-text query. Matches against
 * the title, the note, AND every string value found inside `metadata_json`
 * (medication name, practitioner, location, dosage, method, …).
 *
 * Returns the events untouched when the query is empty so callers can fold
 * this into a pipeline of filters without an extra branch.
 */
export function useEventSearch(
  events: HealthEvent[],
  query: string,
): HealthEvent[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      if (e.title.toLowerCase().includes(q)) return true;
      if (e.note.toLowerCase().includes(q)) return true;
      const meta = safeParseMeta<Record<string, string>>(e.metadata_json);
      if (meta) {
        return Object.values(meta).some(
          (v) => typeof v === 'string' && v.toLowerCase().includes(q),
        );
      }
      return false;
    });
  }, [events, query]);
}
