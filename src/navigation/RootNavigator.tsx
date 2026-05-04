// src/navigation/RootNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../utils/theme';

import { useAppStore } from '../stores/useAppStore';
import HomeScreen from '../screens/HomeScreen';
import ProfilesScreen from '../screens/ProfilesScreen';
import HistoryScreen from '../screens/HistoryScreen';
import RemindersScreen from '../screens/RemindersScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import ProfileDetailScreen from '../screens/ProfileDetailScreen';
import PrescriptionsListScreen from '../screens/PrescriptionsListScreen';
import PrescriptionDetailScreen from '../screens/PrescriptionDetailScreen';
import PrescriptionEditScreen from '../screens/PrescriptionEditScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

export type RootStackParamList = {
  Tabs: undefined;
  EventDetail: { eventId: string };
  ProfileDetail: { profileId: string };
  PrescriptionsList: undefined;
  PrescriptionDetail: { id: string };
  PrescriptionEdit: { prescriptionId?: string };
};

export type TabParamList = {
  Home: undefined;
  Profiles: undefined;
  History: undefined;
  Reminders: undefined;
  Prescriptions: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  const { bottom } = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          paddingBottom: bottom,
          height: 60 + bottom,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Accueil', tabBarAccessibilityLabel: 'Onglet Accueil', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text> }}
      />
      <Tab.Screen
        name="Profiles"
        component={ProfilesScreen}
        options={{ tabBarLabel: 'Profils', tabBarAccessibilityLabel: 'Onglet Profils', tabBarIcon: () => <Text style={{ fontSize: 20 }}>👨‍👩‍👧</Text> }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarLabel: 'Historique', tabBarAccessibilityLabel: 'Onglet Historique', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text> }}
      />
      <Tab.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{ tabBarLabel: 'Rappels', tabBarAccessibilityLabel: 'Onglet Rappels', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🔔</Text> }}
      />
      <Tab.Screen
        name="Prescriptions"
        component={PrescriptionsListScreen}
        options={{ tabBarLabel: 'Ordonnances', tabBarAccessibilityLabel: 'Onglet Ordonnances', tabBarIcon: () => <Text style={{ fontSize: 20 }}>💊</Text> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Réglages', tabBarAccessibilityLabel: 'Onglet Réglages', tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const legalAccepted = useAppStore((s) => s.settings.legal_accepted);

  if (!legalAccepted) {
    return <OnboardingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ProfileDetail"
        component={ProfileDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PrescriptionDetail"
        component={PrescriptionDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PrescriptionEdit"
        component={PrescriptionEditScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
