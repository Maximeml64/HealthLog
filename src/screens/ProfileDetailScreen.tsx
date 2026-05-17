// src/screens/ProfileDetailScreen.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { subDays, subMonths, parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppStore } from '../stores/useAppStore';
import { useMenstrualStore } from '../stores/useMenstrualStore';
import {
  getCycleStats, getCurrentPhase, getPregnancyWeek, getPregnancyTrimester, type CyclePhase,
} from '../utils/menstrualCalc';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { useToday } from '../utils/useToday';
import { Card, Avatar, Button, EmptyState, Badge } from '../components/UI';
import { EventCard } from '../components/EventCard';
import { AddEventModal } from '../components/AddEventModal';
import { generateEpisodeSummary } from '../services/SummaryService';
import { generateMedicalPdf } from '../services/PdfExportService';
import { TemperatureChart } from '../components/TemperatureChart';
import { RELATION_TYPE_LABELS, EVENT_TYPE_ICONS, EventType, Sex } from '../types';
import { formatAge } from '../utils/helpers';
import { useEventSearch } from '../utils/useEventSearch';

const SEX_LABELS: Record<Sex, string> = {
  female: 'Femme',
  male: 'Homme',
  non_binary: 'Non binaire',
  unspecified: 'Non spécifié',
};

const PHASE_COLORS: Record<CyclePhase, string> = {
  menstruation: Colors.danger,
  follicular:   Colors.warning,
  ovulation:    Colors.success,
  luteal:       Colors.primary,
};

const PHASE_LABELS_SHORT: Record<CyclePhase, string> = {
  menstruation: 'Règles',
  follicular:   'Folliculaire',
  ovulation:    'Ovulation',
  luteal:       'Lutéale',
};

type Nav = NativeStackNavigationProp<RootStackParamList>;
type PeriodKey = '7d' | '30d' | '3m' | 'all';

const PERIODS: { key: PeriodKey; label: string; a11yLabel: string }[] = [
  { key: '7d', label: '7 j', a11yLabel: 'Filtrer sur 7 jours' },
  { key: '30d', label: '30 j', a11yLabel: 'Filtrer sur 30 jours' },
  { key: '3m', label: '3 mois', a11yLabel: 'Filtrer sur 3 mois' },
  { key: 'all', label: 'Tout', a11yLabel: 'Afficher tous les événements' },
];

export default function ProfileDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ProfileDetail'>>();
  const navigation = useNavigation<Nav>();
  const { profileId } = route.params;
  const { profiles, events, upsertEvent } = useAppStore();

  const profile = profiles.find((p) => p.id === profileId);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('30d');
  const [showSummary, setShowSummary] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { cycles, loadMenstrualData, getActivePregnancy } = useMenstrualStore();
  useEffect(() => { loadMenstrualData(); }, [loadMenstrualData]);
  const profileCycles = useMemo(() => cycles.filter((c) => c.profileId === profileId), [cycles, profileId]);
  const today = useToday();

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

  const searchedEvents = useEventSearch(filteredEvents, searchQuery);

  const summary = useMemo(() => {
    if (!showSummary || !profile) return null;
    return generateEpisodeSummary(profile, events, periodStart, new Date());
  }, [showSummary, profile, events, periodStart]);

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState emoji="❓" title="Profil introuvable" />
      </SafeAreaView>
    );
  }

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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
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
          {((profile.sex && profile.sex !== 'unspecified') || profile.menstrualTrackingEnabled) && (
            <Text style={styles.profileTrackingInfo}>
              {profile.sex && profile.sex !== 'unspecified' ? SEX_LABELS[profile.sex] : ''}
              {profile.sex && profile.sex !== 'unspecified' && profile.menstrualTrackingEnabled ? ' · ' : ''}
              {profile.menstrualTrackingEnabled ? 'Suivi menstruel activé' : ''}
            </Text>
          )}
          <Button label="+ Ajouter un événement" onPress={() => setAddModalVisible(true)} size="sm" style={{ marginTop: Spacing.md }} />
        </View>

        {(profile.menstrualTrackingEnabled ?? false) && (() => {
          const mode = profile.menstrualMode ?? 'tracking';
          const menstrualStats = getCycleStats(profileCycles);
          const phase = getCurrentPhase(profileCycles, today);
          const activePregnancy = getActivePregnancy(profileId);
          const lastCycle = [...profileCycles].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
          const pregnancyWeek = activePregnancy ? getPregnancyWeek(activePregnancy, today) : null;
          const pregnancyTrimester = activePregnancy ? getPregnancyTrimester(activePregnancy, today) : null;
          return (
            <View style={styles.menstrualSection}>
              <View style={styles.menstrualHeader}>
                <Text style={styles.menstrualTitle}>Suivi menstruel</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('CycleScreen', { profileId: profile.id })}
                  accessibilityRole="button"
                  accessibilityLabel="Voir tout le suivi menstruel"
                >
                  <Text style={styles.menstrualViewAll}>Voir tout ›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.menstrualStats}>
                {mode === 'pregnancy' ? (
                  <>
                    <View style={styles.menstrualStat}>
                      <Text style={styles.menstrualStatValue}>{pregnancyWeek != null ? `S${pregnancyWeek}` : '–'}</Text>
                      <Text style={styles.menstrualStatLabel}>Semaine</Text>
                    </View>
                    <View style={styles.menstrualStat}>
                      <Text style={styles.menstrualStatValue}>{pregnancyTrimester ?? '–'}</Text>
                      <Text style={styles.menstrualStatLabel}>Trimestre</Text>
                    </View>
                    <View style={styles.menstrualStat}>
                      <Text style={styles.menstrualStatValue} numberOfLines={1}>
                        {activePregnancy ? format(parseISO(activePregnancy.dueDate), 'd MMM', { locale: fr }) : '–'}
                      </Text>
                      <Text style={styles.menstrualStatLabel}>DPA</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.menstrualStat}>
                      <View style={styles.phaseLabelRow}>
                        <View style={[styles.phaseDot, { backgroundColor: phase ? PHASE_COLORS[phase] : Colors.border }]} />
                        <Text style={styles.menstrualStatValue} numberOfLines={1}>
                          {phase ? PHASE_LABELS_SHORT[phase] : '–'}
                        </Text>
                      </View>
                      <Text style={styles.menstrualStatLabel}>Phase</Text>
                    </View>
                    <View style={styles.menstrualStat}>
                      <Text style={styles.menstrualStatValue}>{menstrualStats.avgCycleLength}j</Text>
                      <Text style={styles.menstrualStatLabel}>Cycle moyen</Text>
                    </View>
                    <View style={styles.menstrualStat}>
                      <Text style={styles.menstrualStatValue} numberOfLines={1}>
                        {lastCycle ? format(parseISO(lastCycle.startDate), 'd MMM', { locale: fr }) : '–'}
                      </Text>
                      <Text style={styles.menstrualStatLabel}>Dernière période</Text>
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity
                style={styles.menstrualAddBtn}
                onPress={() => navigation.navigate('PeriodEditScreen', { profileId: profile.id, mode: 'createCycle' })}
                accessibilityRole="button"
              >
                <Text style={styles.menstrualAddBtnText}>+ Ajouter une période</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        <View style={styles.content}>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => setSelectedPeriod(p.key)}
                accessibilityRole="button"
                accessibilityLabel={p.a11yLabel}
                accessibilityState={{ selected: selectedPeriod === p.key }}
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
  profileTrackingInfo: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },

  menstrualSection: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menstrualHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  menstrualTitle: { ...Typography.h3 },
  menstrualViewAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  menstrualStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.md },
  menstrualStat: { alignItems: 'center', flex: 1, gap: 3 },
  menstrualStatValue: { fontSize: 15, fontWeight: '700', color: Colors.text },
  menstrualStatLabel: { fontSize: 10, color: Colors.textMuted },
  phaseLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  phaseDot: { width: 8, height: 8, borderRadius: 4 },
  menstrualAddBtn: { paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primaryMuted, backgroundColor: Colors.primaryMuted },
  menstrualAddBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

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
