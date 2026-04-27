// src/screens/ProfileDetailScreen.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { subDays, subMonths, parseISO } from 'date-fns';
import { useAppStore } from '../stores/useAppStore';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { Card, Avatar, Button, EmptyState, Badge } from '../components/UI';
import { EventCard } from '../components/EventCard';
import { AddEventModal } from '../components/AddEventModal';
import { generateEpisodeSummary } from '../services/SummaryService';
import { generateMedicalPdf } from '../services/PdfExportService';
import { TemperatureChart } from '../components/TemperatureChart';
import { RELATION_TYPE_LABELS, EVENT_TYPE_ICONS, EventType } from '../types';
import { formatAge } from '../utils/helpers';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type PeriodKey = '7d' | '30d' | '3m' | 'all';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: '7 j' },
  { key: '30d', label: '30 j' },
  { key: '3m', label: '3 mois' },
  { key: 'all', label: 'Tout' },
];

export default function ProfileDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<Nav>();
  const { profileId } = route.params;
  const { profiles, events, upsertEvent } = useAppStore();

  const profile = profiles.find((p) => p.id === profileId);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('30d');
  const [showSummary, setShowSummary] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState emoji="❓" title="Profil introuvable" />
      </SafeAreaView>
    );
  }

  const getPeriodStart = (key: PeriodKey): Date => {
    const now = new Date();
    if (key === '7d') return subDays(now, 7);
    if (key === '30d') return subDays(now, 30);
    if (key === '3m') return subMonths(now, 3);
    return new Date(0);
  };

  const profileEvents = useMemo(
    () => events.filter((e) => e.profile_id === profileId).sort((a, b) => parseISO(b.occurred_at).getTime() - parseISO(a.occurred_at).getTime()),
    [events, profileId]
  );

  const periodStart = getPeriodStart(selectedPeriod);
  const filteredEvents = useMemo(() => profileEvents.filter((e) => parseISO(e.occurred_at) >= periodStart), [profileEvents, periodStart]);

  const statsByType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filteredEvents) map[e.event_type] = (map[e.event_type] ?? 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [filteredEvents]);

  const searchedEvents = useMemo(() => {
    if (!searchQuery.trim()) return filteredEvents;
    const q = searchQuery.toLowerCase();
    return filteredEvents.filter((e) => {
      if (e.title.toLowerCase().includes(q)) return true;
      if (e.note.toLowerCase().includes(q)) return true;
      if (e.metadata_json) {
        try {
          const meta = JSON.parse(e.metadata_json) as Record<string, string>;
          return Object.values(meta).some((v) => String(v).toLowerCase().includes(q));
        } catch { /* ignore */ }
      }
      return false;
    });
  }, [filteredEvents, searchQuery]);

  const summary = useMemo(() => {
    if (!showSummary) return null;
    return generateEpisodeSummary(profile, events, periodStart, new Date());
  }, [showSummary, profile, events, periodStart]);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const uri = await generateMedicalPdf({
        profile,
        events: filteredEvents,
        periodStart,
        periodEnd: new Date(),
      });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Partager le rapport médical',
        });
      } else {
        Alert.alert('Export PDF', `PDF généré : ${uri}`);
      }
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de générer le PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.profileHeader, { borderBottomColor: profile.color + '33' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Avatar name={profile.display_name} color={profile.color} size={64} />
          <Text style={styles.profileName}>{profile.display_name}</Text>
          <View style={styles.profileMeta}>
            <Badge label={RELATION_TYPE_LABELS[profile.relation_type]} color={profile.color} />
            {profile.birth_date && <Badge label={formatAge(profile.birth_date)} color={Colors.info} />}
            {profile.blood_type && <Badge label={profile.blood_type} color="#C0392B" />}
          </View>
          {profile.notes ? <Text style={styles.profileNotes}>{profile.notes}</Text> : null}
          <Button label="+ Ajouter un événement" onPress={() => setAddModalVisible(true)} size="sm" style={{ marginTop: Spacing.md }} />
        </View>

        <View style={styles.content}>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => setSelectedPeriod(p.key)}
                style={[styles.periodBtn, selectedPeriod === p.key && { borderColor: profile.color, backgroundColor: profile.color + '15' }]}
              >
                <Text style={[styles.periodBtnText, selectedPeriod === p.key && { color: profile.color }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher dans les événements…"
            placeholderTextColor={Colors.textMuted}
            clearButtonMode="while-editing"
          />

          {filteredEvents.length > 0 && (
            <Card style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: profile.color }]}>{filteredEvents.length}</Text>
                  <Text style={styles.statLabel}>événements</Text>
                </View>
                {statsByType.map(([type, count]) => (
                  <View key={type} style={styles.statItem}>
                    <Text style={styles.statNumber}>{count}</Text>
                    <Text style={styles.statLabel}>{EVENT_TYPE_ICONS[type as EventType]}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          <TemperatureChart events={filteredEvents} color={profile.color} />

          <TouchableOpacity onPress={() => setShowSummary(!showSummary)} style={[styles.summaryToggle, { borderColor: profile.color + '44' }]}>
            <Text style={[styles.summaryToggleText, { color: profile.color }]}>
              {showSummary ? '▲ Masquer le résumé' : '📋 Résumé de période'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleExportPdf}
            disabled={isExporting}
            style={[styles.summaryToggle, { borderColor: profile.color + '44', opacity: isExporting ? 0.6 : 1 }]}
          >
            <Text style={[styles.summaryToggleText, { color: profile.color }]}>
              {isExporting ? '⏳ Génération du PDF…' : '📄 Exporter en PDF'}
            </Text>
          </TouchableOpacity>

          {showSummary && summary && (
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryText}>{summary.text}</Text>
            </Card>
          )}

          <Text style={styles.eventsTitle}>Événements ({searchedEvents.length})</Text>

          {searchedEvents.length === 0 ? (
            <EmptyState
              emoji="📭"
              title={searchQuery.trim() ? 'Aucun résultat pour cette recherche' : 'Aucun événement sur cette période'}
              action={searchQuery.trim() ? undefined : { label: '+ Ajouter', onPress: () => setAddModalVisible(true) }}
            />
          ) : (
            searchedEvents.map((event) => (
              <EventCard key={event.id} event={event} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })} />
            ))
          )}
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>

      <AddEventModal visible={addModalVisible} profiles={profiles} onClose={() => setAddModalVisible(false)} onSave={upsertEvent} defaultProfileId={profileId} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  profileHeader: { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, gap: Spacing.sm, backgroundColor: Colors.surface },
  backBtn: { position: 'absolute', left: Spacing.lg, top: Spacing.xl, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: Colors.textSecondary },
  profileName: { ...Typography.h1, textAlign: 'center' },
  profileMeta: { flexDirection: 'row', gap: Spacing.sm },
  profileNotes: { ...Typography.bodySmall, textAlign: 'center', maxWidth: 300 },
  content: { padding: Spacing.lg },
  periodRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  periodBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  periodBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  statsCard: { padding: Spacing.md, marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 3 },
  statNumber: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  summaryToggle: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', marginBottom: Spacing.md, backgroundColor: Colors.surface },
  summaryToggleText: { fontSize: 13, fontWeight: '600' },
  summaryCard: { marginBottom: Spacing.md, padding: Spacing.lg },
  summaryText: { fontSize: 13, color: Colors.text, lineHeight: 20 },
  eventsTitle: { ...Typography.h3, marginBottom: Spacing.md },
  searchInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
});
