// src/screens/EventDetailScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppStore } from '../stores/useAppStore';
import {
  EVENT_TYPE_ICONS,
  EVENT_TYPE_LABELS,
  INTENSITY_LABELS,
  TEMPERATURE_METHOD_LABELS,
} from '../types';
import { Colors, Typography, Spacing } from '../utils/theme';
import { Card, Avatar, Badge, Button } from '../components/UI';
import { EditEventModal } from '../components/EditEventModal';
import { formatDate } from '../utils/helpers';
import { safeParseMeta } from '../utils/safeParse';

export default function EventDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { eventId } = route.params;
  const { events, profiles, deleteEvent, upsertEvent } = useAppStore();

  const event = events.find((e) => e.id === eventId);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  if (!event) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Événement introuvable</Text>
          <Button label="Retour" onPress={() => navigation.goBack()} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  const profile = profiles.find((p) => p.id === event.profile_id);
  const icon = EVENT_TYPE_ICONS[event.event_type] ?? '📝';
  const label = EVENT_TYPE_LABELS[event.event_type] ?? event.event_type;

  const parsedMeta = safeParseMeta(event.metadata_json);

  const handleDelete = () => {
    // Health data is often irreplaceable — gate destructive actions with a
    // second confirmation, like the "Effacer toutes les données" flow.
    Alert.alert('Supprimer cet événement ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Confirmer la suppression',
            'L\'événement et ses photos seront définitivement supprimés.',
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Supprimer définitivement',
                style: 'destructive',
                onPress: async () => {
                  await deleteEvent(eventId);
                  navigation.goBack();
                },
              },
            ],
          );
        },
      },
    ]);
  };

  const MetaRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          {profile && (
            <TouchableOpacity
              onPress={() => setEditModalVisible(true)}
              style={styles.editBtn}
              accessibilityRole="button"
              accessibilityLabel="Modifier l'événement"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.editBtnText}>✏️</Text>
            </TouchableOpacity>
          )}
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
          <Badge label={label} color={Colors.primary} />
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.date}>{formatDate(event.occurred_at)}</Text>
        </View>

        <View style={styles.content}>
          {/* Profile */}
          {profile && (
            <Card style={styles.profileCard} onPress={() => navigation.navigate('ProfileDetail', { profileId: profile.id })}>
              <View style={styles.profileRow}>
                <Avatar name={profile.display_name} color={profile.color} size={36} />
                <View>
                  <Text style={styles.profileName}>{profile.display_name}</Text>
                  <Text style={styles.profileSub}>Voir le profil →</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Value */}
          {event.numeric_value !== null && (
            <Card style={styles.valueCard}>
              {event.event_type === 'temperature' ? (
                <View style={styles.tempDisplay}>
                  <Text style={styles.tempValue}>
                    {event.numeric_value.toFixed(1).replace('.', ',')}°C
                  </Text>
                  {parsedMeta?.method && <Text style={styles.tempMethod}>{TEMPERATURE_METHOD_LABELS[parsedMeta.method] ?? parsedMeta.method}</Text>}
                </View>
              ) : (
                <Text style={styles.numericValue}>
                  {String(event.numeric_value).replace('.', ',')} {event.unit ?? ''}
                </Text>
              )}
            </Card>
          )}

          {/* Intensity */}
          {event.intensity !== null && (
            <Card style={styles.metaCard}>
              <MetaRow label="Intensité" value={`${event.intensity}/5 — ${INTENSITY_LABELS[event.intensity]}`} />
            </Card>
          )}

          {/* Metadata */}
          {parsedMeta && Object.keys(parsedMeta).length > 0 && (
            <Card style={styles.metaCard}>
              {event.event_type === 'medication' && (
                <>
                  {parsedMeta.medication_name && <MetaRow label="Médicament" value={parsedMeta.medication_name} />}
                  {parsedMeta.dosage_text && <MetaRow label="Dosage" value={parsedMeta.dosage_text} />}
                  {parsedMeta.next_reminder_at && <MetaRow label="Prochain rappel" value={parsedMeta.next_reminder_at} />}
                </>
              )}
              {event.event_type === 'appointment' && (
                <>
                  {parsedMeta.practitioner && <MetaRow label="Praticien" value={parsedMeta.practitioner} />}
                  {parsedMeta.location && <MetaRow label="Lieu" value={parsedMeta.location} />}
                </>
              )}
            </Card>
          )}

          {/* Note */}
          <Card style={styles.noteCard}>
            <Text style={styles.noteTitle}>Note</Text>
            {event.note ? (
              <Text style={styles.noteText}>{event.note}</Text>
            ) : (
              <Text style={styles.notePlaceholder}>Aucune note</Text>
            )}
          </Card>

          {/* Photos */}
          {event.photos && event.photos.length > 0 && (
            <Card style={styles.photosCard}>
              <Text style={styles.noteTitle}>Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                <View style={styles.photosRow}>
                  {event.photos.map((uri) => (
                    <TouchableOpacity key={uri} onPress={() => setLightboxUri(uri)} style={styles.photoThumb}>
                      <Image source={{ uri }} style={styles.photoThumbImage} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </Card>
          )}

          {/* Delete */}
          <Button
            label="🗑️ Supprimer cet événement"
            onPress={handleDelete}
            variant="danger"
            fullWidth
            style={{ marginTop: Spacing.xl }}
          />
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {profile && (
        <EditEventModal
          visible={editModalVisible}
          event={event}
          profile={profile}
          onClose={() => setEditModalVisible(false)}
          onSave={async (updated) => { await upsertEvent(updated); }}
        />
      )}

      <Modal visible={lightboxUri !== null} transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
        <View style={styles.lightboxOverlay}>
          {lightboxUri && (
            <Image source={{ uri: lightboxUri }} style={styles.lightboxImage} resizeMode="contain" />
          )}
          <TouchableOpacity
            onPress={() => setLightboxUri(null)}
            style={styles.lightboxClose}
            accessibilityRole="button"
            accessibilityLabel="Fermer la photo"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  backBtn: { position: 'absolute', left: Spacing.lg, top: Spacing.xl, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: Colors.textSecondary },
  editBtn: { position: 'absolute', right: Spacing.lg, top: Spacing.xl, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontSize: 20 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 32 },
  title: { ...Typography.h1, textAlign: 'center' },
  date: { ...Typography.bodySmall, textAlign: 'center' },
  content: { padding: Spacing.lg },
  profileCard: { padding: Spacing.md, marginBottom: Spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  profileName: { ...Typography.h3 },
  profileSub: { ...Typography.bodySmall },
  valueCard: { padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md },
  tempDisplay: { alignItems: 'center', gap: 4 },
  tempValue: { fontSize: 48, fontWeight: '800' },
  tempMethod: { fontSize: 13, color: Colors.textSecondary },
  numericValue: { fontSize: 32, fontWeight: '700', color: Colors.text },
  metaCard: { padding: Spacing.md, marginBottom: Spacing.md },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  metaLabel: { ...Typography.bodySmall, color: Colors.textSecondary },
  metaValue: { ...Typography.body, fontWeight: '600' },
  noteCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  noteTitle: { ...Typography.h3, marginBottom: Spacing.sm },
  noteText: { ...Typography.body, lineHeight: 22 },
  notePlaceholder: { ...Typography.bodySmall, color: Colors.textMuted, fontStyle: 'italic' },
  photosCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  photosScroll: { flexGrow: 0 },
  photosRow: { flexDirection: 'row', gap: Spacing.sm },
  photoThumb: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  photoThumbImage: { width: 80, height: 80 },
  lightboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: '80%' },
  lightboxClose: { position: 'absolute', top: 56, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  lightboxCloseText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText: { ...Typography.h2 },
});
