// src/components/FAB.tsx

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Colors, Shadow } from '../utils/theme';
import { haptic } from '../utils/haptics';

interface FABProps {
  onPress: () => void;
  /** Defaults to a French label for the generic add-event flow. */
  accessibilityLabel?: string;
  /** Optional extra context for screen readers. */
  accessibilityHint?: string;
}

export const FAB: React.FC<FABProps> = ({
  onPress,
  accessibilityLabel = 'Ajouter un événement de santé',
  accessibilityHint = "Ouvre le formulaire de création d'un nouvel événement",
}) => {
  const handlePress = () => {
    haptic.tap();
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Plus size={26} color={Colors.white} strokeWidth={2.4} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.primary,
  },
});
