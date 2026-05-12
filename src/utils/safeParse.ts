// src/utils/safeParse.ts

/**
 * Parse JSON metadata safely. Returns null on any error (missing field,
 * malformed JSON, etc.). Use this everywhere instead of inline try/catch
 * around JSON.parse for HealthEvent.metadata_json or similar payloads.
 */
export function safeParseMeta<T = Record<string, string>>(
  json: string | null | undefined,
): T | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object') return parsed as T;
    return null;
  } catch {
    return null;
  }
}
