// src/screens/HistoryScreen.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, SectionList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { format, parseISO, subDays, startOfDay } from 'date-fns';
import { useAppStore } from '../stores/useAppStore';
import { EventType, EVENT_TYPE_ICONS, EVENT_TYPE_LABELS, HealthEvent } from '../types';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { EmptyState } from '../components/UI';
import { EventCard } from '../components/EventCard';
import { FAB } from '../components/FAB';
import { AddEventModal } from '../components/AddEventModal';
import { formatDateHeader } from '../utils/helpers';
import { safeParseMeta } from '../utils/safeParse';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type DateRange = 'all' | '7d' | '30d' | '90d';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: 'Tout',
  '7d': '7 jours',
  '30d': '30 jours',
  '90d': '90 jours',
};

const DATE_RANGES: DateRange[] = ['all', '7d', '30d', '90d'];

interface DaySection {
  day: string;
  title: string;
  data: HealthEvent[];
}

export default function HistoryScreen() {
  const profiles = useAppStore((s) => s.profiles);
  const events = useAppStore((s) => s.events);
  const upsertEvent = useAppStore((s) => s.upsertEvent);

  const navigation = useNavigation<Nav>();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [showFilters, setShowFilters] = useState(false);

  const activeProfiles = useMemo(() => profiles.filter((p) => !p.archived), [profiles]);

  // Filters are composable: profile AND type AND date range AND search query.
  // Search now also matches event.metadata (medication name, practitioner,
  // location, method, dosage, …) — previously it only looked at title/note.
  const filteredEvents = useMemo(() => {
    const rangeStart = dateRange === 'all'
      ? null
      : startOfDay(subDays(new Date(), dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90));

    const q = searchQuery.trim().toLowerCase();

    let result = events;
    if (selectedProfile) result = result.filter((e) => e.profile_id === selectedProfile);
    if (selectedType) result = result.filter((e) => e.event_type === selectedType);
    if (rangeStart) {
      result = result.filter((e) => parseISO(e.occurred_at) >= rangeStart);
    }
    if (q) {
      result = result.filter((e) => {
        if (e.title.toLowerCase().includes(q)) return true;
        if (e.note.toLowerCase().includes(q)) return true;
        const meta = safeParseMeta<Record<string, string>>(e.metadata_json);
        if (meta) {
          return Object.values(meta).some((v) =>
            typeof v === 'string' && v.toLowerCase().includes(q),
          );
        }
        return false;
      });
    }
    return result.sort(
      (a, b) => parseISO(b.occurred_at).getTime() - parseISO(a.occurred_at).getTime(),
    );
  }, [events, selectedProfile, selectedType, dateRange, searchQuery]);

  const sections = useMemo<DaySection[]>(() => {
    const map = new Map<string, HealthEvent[]>();
    for (const e of filteredEvents) {
      const day = format(parseISO(e.occurred_at), 'yyyy-MM-dd');
      const arr = map.get(day);
      if (arr) arr.push(e);
      else map.set(day, [e]);
    }
    return Array.from(map.entries())
      .map(([day, items]) => ({
        day,
        title: formatDateHeader(items[0].occurred_at),
        data: items,
      }))
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [filteredEvents]);

  const getProfile = (id: string) => profiles.find((p) => p.id === id);
  const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

  const hasActiveFilter =
    !!selectedProfile || !!selectedType || dateRange !== 'all' || !!searchQuery.trim();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterBtn}
          accessibilityRole="button"
          accessibilityLabel={showFilters ? 'Fermer les filtres' : 'Ouvrir les filtres'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.filterBtnText}>{showFilters ? '✕ Filtres' : '⚙ Filtres'}</Text>
          {hasActiveFilter && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher (titre, note, médicament, lieu…)"
          placeholderTextColor={Colors.textMuted}
          clearButtonMode="while-editing"
          accessibilityLabel="Rechercher dans les événements"
        />
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filterLabel}>Période</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            {DATE_RANGES.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setDateRange(r)}
                accessibilityRole="button"
                accessibilityLabel={DATE_RANGE_LABELS[r]}
                accessibilityState={{ selected: dateRange === r }}
                style={[styles.filterChip, dateRange === r && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, dateRange === r && styles.filterChipTextActive]}>{DATE_RANGE_LABELS[r]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterLabel, { marginTop: 8 }]}>Membre</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            <TouchableOpacity onPress={() => setSelectedProfile(null)} style={[styles.filterChip, !selectedProfile && styles.filterChipActive]} accessibilityRole="button" accessibilityLabel="Tous les membres" accessibilityState={{ selected: !selectedProfile }}>
              <Text style={[styles.filterChipText, !selectedProfile && styles.filterChipTextActive]}>Tous</Text>
            </TouchableOpacity>
            {activeProfiles.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedProfile(selectedProfile === p.id ? null : p.id)}
                accessibilityRole="button"
                accessibilityLabel={p.display_name}
                accessibilityState={{ selected: selectedProfile === p.id }}
                style={[styles.filterChip, selectedProfile === p.id && { borderColor: p.color, backgroundColor: p.color + '20' }]}
              >
                <Text style={[styles.filterChipText, selectedProfile === p.id && { color: p.color }]}>{p.display_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterLabel, { marginTop: 8 }]}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            <TouchableOpacity onPress={() => setSelectedType(null)} style={[styles.filterChip, !selectedType && styles.filterChipActive]} accessibilityRole="button" accessibilityLabel="Tous les types" accessibilityState={{ selected: !selectedType }}>
              <Text style={[styles.filterChipText, !selectedType && styles.filterChipTextActive]}>Tous</Text>
            </TouchableOpacity>
            {EVENT_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setSelectedType(selectedType === t ? null : t)}
                accessibilityRole="button"
                accessibilityLabel={EVENT_TYPE_LABELS[t]}
                accessibilityState={{ selected: selectedType === t }}
                style={[styles.filterChip, selectedType === t && styles.filterChipActive]}
              >
                <Text style={styles.filterChipText}>{EVENT_TYPE_ICONS[t]} {EVENT_TYPE_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {hasActiveFilter && (
            <TouchableOpacity
              onPress={() => {
                setSelectedProfile(null);
                setSelectedType(null);
                setDateRange('all');
                setSearchQuery('');
              }}
              style={styles.clearFiltersBtn}
              accessibilityRole="button"
              accessibilityLabel="Effacer tous les filtres"
            >
              <Text style={styles.clearFiltersText}>Effacer les filtres</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {sections.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            emoji="📋"
            title="Aucun événement"
            subtitle={
              hasActiveFilter
                ? 'Aucun résultat pour ces filtres'
                : 'Appuyez sur + pour commencer'
            }
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          windowSize={10}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          renderSectionHeader={({ section }) => (
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{section.title}</Text>
              <Text style={styles.dayCount}>{section.data.length}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              profile={getProfile(item.profile_id)}
              showProfile={activeProfiles.length > 1}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
            />
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

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
  clearFiltersBtn: { alignSelf: 'flex-start', marginTop: Spacing.sm, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.danger + '15' },
  clearFiltersText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  content: { padding: Spacing.lg },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.lg, marginBottom: Spacing.sm, paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dayLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'capitalize' },
  dayCount: { fontSize: 11, color: Colors.textMuted, backgroundColor: Colors.surfaceAlt, paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
});
