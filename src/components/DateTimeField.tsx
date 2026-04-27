// src/components/DateTimeField.tsx
// Pure TextInput implementation — no native DateTimePicker dependency.

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../utils/theme';

interface DateTimeFieldProps {
  label: string;
  value: string | null; // ISO YYYY-MM-DD (date), HH:MM (time), or full ISO (datetime)
  onChange: (value: string) => void;
  mode: 'date' | 'time' | 'datetime';
  placeholder?: string;
}

// ─── Mask helpers ─────────────────────────────────────────────────────────────

function applyDateMask(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function applyTimeMask(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

// ─── Value ↔ display converters ───────────────────────────────────────────────

function isoToDateDisplay(value: string | null, mode: 'date' | 'time' | 'datetime'): string {
  if (!value) return '';
  try {
    if (mode === 'date') {
      // YYYY-MM-DD → DD/MM/YYYY
      const [y, m, d] = value.split('-');
      if (!y || !m || !d) return '';
      return `${d}/${m}/${y}`;
    }
    if (mode === 'datetime') {
      const date = new Date(value);
      if (isNaN(date.getTime())) return '';
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}/${date.getFullYear()}`;
    }
  } catch { /* empty */ }
  return '';
}

function isoToTimeDisplay(value: string | null, mode: 'date' | 'time' | 'datetime'): string {
  if (!value) return '';
  if (mode === 'time') return value; // already HH:MM
  if (mode === 'datetime') {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return '';
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch { /* empty */ }
  }
  return '';
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface DateParseResult {
  valid: boolean;
  isoDate: string; // YYYY-MM-DD, empty if invalid or empty input
  error?: string;
}

function validateDateDisplay(display: string): DateParseResult {
  if (display.length === 0) return { valid: true, isoDate: '' };
  if (display.length !== 10) return { valid: false, isoDate: '', error: 'Format : JJ/MM/AAAA' };

  const [dStr, mStr, yStr] = display.split('/');
  const d = parseInt(dStr, 10);
  const m = parseInt(mStr, 10);
  const y = parseInt(yStr, 10);

  if (isNaN(d) || isNaN(m) || isNaN(y)) return { valid: false, isoDate: '', error: 'Date invalide' };
  if (d < 1 || d > 31) return { valid: false, isoDate: '', error: 'Jour invalide (1–31)' };
  if (m < 1 || m > 12) return { valid: false, isoDate: '', error: 'Mois invalide (1–12)' };
  if (y < 1900 || y > 2100) return { valid: false, isoDate: '', error: 'Année invalide' };

  // Catches invalid combos like 31/02
  const date = new Date(y, m - 1, d);
  if (date.getDate() !== d || date.getMonth() !== m - 1) {
    return { valid: false, isoDate: '', error: 'Date invalide' };
  }

  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return { valid: true, isoDate: `${y}-${mm}-${dd}` };
}

function validateTimeDisplay(display: string): { valid: boolean; error?: string } {
  if (display.length === 0) return { valid: true };
  if (display.length !== 5) return { valid: false, error: 'Format : HH:MM' };

  const [hStr, minStr] = display.split(':');
  const h = parseInt(hStr, 10);
  const min = parseInt(minStr, 10);

  if (isNaN(h) || isNaN(min)) return { valid: false, error: 'Heure invalide' };
  if (h < 0 || h > 23) return { valid: false, error: 'Heures : 00–23' };
  if (min < 0 || min > 59) return { valid: false, error: 'Minutes : 00–59' };
  return { valid: true };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DateTimeField: React.FC<DateTimeFieldProps> = ({
  label,
  value,
  onChange,
  mode,
  placeholder,
}) => {
  const [dateDisplay, setDateDisplay] = useState(() => isoToDateDisplay(value, mode));
  const [timeDisplay, setTimeDisplay] = useState(() => isoToTimeDisplay(value, mode));
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  // Sync display when parent resets the value (e.g. form clear / edit switch)
  useEffect(() => {
    setDateDisplay(isoToDateDisplay(value, mode));
    setTimeDisplay(isoToTimeDisplay(value, mode));
    setDateError(null);
    setTimeError(null);
  }, [value, mode]);

  const commitDate = (display: string) => {
    const result = validateDateDisplay(display);
    setDateError(result.valid ? null : (result.error ?? null));
    if (result.valid && result.isoDate) onChange(result.isoDate);
  };

  const commitTime = (display: string) => {
    const result = validateTimeDisplay(display);
    setTimeError(result.valid ? null : (result.error ?? null));
    if (result.valid && display.length === 5) onChange(display);
  };

  const commitDatetime = (date: string, time: string) => {
    const dateResult = validateDateDisplay(date);
    const timeResult = validateTimeDisplay(time);
    setDateError(dateResult.valid ? null : (dateResult.error ?? null));
    setTimeError(timeResult.valid ? null : (timeResult.error ?? null));
    if (dateResult.valid && timeResult.valid && dateResult.isoDate && time.length === 5) {
      onChange(`${dateResult.isoDate}T${time}:00`);
    }
  };

  if (mode === 'date') {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, dateError ? styles.inputError : null]}
          value={dateDisplay}
          onChangeText={(text) => {
            setDateDisplay(applyDateMask(text));
            setDateError(null);
          }}
          onBlur={() => commitDate(dateDisplay)}
          placeholder={placeholder ?? 'JJ/MM/AAAA'}
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          maxLength={10}
        />
        {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}
      </View>
    );
  }

  if (mode === 'time') {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, timeError ? styles.inputError : null]}
          value={timeDisplay}
          onChangeText={(text) => {
            setTimeDisplay(applyTimeMask(text));
            setTimeError(null);
          }}
          onBlur={() => commitTime(timeDisplay)}
          placeholder={placeholder ?? 'HH:MM'}
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          maxLength={5}
        />
        {timeError ? <Text style={styles.errorText}>{timeError}</Text> : null}
      </View>
    );
  }

  // mode === 'datetime'
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.datetimeRow}>
        <TextInput
          style={[styles.input, styles.dateInput, dateError ? styles.inputError : null]}
          value={dateDisplay}
          onChangeText={(text) => {
            setDateDisplay(applyDateMask(text));
            setDateError(null);
          }}
          onBlur={() => commitDatetime(dateDisplay, timeDisplay)}
          placeholder="JJ/MM/AAAA"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          maxLength={10}
        />
        <TextInput
          style={[styles.input, styles.timeInput, timeError ? styles.inputError : null]}
          value={timeDisplay}
          onChangeText={(text) => {
            setTimeDisplay(applyTimeMask(text));
            setTimeError(null);
          }}
          onBlur={() => commitDatetime(dateDisplay, timeDisplay)}
          placeholder="HH:MM"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          maxLength={5}
        />
      </View>
      {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}
      {timeError ? <Text style={styles.errorText}>{timeError}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    minHeight: 48,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    fontSize: 11,
    color: Colors.danger,
    marginTop: 4,
  },
  datetimeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dateInput: {
    flex: 2,
  },
  timeInput: {
    flex: 1,
  },
});
