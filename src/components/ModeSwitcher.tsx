// src/components/ModeSwitcher.tsx

import React from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { MenstrualMode } from '../types';
import { Colors, Radius, Shadow, Spacing, Typography } from '../utils/theme';

// ─── Mode definitions ─────────────────────────────────────────────────────────

const MODES: { mode: MenstrualMode; icon: string; title: string; description: string }[] = [
  {
    mode: 'tracking',
    icon: '📅',
    title: 'Suivi standard',
    description: 'Cycles, prédictions, symptômes. Le mode par défaut.',
  },
  {
    mode: 'ttc',
    icon: '💗',
    title: 'Tentative de conception',
    description: "Suivi de l'ovulation, fenêtre fertile mise en avant, courbe de température basale.",
  },
  {
    mode: 'pregnancy',
    icon: '🤰',
    title: 'Grossesse en cours',
    description: 'Suivi semaine par semaine, trimestres, dates clés, rendez-vous médicaux.',
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ModeSwitcherProps {
  visible: boolean;
  currentMode: MenstrualMode;
  onClose: () => void;
  onSelectMode: (mode: MenstrualMode) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({
  visible, currentMode, onClose, onSelectMode,
}) => (
  <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Mode de suivi</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Fermer">
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cards}>
        {MODES.map(({ mode, icon, title, description }) => {
          const isActive = mode === currentMode;
          return (
            <TouchableOpacity
              key={mode}
              style={[styles.modeCard, isActive && styles.modeCardActive]}
              onPress={() => onSelectMode(mode)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={title}
              accessibilityState={{ selected: isActive }}
            >
              <Text style={styles.modeIcon}>{icon}</Text>
              <View style={styles.modeInfo}>
                <Text style={[styles.modeTitle, isActive && styles.modeTitleActive]}>{title}</Text>
                <Text style={styles.modeDescription}>{description}</Text>
              </View>
              {isActive && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Tu peux changer de mode à tout moment. Tes données précédentes sont conservées.
        </Text>
      </View>
    </SafeAreaView>
  </Modal>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { ...Typography.h2 },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, color: Colors.textSecondary },

  cards: { padding: Spacing.lg, gap: Spacing.md },
  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.border,
    ...Shadow.sm,
  },
  modeCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  modeIcon: { fontSize: 28 },
  modeInfo: { flex: 1, gap: 3 },
  modeTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  modeTitleActive: { color: Colors.primary },
  modeDescription: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  checkmark: { fontSize: 18, color: Colors.primary, fontWeight: '700' },

  disclaimer: {
    margin: Spacing.lg, padding: Spacing.md,
    backgroundColor: Colors.backgroundSecondary, borderRadius: Radius.md,
  },
  disclaimerText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
