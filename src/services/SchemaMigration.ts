// src/services/SchemaMigration.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

const VERSION_KEY = '@healthlog/schema_version';
const CURRENT_VERSION = 1;

/**
 * One migration step that brings the persisted store from version (v-1) to v.
 * Migrations MUST be idempotent: a crash mid-migration must leave the store
 * in a state where re-running the step succeeds (or at least doesn't make
 * things worse).
 */
type Migration = () => Promise<void>;

/**
 * Registered migrations, keyed by target version.
 *
 * To add a migration:
 *   1. Bump CURRENT_VERSION
 *   2. Register the migration here keyed by the new version
 *   3. Keep the operation idempotent (check-then-write)
 *
 * Example future migration:
 *   2: async () => {
 *     // rename `intensity` from 1-5 to 0-100 on stored events
 *     const raw = await AsyncStorage.getItem('events');
 *     if (!raw) return;
 *     const events = JSON.parse(raw);
 *     for (const e of events) {
 *       if (e.intensity != null && e.intensity <= 5) {
 *         e.intensity = e.intensity * 20;
 *       }
 *     }
 *     await AsyncStorage.setItem('events', JSON.stringify(events));
 *   },
 */
const MIGRATIONS: Record<number, Migration> = {
  // No migrations yet — v1 is the initial schema.
};

/**
 * Runs any pending migrations once on app boot. Should be awaited before
 * the store loads data, so reads see the migrated shape.
 *
 * Safe to call on every cold start: migrations track their own progress
 * via the persisted version number.
 */
export async function runMigrations(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(VERSION_KEY);
    const current = raw ? parseInt(raw, 10) : 0;
    if (Number.isNaN(current) || current >= CURRENT_VERSION) {
      // Either fresh install or already up-to-date. Write the version
      // anyway on fresh install so the next boot is a no-op.
      if (!raw) await AsyncStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
      return;
    }

    for (let v = current + 1; v <= CURRENT_VERSION; v++) {
      const migration = MIGRATIONS[v];
      if (migration) {
        await migration();
      }
      await AsyncStorage.setItem(VERSION_KEY, String(v));
    }
  } catch (e) {
    // Migration failure shouldn't brick the app; the user keeps their
    // (un-migrated) data and we get a Sentry report to triage.
    Sentry.captureException(e, { tags: { context: 'schema_migration' } });
  }
}
