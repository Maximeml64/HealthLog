# Healthlog — Notes spécifiques à l'app

> Le standard général React Native/Expo est dans `../CLAUDE.md`. Ce fichier ne contient que ce qui est **propre à Healthlog** ou qui **dévie** du standard.

## Architecture

**Healthlog** est un journal de santé familial en français. **100% local**, pas de backend. Pas de sync multi-device.

### Stack — déviations vs standard global

| Couche | Choix Healthlog | Différence vs standard |
|---|---|---|
| Routing | **React Navigation 7** (`native-stack` + `bottom-tabs`) | Standard recommande expo-router 6 |
| Build mode | **EAS Dev Build** (norme depuis mai 2026) | OK avec standard |
| State | **Zustand vanilla** (sans middleware persist) | Standard recommande `persist` middleware |
| Persistance | **AsyncStorage manuel** via `StorageService` | Pas de `persist` middleware Zustand |
| Validation | **Pas de Zod** | Standard recommande Zod sur entrées |
| Monitoring | **Sentry actif** | OK avec standard |

### Pourquoi React Navigation et pas expo-router

Historique : `expo-router 6` + Expo Go SDK 54 sur iOS donnait le bug `getDevServer is not a function`. React Navigation était le contournement validé. **Depuis le passage à EAS Dev Build (mai 2026), ce bug n'est plus un blocker** — mais migrer Healthlog vers expo-router reste hors scope sans demande explicite (le coût de refacto dépasse le bénéfice). Pas de dossier `app/`. Pas de structure compatible expo-router.

Point d'entrée : `index.js` → `App.tsx` → `NavigationContainer` + `RootNavigator`.

## State & Persistance

L'app a un **store Zustand unique** : `src/stores/useAppStore.ts` qui contient profils, événements santé, rappels, settings. La persistance est gérée par `src/services/StorageService.ts` via AsyncStorage (clé-valeur JSON). Le store charge depuis le storage au démarrage dans `App.tsx`.

**Conséquence importante** : tout changement de schéma sur le store demande une logique de migration manuelle dans `StorageService` (pas de version bump automatique comme avec `persist`).

## Data Model (`src/types/index.ts`)

- **Profile** — membre du foyer (soi, enfant, partenaire, parent...) avec avatar, couleur, date de naissance
- **HealthEvent** — entrée datée, un des 11 types : `symptom`, `temperature`, `medication`, `appointment`, `vaccine`, `weight`, `height`, `sleep`, `digestion`, `appetite`, `mood`, `note`. Chaque type a sa metadata (dosage, méthode de prise de température, lieu de rdv...) + attachments optionnels
- **Reminder** — notification planifiée liée à un profil ; peut être récurrente
- **AppSettings** — toggle notifications, thème, flag premium, acceptation légale

## Navigation (`src/navigation/RootNavigator.tsx`)

Bottom tab navigator (Accueil, Profils, Historique, Rappels, Réglages) avec native stack par-dessus pour écrans détail/modal (`EventDetailScreen`, `ProfileDetailScreen`).

## Services

- `StorageService` — CRUD AsyncStorage pour tous les types d'entités ; gère aussi `exportAllData()` / `importAllData()` (feature premium)
- `NotificationService` — wrapper fin autour d'Expo Notifications ; planifie et annule les rappels
- `SummaryService` — génère des résumés santé sur une plage de dates (range température, breakdown événements, médicaments, rdv)

## UI

Design tokens dans `src/utils/theme.ts` (palette beige/corail chaud : background `#FFF8F0`, accent `#FF6B6B`). Primitives UI (Card, Avatar, SectionHeader...) dans `src/components/UI.tsx`. Tout le texte est en français ; dates avec `date-fns` locale `fr`.

## Conventions spécifiques à Healthlog

- **Ajouter un nouveau type d'événement** demande des updates dans : `src/types/index.ts` (union type), `AddEventModal.tsx` (champs form), `EventCard.tsx` (display), et `SummaryService.ts` si agrégation nécessaire.
- **Ajouter un champ persisté** demande de mettre à jour le type ET la logique de migration de `StorageService` si on veut préserver les données existantes en prod.
- **Pas de SQLite ni d'autre moteur DB**. AsyncStorage uniquement.
