// src/screens/PrescriptionsListScreen.tsx

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { format, parseISO, isAfter } from 'date-fns';

import { fr } from 'date-fns/locale';
import { useAppStore } from '../stores/useAppStore';
import { Prescription } from '../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../utils/theme';
import { EmptyState, Badge } from '../components/UI';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Local FAB ────────────────────────────────────────────────────────────────
// Mirrors FAB.tsx exactly but with prescription-specific accessibility label.

interface PrescriptionFABProps {
  onPress: () => void;
}

const PrescriptionFAB: React.FC<PrescriptionFABProps> = ({ onPress }) => (
  <TouchableOpacity
    style={styles.fab}
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel="Ajouter une ordonnance"
    accessibilityHint="Ouvre le formulaire de création d'une nouvelle ordonnance"
  >
    <Text style={styles.fabPlus}>＋</Text>
  </TouchableOpacity>
);

// ─── Prescription card ────────────────────────────────────────────────────────

interface PrescriptionCardProps {
  prescription: Prescription;
  activeMedCount: number;
  onPress: () => void;
}

const PrescriptionCard: React.FC<PrescriptionCardProps> = ({
  prescription,
  activeMedCount,
  onPress,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isExpired =
    prescription.valid_until !== null &&
    !isAfter(parseISO(prescription.valid_until), today);

  const prescribedDateLabel = format(
    parseISO(prescription.prescribed_date),
    'd MMMM yyyy',
    { locale: fr }
  );

  const doctorLabel = prescription.doctor_name.trim() || 'Médecin non renseigné';
  const doctorIsEmpty = !prescription.doctor_name.trim();

  const medLabel =
    activeMedCount === 0
      ? 'Aucun médicament actif'
      : activeMedCount === 1
      ? '1 médicament actif'
      : `${activeMedCount} médicaments actifs`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={`Ordonnance de ${doctorLabel}, prescrite le ${prescribedDateLabel}, ${medLabel}${isExpired ? ', expirée' : ''}`}
      accessibilityHint="Appuyez pour voir les détails"
    >
      {/* Thumbnail */}
      {prescription.image_uri ? (
        <Image
          source={{ uri: prescription.image_uri }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Text style={styles.thumbnailEmoji}>📋</Text>
        </View>
      )}

      {/* Text block */}
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text
            style={[styles.doctorName, doctorIsEmpty && styles.doctorNameEmpty]}
            numberOfLines={1}
          >
            {doctorLabel}
          </Text>
          {isExpired && (
            <Badge label="Expirée" color={Colors.danger} bg={Colors.primaryLight} />
          )}
        </View>

        <Text style={styles.cardDate}>Prescrite le {prescribedDateLabel}</Text>

        <Text
          style={[
            styles.cardMeds,
            activeMedCount === 0 && styles.cardMedsEmpty,
          ]}
        >
          {medLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PrescriptionsListScreen() {
  const navigation = useNavigation<Nav>();
  const { profiles, settings, prescriptions, prescribedMedications } = useAppStore();

  // ── Profil actif ──
  // 1. default_profile_id si trouvé parmi les profils non archivés
  // 2. sinon premier profil non archivé
  const activeProfiles = useMemo(
    () => profiles.filter((p) => !p.archived),
    [profiles]
  );

  const activeProfile = useMemo(() => {
    if (settings.default_profile_id) {
      const found = activeProfiles.find((p) => p.id === settings.default_profile_id);
      if (found) return found;
    }
    return activeProfiles[0] ?? null;
  }, [activeProfiles, settings.default_profile_id]);

  // ── Ordonnances du profil actif, non archivées, triées par date décroissante ──
  const visiblePrescriptions = useMemo(() => {
    if (!activeProfile) return [];
    return [...prescriptions]
      .filter((p) => p.profile_id === activeProfile.id && !p.archived)
      .sort((a, b) => b.prescribed_date.localeCompare(a.prescribed_date));
  }, [prescriptions, activeProfile]);

  // ── Nombre de médicaments actifs par ordonnance (computed once) ──
  const activeMedCountByPrescription = useMemo(() => {
    const map: Record<string, number> = {};
    for (const med of prescribedMedications) {
      if (med.prescription_id && med.active) {
        map[med.prescription_id] = (map[med.prescription_id] ?? 0) + 1;
      }
    }
    return map;
  }, [prescribedMedications]);

  const handleCreate = () => {
    navigation.navigate('PrescriptionEdit', { prescriptionId: undefined });
  };

  const handlePressCard = (id: string) => {
    navigation.navigate('PrescriptionDetail', { id });
  };

  // ── No profile at all ──
  if (activeProfiles.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Ordonnances</Text>
        </View>
        <EmptyState
          emoji="👨‍👩‍👧"
          title="Aucun profil créé"
          subtitle="Crée d'abord un profil pour gérer les ordonnances."
          action={{
            label: 'Créer un profil',
            onPress: () => navigation.navigate('Tabs', { screen: 'Profiles' }),
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Ordonnances</Text>
        {activeProfile && (
          <Text style={styles.profileChip} numberOfLines={1}>
            👤 {activeProfile.display_name}
          </Text>
        )}
      </View>

      {/* ── Liste ── */}
      <FlatList
        data={visiblePrescriptions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            emoji="📋"
            title="Aucune ordonnance enregistrée"
            subtitle="Ajoute ta première ordonnance pour gérer tes traitements et rappels."
          />
        }
        renderItem={({ item }) => (
          <PrescriptionCard
            prescription={item}
            activeMedCount={activeMedCountByPrescription[item.id] ?? 0}
            onPress={() => handlePressCard(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* ── FAB ── */}
      <PrescriptionFAB onPress={handleCreate} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header — same pattern as HistoryScreen / ProfilesScreen
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    ...Typography.h1,
  },
  profileChip: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    maxWidth: 140,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100, // room for FAB
  },
  separator: {
    height: Spacing.sm,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    ...Shadow.sm,
  },

  // Thumbnail
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailEmoji: {
    fontSize: 26,
  },

  // Card content
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  doctorName: {
    ...Typography.h3,
    flex: 1,
    fontSize: 15,
  },
  doctorNameEmpty: {
    color: Colors.textMuted,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  cardDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  cardMeds: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    fontWeight: '500',
  },
  cardMedsEmpty: {
    color: Colors.textMuted,
    fontWeight: '400',
  },

  // FAB — mirrors FAB.tsx styles exactly
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
  fabPlus: {
    fontSize: 28,
    color: Colors.white,
    lineHeight: 32,
    marginTop: -2,
  },
});
