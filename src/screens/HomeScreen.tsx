// src/screens/HomeScreen.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Bell as BellIcon, ShieldCheck } from 'lucide-react-native';
import { useAppStore } from '../stores/useAppStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '../utils/theme';
import { Card, Avatar, SectionHeader, EmptyState } from '../components/UI';
import { EventCard } from '../components/EventCard';
import { FAB } from '../components/FAB';
import { AddEventModal } from '../components/AddEventModal';
import { MenstrualCard } from '../components/MenstrualCard';
import { formatRelativeTime } from '../utils/helpers';
import { format, parseISO, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  EVENT_TYPE_ICONS,
  EVENT_TYPE_LABELS,
  type EventType,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Event types exposed as one-tap shortcuts on the Home screen.
// Order matters — these are the five most likely "log right now" actions
// based on real-world family-journal usage.
const QUICK_ADD_TYPES: EventType[] = ['temperature', 'symptom', 'medication', 'mood', 'note'];

export default function HomeScreen() {
  // Individual selectors so unrelated mutations (e.g. a reminder being
  // toggled) don't force this screen to re-render.
  const profiles = useAppStore((s) => s.profiles);
  const events = useAppStore((s) => s.events);
  const reminders = useAppStore((s) => s.reminders);
  const settings = useAppStore((s) => s.settings);
  const loadAll = useAppStore((s) => s.loadAll);
  const upsertEvent = useAppStore((s) => s.upsertEvent);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [quickAddType, setQuickAddType] = useState<EventType | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<Nav>();

  const activeProfiles = useMemo(
    () => profiles.filter((p) => !p.archived),
    [profiles],
  );

  // Profile à afficher dans la MenstrualCard : default_profile si tracking activé, sinon premier avec tracking
  const menstrualProfileId = useMemo(() => {
    const def = profiles.find((p) => p.id === settings.default_profile_id && !p.archived);
    if (def?.menstrualTrackingEnabled) return def.id;
    return activeProfiles.find((p) => p.menstrualTrackingEnabled)?.id ?? null;
  }, [profiles, settings.default_profile_id, activeProfiles]);

  // ── Stats this week ────────────────────────────────────────────────────────
  const weekStats = useMemo(() => {
    const weekAgo = subDays(startOfDay(new Date()), 7);
    const weekEvents = events.filter((e) => parseISO(e.occurred_at) >= weekAgo);
    const temperatures = weekEvents
      .filter((e) => e.event_type === 'temperature' && e.numeric_value !== null)
      .map((e) => e.numeric_value as number);
    const medications = weekEvents.filter((e) => e.event_type === 'medication').length;
    const symptoms = weekEvents.filter((e) => e.event_type === 'symptom').length;
    const tempMin = temperatures.length > 0 ? Math.min(...temperatures) : null;
    const tempMax = temperatures.length > 0 ? Math.max(...temperatures) : null;
    return {
      total: weekEvents.length,
      tempCount: temperatures.length,
      tempMin,
      tempMax,
      medications,
      symptoms,
    };
  }, [events]);

  // Pre-sort once. Sorting all events to keep only 5 is fine here for
  // typical N (a few hundred); replace with a top-k heap if it ever grows.
  const recentEvents = useMemo(
    () =>
      [...events]
        .sort((a, b) => parseISO(b.occurred_at).getTime() - parseISO(a.occurred_at).getTime())
        .slice(0, 5),
    [events],
  );

  const upcomingReminders = useMemo(
    () =>
      reminders
        .filter((r) => r.active && new Date(r.scheduled_at) > new Date())
        .sort((a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime())
        .slice(0, 3),
    [reminders],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  const openQuickAdd = (type: EventType) => {
    setQuickAddType(type);
    setAddModalVisible(true);
  };

  const handleModalClose = () => {
    setAddModalVisible(false);
    setQuickAddType(null);
  };

  // Stat tiles — only render when there's something to show, so the
  // dashboard doesn't shout at empty-state users.
  const statTiles = useMemo(() => {
    const tiles: { icon: string; label: string; value: string }[] = [];
    if (weekStats.total > 0) {
      tiles.push({
        icon: '📊',
        label: 'Cette semaine',
        value: `${weekStats.total} évén.`,
      });
    }
    if (weekStats.tempCount > 0 && weekStats.tempMin !== null && weekStats.tempMax !== null) {
      const range = weekStats.tempMin === weekStats.tempMax
        ? `${weekStats.tempMin.toFixed(1).replace('.', ',')}°C`
        : `${weekStats.tempMin.toFixed(1).replace('.', ',')}–${weekStats.tempMax.toFixed(1).replace('.', ',')}°C`;
      tiles.push({ icon: '🌡️', label: 'Températures', value: range });
    }
    if (weekStats.medications > 0) {
      tiles.push({
        icon: '💊',
        label: 'Médicaments',
        value: `${weekStats.medications} prise${weekStats.medications > 1 ? 's' : ''}`,
      });
    }
    if (weekStats.symptoms > 0) {
      tiles.push({
        icon: '🤒',
        label: 'Symptômes',
        value: `${weekStats.symptoms} note${weekStats.symptoms > 1 ? 's' : ''}`,
      });
    }
    return tiles;
  }, [weekStats]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{format(new Date(), 'EEEE d MMMM', { locale: fr })}</Text>
          <Text style={styles.greeting}>Bonjour</Text>
          <Text style={styles.subtitle}>Carnet de santé familial</Text>
        </View>

        <View style={styles.legalBanner}>
          <ShieldCheck size={16} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.legalText}>
            Outil d'organisation personnelle — Ne remplace pas un professionnel de santé
          </Text>
        </View>

        {/* ── Stats dashboard (only when there's data this week) ───────────── */}
        {statTiles.length > 0 && (
          <View style={styles.statsRow}>
            {statTiles.map((tile) => (
              <View key={tile.label} style={styles.statTile}>
                <Text style={styles.statIcon}>{tile.icon}</Text>
                <Text style={styles.statValue}>{tile.value}</Text>
                <Text style={styles.statLabel}>{tile.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Quick add ────────────────────────────────────────────────────── */}
        {activeProfiles.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Ajouter rapidement" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
              {QUICK_ADD_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => openQuickAdd(type)}
                  style={styles.quickTile}
                  accessibilityRole="button"
                  accessibilityLabel={`Ajouter rapidement ${EVENT_TYPE_LABELS[type]}`}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text style={styles.quickIcon}>{EVENT_TYPE_ICONS[type]}</Text>
                  <Text style={styles.quickLabel} numberOfLines={1}>{EVENT_TYPE_LABELS[type]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

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
                    <View style={styles.reminderIconWrap}>
                      <BellIcon size={18} color={Colors.primary} strokeWidth={2} />
                    </View>
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
        onClose={handleModalClose}
        onSave={upsertEvent}
        defaultProfileId={settings.default_profile_id}
        defaultEventType={quickAddType}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  header: { marginBottom: Spacing.lg },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.4,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  greeting: { ...Typography.display },
  subtitle: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: 4 },
  legalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  legalText: {
    flex: 1,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
    lineHeight: 16,
  },

  // ── Stats dashboard ─────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statTile: {
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 2,
    ...Shadow.sm,
  },
  statIcon: { fontSize: 18, marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },

  // ── Quick add ────────────────────────────────────────────────────────────
  quickRow: { gap: Spacing.sm, paddingRight: Spacing.lg },
  quickTile: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 84,
    gap: 6,
    ...Shadow.sm,
  },
  quickIcon: { fontSize: 22 },
  quickLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, maxWidth: 80 },

  section: { marginBottom: Spacing.xl },
  profilesRow: { gap: Spacing.sm, paddingRight: Spacing.lg },
  profileCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    width: 96,
    gap: 6,
    ...Shadow.sm,
  },
  profileName: { fontSize: 12, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  profileCount: { fontSize: 10, color: Colors.textMuted },
  reminderCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  reminderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderTitle: { ...Typography.h3, fontSize: 14 },
  reminderSub: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  reminderTime: { ...Typography.caption, marginTop: 2 },
});
