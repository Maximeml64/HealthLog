// src/screens/HomeScreen.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAppStore } from '../stores/useAppStore';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { Card, Avatar, SectionHeader, EmptyState } from '../components/UI';
import { EventCard } from '../components/EventCard';
import { FAB } from '../components/FAB';
import { AddEventModal } from '../components/AddEventModal';
import { MenstrualCard } from '../components/MenstrualCard';
import { formatRelativeTime } from '../utils/helpers';
import { parseISO } from 'date-fns';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const { profiles, events, reminders, settings, loadAll, upsertEvent } = useAppStore();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<Nav>();

  const activeProfiles = profiles.filter((p) => !p.archived);

  // Profile à afficher dans la MenstrualCard : default_profile si tracking activé, sinon premier avec tracking
  const menstrualProfileId = useMemo(() => {
    const def = profiles.find((p) => p.id === settings.default_profile_id && !p.archived);
    if (def?.menstrualTrackingEnabled) return def.id;
    return activeProfiles.find((p) => p.menstrualTrackingEnabled)?.id ?? null;
  }, [profiles, settings.default_profile_id, activeProfiles]);

  const recentEvents = useMemo(() =>
    [...events]
      .sort((a, b) => parseISO(b.occurred_at).getTime() - parseISO(a.occurred_at).getTime())
      .slice(0, 5),
    [events]
  );

  const upcomingReminders = useMemo(() =>
    reminders
      .filter((r) => r.active && new Date(r.scheduled_at) > new Date())
      .sort((a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime())
      .slice(0, 3),
    [reminders]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Bonjour 👋</Text>
          <Text style={styles.subtitle}>Carnet de santé familial</Text>
        </View>

        <View style={styles.legalBanner}>
          <Text style={styles.legalText}>
            {"📋 Outil d'organisation personnelle — Ne remplace pas un professionnel de santé"}
          </Text>
        </View>

        {activeProfiles.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Membres" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profilesRow}>
              {activeProfiles.map((profile) => {
                const profileEvents = events.filter((e) => e.profile_id === profile.id);
                return (
                  <TouchableOpacity
                    key={profile.id}
                    onPress={() => navigation.navigate('ProfileDetail', { profileId: profile.id })}
                    style={[styles.profileCard, { borderColor: profile.color + '44' }]}
                  >
                    <Avatar name={profile.display_name} color={profile.color} size={44} />
                    <Text style={styles.profileName} numberOfLines={1}>{profile.display_name}</Text>
                    <Text style={styles.profileCount}>{profileEvents.length} entrées</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {menstrualProfileId && (
          <MenstrualCard
            profileId={menstrualProfileId}
            onPress={() => navigation.navigate('CycleScreen', { profileId: menstrualProfileId })}
          />
        )}

        <View style={styles.section}>
          <SectionHeader title="Récents" count={events.length} />
          {recentEvents.length === 0 ? (
            <EmptyState
              emoji="📝"
              title="Aucun événement"
              subtitle="Appuyez sur + pour ajouter votre premier enregistrement"
            />
          ) : (
            recentEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                profile={getProfile(event.profile_id)}
                showProfile={true}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
              />
            ))
          )}
        </View>

        {upcomingReminders.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Rappels à venir" />
            {upcomingReminders.map((r) => {
              const profile = getProfile(r.profile_id);
              return (
                <Card key={r.id} style={styles.reminderCard}>
                  <View style={styles.reminderRow}>
                    <Text style={styles.reminderIcon}>🔔</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reminderTitle}>{r.title}</Text>
                      {profile && (
                        <Text style={[styles.reminderSub, { color: profile.color }]}>{profile.display_name}</Text>
                      )}
                      <Text style={styles.reminderTime}>{formatRelativeTime(r.scheduled_at)}</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB onPress={() => setAddModalVisible(true)} />

      <AddEventModal
        visible={addModalVisible}
        profiles={profiles}
        onClose={() => setAddModalVisible(false)}
        onSave={upsertEvent}
        defaultProfileId={settings.default_profile_id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  header: { marginBottom: Spacing.md },
  greeting: { ...Typography.display },
  subtitle: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: 2 },
  legalBanner: {
    backgroundColor: Colors.accentLight, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  legalText: { fontSize: 11, color: '#FFFFFF', fontWeight: '500', lineHeight: 16 },
  section: { marginBottom: Spacing.xl },
  profilesRow: { gap: Spacing.sm, paddingRight: Spacing.lg },
  profileCard: {
    alignItems: 'center', padding: Spacing.md, borderRadius: Radius.lg,
    backgroundColor: Colors.surface, borderWidth: 1.5, width: 90, gap: 4,
  },
  profileName: { fontSize: 12, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  profileCount: { fontSize: 10, color: Colors.textMuted },
  reminderCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  reminderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  reminderIcon: { fontSize: 20 },
  reminderTitle: { ...Typography.h3, fontSize: 14 },
  reminderSub: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  reminderTime: { ...Typography.caption, marginTop: 2 },
});
