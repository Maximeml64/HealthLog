// src/screens/HistoryScreen.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '../stores/useAppStore';
import { EventType, EVENT_TYPE_ICONS, EVENT_TYPE_LABELS } from '../types';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { EmptyState } from '../components/UI';
import { EventCard } from '../components/EventCard';
import { FAB } from '../components/FAB';
import { AddEventModal } from '../components/AddEventModal';
import { formatDateHeader } from '../utils/helpers';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HistoryScreen() {
  const { profiles, events, upsertEvent } = useAppStore();
  const navigation = useNavigation<Nav>();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const activeProfiles = profiles.filter((p) => !p.archived);

  const filteredEvents = useMemo(() => {
    let result = [...events];
    if (selectedProfile) result = result.filter((e) => e.profile_id === selectedProfile);
    if (selectedType) result = result.filter((e) => e.event_type === selectedType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(q) || e.note.toLowerCase().includes(q));
    }
    return result.sort((a, b) => parseISO(b.occurred_at).getTime() - parseISO(a.occurred_at).getTime());
  }, [events, selectedProfile, selectedType, searchQuery]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filteredEvents> = {};
    for (const e of filteredEvents) {
      const day = format(parseISO(e.occurred_at), 'yyyy-MM-dd');
      if (!map[day]) map[day] = [];
      map[day].push(e);
    }
    return Object.entries(map)
      .map(([day, items]) => ({ day, label: formatDateHeader(items[0].occurred_at), items }))
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [filteredEvents]);

  const getProfile = (id: string) => profiles.find((p) => p.id === id);
  const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterBtn}>
          <Text style={styles.filterBtnText}>{showFilters ? '✕ Filtres' : '⚙ Filtres'}</Text>
          {(selectedProfile || selectedType) && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher…"
          placeholderTextColor={Colors.textMuted}
          clearButtonMode="while-editing"
        />
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filterLabel}>Membre</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            <TouchableOpacity onPress={() => setSelectedProfile(null)} style={[styles.filterChip, !selectedProfile && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, !selectedProfile && styles.filterChipTextActive]}>Tous</Text>
            </TouchableOpacity>
            {activeProfiles.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedProfile(selectedProfile === p.id ? null : p.id)}
                style={[styles.filterChip, selectedProfile === p.id && { borderColor: p.color, backgroundColor: p.color + '20' }]}
              >
                <Text style={[styles.filterChipText, selectedProfile === p.id && { color: p.color }]}>{p.display_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.filterLabel, { marginTop: 8 }]}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            <TouchableOpacity onPress={() => setSelectedType(null)} style={[styles.filterChip, !selectedType && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, !selectedType && styles.filterChipTextActive]}>Tous</Text>
            </TouchableOpacity>
            {EVENT_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setSelectedType(selectedType === t ? null : t)}
                style={[styles.filterChip, selectedType === t && styles.filterChipActive]}
              >
                <Text style={styles.filterChipText}>{EVENT_TYPE_ICONS[t]} {EVENT_TYPE_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {grouped.length === 0 ? (
          <EmptyState
            emoji="📋"
            title="Aucun événement"
            subtitle={searchQuery || selectedProfile || selectedType ? 'Aucun résultat pour ces filtres' : 'Appuyez sur + pour commencer'}
          />
        ) : (
          grouped.map(({ day, label, items }) => (
            <View key={day} style={styles.dayGroup}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{label}</Text>
                <Text style={styles.dayCount}>{items.length}</Text>
              </View>
              {items.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  profile={getProfile(event.profile_id)}
                  showProfile={activeProfiles.length > 1}
                  onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                />
              ))}
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB onPress={() => setAddModalVisible(true)} />
      <AddEventModal visible={addModalVisible} profiles={profiles} onClose={() => setAddModalVisible(false)} onSave={upsertEvent} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { ...Typography.h1 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.primary },
  searchRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchInput: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, fontSize: 14, color: Colors.text },
  filtersPanel: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  filterLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterChipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: Colors.primary, fontWeight: '700' },
  content: { padding: Spacing.lg },
  dayGroup: { marginBottom: Spacing.lg },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm, paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dayLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'capitalize' },
  dayCount: { fontSize: 11, color: Colors.textMuted, backgroundColor: Colors.surfaceAlt, paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
});
