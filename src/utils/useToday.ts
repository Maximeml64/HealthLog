// src/utils/useToday.ts

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { format } from 'date-fns';

/**
 * Returns a `today` Date that stays in sync with the actual calendar day.
 * Refreshes on app foreground and every 60s if the day rollover happened.
 *
 * Use this instead of `useMemo(() => new Date(), [])` (which freezes the date
 * at mount) whenever downstream calculations depend on "today" — cycle phases,
 * pregnancy week, days-until-next-period, etc.
 */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => {
      const now = new Date();
      setToday((prev) =>
        format(prev, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd') ? prev : now,
      );
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const id = setInterval(refresh, 60_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, []);

  return today;
}
