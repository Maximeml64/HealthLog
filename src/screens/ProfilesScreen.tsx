// src/screens/ProfilesScreen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAppStore } from '../stores/useAppStore';
import { Profile, RelationType, BloodType, PROFILE_COLORS, BLOOD_TYPES, RELATION_TYPE_LABELS } from '../types';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { Card, Avatar, Button, EmptyState, Badge } from '../components/UI';
import { generateId, formatAge } from '../utils/helpers';
import { DateTimeField } from '../components/DateTimeField';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const BLOOD_TYPE_COLOR = '#C0392B';

export default function ProfilesScreen() {
  const { profiles, events, upsertProfile, archiveProfile, deleteProfile } = useAppStore();
  const navigation = useNavigation<Nav>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ display_name: '', color: PROFILE_COLORS[0], birth_date: '', relation_type: 'child' as RelationType, blood_type: '' as BloodType | '', notes: '' });

  const activeProfiles = profiles.filter((p) => !p.archived);
  const archivedProfiles = profiles.filter((p) => p.archived);

  const openCreate = () => {
    setEditProfile(null);
    setForm({ display_name: '', color: PROFILE_COLORS[0], birth_date: '', relation_type: 'child', blood_type: '', notes: '' });
    setModalVisible(true);
  };

  const openEdit = (p: Profile) => {
    setEditProfile(p);
    setForm({ display_name: p.display_name, color: p.color, birth_date: p.birth_date ?? '', relation_type: p.relation_type, blood_type: p.blood_type ?? '', notes: p.notes });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) { Alert.alert('Nom requis'); return; }
    const now = new Date().toISOString();
    const blood_type = (form.blood_type as BloodType) || null;
    const birth_date = form.birth_date || null;
    const profile: Profile = editProfile
      ? { ...editProfile, ...form, birth_date, blood_type, updated_at: now }
      : { id: generateId(), ...form, birth_date, blood_type, avatar_uri: null, archived: false, created_at: now, updated_at: now };
    await upsertProfile(profile);
    setModalVisible(false);
  };

  const handleDelete = (p: Profile) => {
    const count = events.filter((e) => e.profile_id === p.id).length;
    Alert.alert('Supprimer ce profil ?',
      count > 0 ? `${count} événement(s) seront également supprimés.` : 'Action irréversible.',
      [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => deleteProfile(p.id) }]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profils</Text>
        <Button label="+ Ajouter" onPress={openCreate} size="sm" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeProfiles.length === 0 ? (
          <EmptyState emoji="👨‍👩‍👧‍👦" title="Aucun profil" subtitle="Créez un profil pour chaque membre" action={{ label: '+ Créer un profil', onPress: openCreate }} />
        ) : (
          activeProfiles.map((p) => {
            const profileEvents = events.filter((e) => e.profile_id === p.id);
            return (
              <Card key={p.id} onPress={() => navigation.navigate('ProfileDetail', { profileId: p.id })} style={styles.profileCard}>
                <View style={styles.profileCardInner}>
                  <Avatar name={p.display_name} color={p.color} size={52} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>{p.display_name}</Text>
                    <Text style={styles.profileRelation}>{RELATION_TYPE_LABELS[p.relation_type]}</Text>
                    {p.birth_date && <Text style={styles.profileAge}>{formatAge(p.birth_date)}</Text>}
                    {p.blood_type && (
                      <View style={{ marginTop: 4 }}>
                        <Badge label={p.blood_type} color={BLOOD_TYPE_COLOR} />
                      </View>
                    )}
                  </View>
                  <View style={styles.profileStats}>
                    <Text style={[styles.statNumber, { color: p.color }]}>{profileEvents.length}</Text>
                    <Text style={styles.statLabel}>entrées</Text>
                  </View>
                </View>
                <View style={styles.profileActions}>
                  <TouchableOpacity onPress={() => openEdit(p)} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>✏️ Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => archiveProfile(p.id)} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>📦 Archiver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(p)} style={[styles.actionBtn, styles.actionBtnDanger]}>
                    <Text style={[styles.actionBtnText, { color: Colors.danger }]}>🗑️ Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}

        {archivedProfiles.length > 0 && (
          <View style={{ marginTop: Spacing.xl }}>
            <Text style={styles.archivedTitle}>Archivés ({archivedProfiles.length})</Text>
            {archivedProfiles.map((p) => (
              <Card key={p.id} style={[styles.profileCard, { opacity: 0.6, padding: Spacing.md }]}>
                <View style={styles.profileCardInner}>
                  <Avatar name={p.display_name} color={Colors.textMuted} size={40} />
                  <Text style={[styles.profileName, { color: Colors.textMuted }]}>{p.display_name}</Text>
                  <TouchableOpacity onPress={() => upsertProfile({ ...p, archived: false, updated_at: new Date().toISOString() })}>
                    <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: '600' }}>Restaurer</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.modalCancel}>Annuler</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{editProfile ? 'Modifier' : 'Nouveau profil'}</Text>
            <TouchableOpacity onPress={handleSave}><Text style={styles.modalSave}>Enregistrer</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>NOM</Text>
              <TextInput style={styles.input} value={form.display_name} onChangeText={(v) => setForm({ ...form, display_name: v })} placeholder="Prénom ou surnom" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>LIEN FAMILIAL</Text>
              <View style={styles.chipRow}>
                {(Object.keys(RELATION_TYPE_LABELS) as RelationType[]).map((r) => (
                  <TouchableOpacity key={r} onPress={() => setForm({ ...form, relation_type: r })} style={[styles.chip, form.relation_type === r && styles.chipSelected]}>
                    <Text style={[styles.chipText, form.relation_type === r && styles.chipTextSelected]}>{RELATION_TYPE_LABELS[r]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>COULEUR</Text>
              <View style={styles.colorRow}>
                {PROFILE_COLORS.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setForm({ ...form, color: c })} style={[styles.colorDot, { backgroundColor: c }, form.color === c && { borderWidth: 3, borderColor: Colors.text }]} />
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>GROUPE SANGUIN (optionnel)</Text>
              <View style={styles.chipRow}>
                {BLOOD_TYPES.map((bt) => (
                  <TouchableOpacity
                    key={bt}
                    onPress={() => setForm({ ...form, blood_type: form.blood_type === bt ? '' : bt })}
                    style={[styles.chip, form.blood_type === bt && { borderColor: BLOOD_TYPE_COLOR, backgroundColor: BLOOD_TYPE_COLOR + '20' }]}
                  >
                    <Text style={[styles.chipText, form.blood_type === bt && { color: BLOOD_TYPE_COLOR, fontWeight: '700' }]}>{bt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <DateTimeField
              label="DATE DE NAISSANCE (optionnel)"
              mode="date"
              value={form.birth_date || null}
              onChange={(v) => setForm({ ...form, birth_date: v })}
              placeholder="Non renseignée"
            />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>NOTES</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} placeholder="Informations utiles…" placeholderTextColor={Colors.textMuted} multiline />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { ...Typography.h1 },
  content: { padding: Spacing.lg },
  profileCard: { marginBottom: Spacing.md, padding: Spacing.lg },
  profileCardInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  profileName: { ...Typography.h3 },
  profileRelation: { ...Typography.bodySmall, marginTop: 1 },
  profileAge: { fontSize: 12, color: Colors.textMuted },
  profileStats: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, color: Colors.textMuted },
  profileActions: { flexDirection: 'row', marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, gap: Spacing.sm },
  actionBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt },
  actionBtnDanger: { backgroundColor: Colors.primaryLight },
  actionBtnText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  archivedTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: Spacing.sm, textTransform: 'uppercase' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel: { fontSize: 15, color: Colors.textSecondary },
  modalTitle: { ...Typography.h3 },
  modalSave: { fontSize: 15, color: Colors.primary, fontWeight: '700' },
  field: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: 15, color: Colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primary, fontWeight: '600' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
});
