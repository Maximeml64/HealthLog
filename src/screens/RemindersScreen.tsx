// src/screens/RemindersScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../stores/useAppStore';
import { Reminder, RecurrenceRule, RecurrenceFrequency } from '../types';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { Card, Button, Avatar, EmptyState } from '../components/UI';
import { generateId, formatDate } from '../utils/helpers';
import { DateTimeField } from '../components/DateTimeField';
import { requestPermissions } from '../services/NotificationService';

function recurrenceShortLabel(r: RecurrenceRule): string {
  const n = r.interval;
  switch (r.frequency) {
    case 'daily':   return n === 1 ? 'Tous les jours'    : `Tous les ${n} jours`;
    case 'weekly':  return n === 1 ? 'Toutes les semaines' : `Toutes les ${n} sem.`;
    case 'monthly': return n === 1 ? 'Tous les mois'     : `Tous les ${n} mois`;
    default:        return 'Récurrent';
  }
}

export default function RemindersScreen() {
  const { profiles, reminders, upsertReminder, deleteReminder } = useAppStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [editReminder, setEditReminder] = useState<Reminder | null>(null);

  const [form, setForm] = useState({
    profile_id: '',
    title: '',
    body: '',
    date: '',
    time: '',
  });

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState('1');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const activeProfiles = profiles.filter((p) => !p.archived);

  const resetRecurrenceForm = () => {
    setIsRecurring(false);
    setRecurrenceFrequency('daily');
    setRecurrenceInterval('1');
    setRecurrenceEndDate('');
  };

  const openCreate = async () => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        'Notifications désactivées',
        'Activez les notifications dans les réglages pour utiliser les rappels.'
      );
    }
    setEditReminder(null);
    setForm({
      profile_id: activeProfiles[0]?.id ?? '',
      title: '',
      body: '',
      date: getTodayStr(),
      time: '09:00',
    });
    resetRecurrenceForm();
    setModalVisible(true);
  };

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Titre requis');
      return;
    }
    if (!form.profile_id) {
      Alert.alert('Sélectionnez un membre');
      return;
    }
    if (!form.date || !form.time) {
      Alert.alert('Date et heure requises');
      return;
    }

    const scheduled = new Date(`${form.date}T${form.time}:00`);
    if (isNaN(scheduled.getTime())) {
      Alert.alert('Date ou heure invalide');
      return;
    }

    const recurrence: RecurrenceRule | null = isRecurring
      ? {
          frequency: recurrenceFrequency,
          interval: Math.max(1, parseInt(recurrenceInterval, 10) || 1),
          end_date: recurrenceEndDate || null,
        }
      : null;

    const now = new Date().toISOString();
    const reminder: Reminder = editReminder
      ? {
          ...editReminder,
          title: form.title.trim(),
          body: form.body.trim(),
          scheduled_at: scheduled.toISOString(),
          profile_id: form.profile_id,
          is_recurring: isRecurring,
          recurrence,
        }
      : {
          id: generateId(),
          profile_id: form.profile_id,
          event_id: null,
          title: form.title.trim(),
          body: form.body.trim(),
          scheduled_at: scheduled.toISOString(),
          notification_ids: [],
          is_recurring: isRecurring,
          recurrence_days: null,
          recurrence,
          active: true,
          created_at: now,
        };

    await upsertReminder(reminder);
    setModalVisible(false);
  };

  const handleDelete = (r: Reminder) => {
    Alert.alert('Supprimer ce rappel ?', '', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteReminder(r.id) },
    ]);
  };

  const toggleActive = async (r: Reminder) => {
    await upsertReminder({ ...r, active: !r.active });
  };

  // A recurring active reminder is always "upcoming" regardless of its initial
  // scheduled_at — what matters is that future occurrences keep firing.
  const now = new Date();
  const upcoming = reminders
    .filter((r) => (r.recurrence != null && r.active) || new Date(r.scheduled_at) > now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const past = reminders
    .filter((r) => r.recurrence == null && new Date(r.scheduled_at) <= now)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  const renderReminder = (r: Reminder) => {
    const profile = getProfile(r.profile_id);
    const isPast = new Date(r.scheduled_at) <= new Date();

    return (
      <Card key={r.id} style={[styles.reminderCard, isPast && styles.reminderCardPast]}>
        <View style={styles.reminderRow}>
          <Text style={[styles.reminderIcon, isPast && { opacity: 0.4 }]}>🔔</Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.reminderTitle, isPast && styles.textMuted]}>{r.title}</Text>
              {r.recurrence && (
                <View style={styles.recurrenceBadge}>
                  <Text style={styles.recurrenceBadgeText}>🔁 {recurrenceShortLabel(r.recurrence)}</Text>
                </View>
              )}
            </View>
            {r.body ? <Text style={styles.reminderBody}>{r.body}</Text> : null}
            {profile && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <Avatar name={profile.display_name} color={profile.color} size={16} />
                <Text style={[styles.profileName, { color: profile.color }]}>{profile.display_name}</Text>
              </View>
            )}
            <Text style={[styles.reminderTime, isPast && styles.textMuted]}>{formatDate(r.scheduled_at)}</Text>
          </View>
          <View style={styles.reminderControls}>
            {!isPast && (
              <Switch
                value={r.active}
                onValueChange={() => toggleActive(r)}
                trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                thumbColor={r.active ? Colors.primary : Colors.textMuted}
                accessibilityRole="switch"
                accessibilityLabel={`Rappel : ${r.title}`}
                accessibilityState={{ checked: r.active }}
              />
            )}
            <TouchableOpacity onPress={() => handleDelete(r)} style={styles.deleteBtn} accessibilityRole="button" accessibilityLabel={`Supprimer le rappel ${r.title}`}>
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Rappels</Text>
        <Button label="+ Créer" onPress={openCreate} size="sm" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {reminders.length === 0 ? (
          <EmptyState
            emoji="🔔"
            title="Aucun rappel"
            subtitle="Créez des rappels pour les médicaments, rendez-vous ou autres événements importants"
            action={{ label: '+ Créer un rappel', onPress: openCreate }}
          />
        ) : (
          <>
            {upcoming.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>À venir ({upcoming.length})</Text>
                {upcoming.map(renderReminder)}
              </View>
            )}
            {past.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Passés ({past.length})</Text>
                {past.map(renderReminder)}
              </View>
            )}
          </>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} accessibilityRole="button" accessibilityLabel="Annuler">
              <Text style={styles.modalCancel}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nouveau rappel</Text>
            <TouchableOpacity onPress={handleSave} accessibilityRole="button" accessibilityLabel="Enregistrer le rappel">
              <Text style={styles.modalSave}>Enregistrer</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            enableOnAndroid
            enableAutomaticScroll
            extraScrollHeight={Platform.OS === 'ios' ? 100 : 0}
          >
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>MEMBRE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {activeProfiles.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setForm({ ...form, profile_id: p.id })}
                    style={[styles.chip, form.profile_id === p.id && { borderColor: p.color, backgroundColor: p.color + '20' }]}
                  >
                    <Text style={[styles.chipText, form.profile_id === p.id && { color: p.color }]}>{p.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>TITRE</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(v) => setForm({ ...form, title: v })}
                placeholder="Médicament, RDV…"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>MESSAGE (optionnel)</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                value={form.body}
                onChangeText={(v) => setForm({ ...form, body: v })}
                placeholder="Détails du rappel…"
                placeholderTextColor={Colors.textMuted}
                multiline
                returnKeyType="done"
                scrollEnabled={false}
                textAlignVertical="top"
              />
            </View>

            <DateTimeField
              label="DATE"
              mode="date"
              value={form.date || null}
              onChange={(v) => setForm({ ...form, date: v })}
              placeholder="Sélectionner une date"
            />

            <DateTimeField
              label="HEURE"
              mode="time"
              value={form.time || null}
              onChange={(v) => setForm({ ...form, time: v })}
              placeholder="Sélectionner une heure"
            />

            {/* Récurrence */}
            <View style={[styles.field, styles.recurringToggleRow]}>
              <Text style={styles.fieldLabel}>RAPPEL RÉCURRENT</Text>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                thumbColor={isRecurring ? Colors.primary : Colors.textMuted}
              />
            </View>

            {isRecurring && (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>FRÉQUENCE</Text>
                  <View style={styles.chipRow}>
                    {(['daily', 'weekly', 'monthly'] as RecurrenceFrequency[]).map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        onPress={() => setRecurrenceFrequency(freq)}
                        style={[styles.chip, recurrenceFrequency === freq && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, recurrenceFrequency === freq && styles.chipTextActive]}>
                          {freq === 'daily' ? 'Quotidien' : freq === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    {recurrenceFrequency === 'daily'
                      ? `TOUS LES … JOUR(S)`
                      : recurrenceFrequency === 'weekly'
                      ? `TOUTES LES … SEMAINE(S)`
                      : `TOUS LES … MOIS`}
                  </Text>
                  <TextInput
                    style={[styles.input, { width: 80 }]}
                    value={recurrenceInterval}
                    onChangeText={(v) => setRecurrenceInterval(v.replace(/\D/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="1"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>

                <DateTimeField
                  label="JUSQU'AU (optionnel)"
                  mode="date"
                  value={recurrenceEndDate || null}
                  onChange={setRecurrenceEndDate}
                  placeholder="Pas de fin"
                />

                <Text style={styles.recurringNote}>
                  iOS limite à 60 occurrences planifiées à l'avance.
                </Text>
              </>
            )}
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { ...Typography.h1 },
  content: { padding: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: Spacing.sm, textTransform: 'uppercase' },
  reminderCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  reminderCardPast: { opacity: 0.55 },
  reminderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  reminderIcon: { fontSize: 22 },
  reminderTitle: { ...Typography.h3, fontSize: 14 },
  reminderBody: { ...Typography.bodySmall, marginTop: 2 },
  profileName: { fontSize: 11, fontWeight: '600' },
  reminderTime: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  reminderControls: { alignItems: 'center', gap: 6 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 16 },
  textMuted: { color: Colors.textMuted },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalCancel: { fontSize: 15, color: Colors.textSecondary },
  modalTitle: { ...Typography.h3 },
  modalSave: { fontSize: 15, color: Colors.primary, fontWeight: '700' },
  field: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: 15, color: Colors.text,
  },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  recurringToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recurringNote: { fontSize: 11, color: Colors.textMuted, marginTop: -Spacing.sm, marginBottom: Spacing.lg, fontStyle: 'italic' },
  recurrenceBadge: { backgroundColor: Colors.primary + '18', borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  recurrenceBadgeText: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
});
