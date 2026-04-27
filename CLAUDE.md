# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start Expo dev server (clears cache)
npm run android    # Launch on Android simulator/device
npm run ios        # Launch on iOS simulator/device
```

There is no lint, test, or production build command configured.

## Architecture

**Healthlog** is a French-language React Native family health journal app built with Expo. All data is stored locally — there is no backend.

### State & Persistence

The entire app state lives in a single Zustand store (`src/stores/useAppStore.ts`): profiles, health events, reminders, and settings. Persistence is handled by `src/services/StorageService.ts` via AsyncStorage (JSON key-value). The store loads from storage on app init in `App.tsx`.

### Data Model (`src/types/index.ts`)

- **Profile** — a household member (self, child, partner, parent, etc.) with avatar, color, birth date
- **HealthEvent** — a timestamped entry with one of 11 types: symptom, temperature, medication, appointment, vaccine, weight, height, sleep, digestion, appetite, mood, or note. Events carry type-specific metadata (e.g., dosage, temperature method, appointment location) and optional attachments
- **Reminder** — a scheduled notification linked to a profile; can recur
- **AppSettings** — notification toggle, theme, premium flag, legal acceptance

### Navigation (`src/navigation/RootNavigator.tsx`)

Bottom tab navigator (Accueil, Profils, Historique, Rappels, Réglages) with a native stack on top for detail/modal screens (EventDetailScreen, ProfileDetailScreen).

### Services

- `StorageService` — AsyncStorage CRUD for all entity types; also handles `exportAllData()` / `importAllData()` (premium feature)
- `NotificationService` — thin wrapper around Expo Notifications; schedules and cancels reminders
- `SummaryService` — generates health summaries for a date range (temperature range, event breakdown, medications, appointments)

### UI

Shared design tokens are in `src/utils/theme.ts` (warm beige/coral palette: background `#FFF8F0`, accent `#FF6B6B`). Base UI primitives (Card, Avatar, SectionHeader, etc.) live in `src/components/UI.tsx`. All user-facing text is in French; dates use `date-fns` with the `fr` locale.

## Key Conventions

- All text and labels are in French.
- TypeScript strict mode is on — avoid `any`.
- New event types require updates in: `src/types/index.ts` (union type), `AddEventModal.tsx` (form fields), `EventCard.tsx` (display), and `SummaryService.ts` if aggregation is needed.
- Adding a new persisted field requires updating both the type definition and `StorageService` migration logic if existing stored data must be preserved.

## Conventions critiques

**Navigation** — Utiliser EXCLUSIVEMENT React Navigation (`native-stack` + `bottom-tabs`). Ne JAMAIS utiliser `expo-router` : il provoque un bug `getDevServer is not a function` avec Expo Go SDK 54 sur iOS.

**Installation** — Toujours installer les dépendances avec `npm install --legacy-peer-deps` à cause de conflits de peer deps sur `@types/react`.

**Architecture** — Pas de dossier `app/`. Le point d'entrée est `index.js` → `App.tsx` → `NavigationContainer` + `RootNavigator`. Ne pas créer de structure de fichiers compatible expo-router.

**Stockage** — AsyncStorage uniquement. Ne pas introduire SQLite ou tout autre moteur de base de données.

**Tests** — L'app est testée sur iPhone physique via Expo Go (QR code). Aucun simulateur disponible.
