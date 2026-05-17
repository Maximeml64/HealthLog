// src/navigation/RootNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home as HomeIcon,
  Users as UsersIcon,
  Clock as ClockIcon,
  Bell as BellIcon,
  Pill as PillIcon,
  Settings as SettingsIcon,
} from 'lucide-react-native';
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
import PaywallScreen from '../screens/PaywallScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import CycleScreen from '../screens/CycleScreen';
import PeriodEditScreen from '../screens/PeriodEditScreen';
import PregnancyStartScreen from '../screens/PregnancyStartScreen';
import AppointmentEditScreen from '../screens/AppointmentEditScreen';

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  EventDetail: { eventId: string };
  ProfileDetail: { profileId: string };
  PrescriptionDetail: { id: string };
  PrescriptionEdit: { prescriptionId?: string };
  Paywall: undefined;
  CycleScreen: { profileId: string };
  PeriodEditScreen: {
    profileId: string;
    mode: 'createCycle' | 'editCycle' | 'editDay';
    cycleId?: string;
    date?: string;
  };
  PregnancyStartScreen: { profileId: string; prefillLmpDate?: string };
  AppointmentEditScreen: { profileId: string; pregnancyId: string; appointmentId?: string; prefillType?: string };
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

const TAB_ICON_SIZE = 22;

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
          paddingTop: 6,
          height: 60 + bottom,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.1, marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarAccessibilityLabel: 'Onglet Accueil',
          tabBarIcon: ({ color, focused }) => (
            <HomeIcon size={TAB_ICON_SIZE} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tab.Screen
        name="Profiles"
        component={ProfilesScreen}
        options={{
          tabBarLabel: 'Profils',
          tabBarAccessibilityLabel: 'Onglet Profils',
          tabBarIcon: ({ color, focused }) => (
            <UsersIcon size={TAB_ICON_SIZE} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Historique',
          tabBarAccessibilityLabel: 'Onglet Historique',
          tabBarIcon: ({ color, focused }) => (
            <ClockIcon size={TAB_ICON_SIZE} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tab.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{
          tabBarLabel: 'Rappels',
          tabBarAccessibilityLabel: 'Onglet Rappels',
          tabBarIcon: ({ color, focused }) => (
            <BellIcon size={TAB_ICON_SIZE} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tab.Screen
        name="Prescriptions"
        component={PrescriptionsListScreen}
        options={{
          tabBarLabel: 'Ordonnances',
          tabBarAccessibilityLabel: 'Onglet Ordonnances',
          tabBarIcon: ({ color, focused }) => (
            <PillIcon size={TAB_ICON_SIZE} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Réglages',
          tabBarAccessibilityLabel: 'Onglet Réglages',
          tabBarIcon: ({ color, focused }) => (
            <SettingsIcon size={TAB_ICON_SIZE} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
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
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
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
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="CycleScreen"
        component={CycleScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PeriodEditScreen"
        component={PeriodEditScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="PregnancyStartScreen"
        component={PregnancyStartScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="AppointmentEditScreen"
        component={AppointmentEditScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
