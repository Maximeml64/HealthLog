// src/components/CharCounter.tsx
//
// Inline char counter for SecureStore-backed notes. The hard limit is
// enforced at write time by SecureNotesService (truncation), but
// silently losing characters is bad UX for medical notes, so we surface
// the remaining budget under the input.

import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '../utils/theme';
import { LIMITS } from '../constants/limits';

interface CharCounterProps {
  value: string;
  max?: number;
}

export const CharCounter: React.FC<CharCounterProps> = ({
  value,
  max = LIMITS.MAX_NOTE_CHARS,
}) => {
  const used = value.length;
  const remaining = max - used;
  const isAtLimit = remaining <= 0;
  const isNear = remaining <= 50 && !isAtLimit;

  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.text,
          isAtLimit && styles.atLimit,
          isNear && styles.near,
        ]}
        accessibilityLabel={
          isAtLimit
            ? `Limite de ${max} caractères atteinte. Les caractères supplémentaires seront tronqués.`
            : `${used} caractères sur ${max}.`
        }
      >
        {used} / {max}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-end',
    marginTop: Spacing.xs,
  },
  text: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  near: {
    color: Colors.warning,
  },
  atLimit: {
    color: Colors.danger,
    fontWeight: '700',
  },
});
