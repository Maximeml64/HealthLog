// src/components/EditEventModal.tsx

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HealthEvent, Profile } from '../types';
import { Colors, Typography, Spacing } from '../utils/theme';
import { EventForm } from './EventForm';

interface EditEventModalProps {
  visible: boolean;
  event: HealthEvent;
  profile: Profile;
  onClose: () => void;
  onSave: (event: HealthEvent) => Promise<void>;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  visible,
  event,
  profile,
  onClose,
  onSave,
}) => {
  const handleSave = async (updated: HealthEvent) => {
    await onSave(updated);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Modifier l'événement</Text>
            <View style={{ width: 40 }} />
          </View>
          <EventForm
            profile={profile}
            eventType={event.event_type}
            initialValues={event}
            onSave={handleSave}
            onCancel={onClose}
          />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: { fontSize: 20, color: Colors.textSecondary, width: 40 },
  headerTitle: { ...Typography.h3 },
});
