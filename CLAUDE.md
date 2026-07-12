# Healthlog — CLAUDE.md

## Rôle
Journal santé familial multi-profils (React Native/Expo, iOS), **100 % local** (aucun backend). Profils du foyer, événements santé horodatés, ordonnances/médicaments, suivi menstruel/grossesse/TTC, rappels, verrou Face ID. Textes en **français**. Bundle `com.maximeml.healthlog` — **soumission App Store en préparation** (ascAppId 6764234021).

## Stack figée (NE PAS migrer sans demande explicite)
**React Navigation 7** (native-stack + bottom-tabs) — **expo-router banni** (historiquement bug `getDevServer` en Expo Go ; maintenu banni pour coût de refacto). **Zustand 5 sans `persist`** (3 stores, persistance manuelle). AsyncStorage + **expo-secure-store** (notes sensibles). RevenueCat 10, **Sentry 8 durci** (voir Pièges), date-fns, jszip (backups), chart-kit + svg. TypeScript ~5.9 strict. **EAS Dev Build est la norme** (`expo-dev-client` installé) — plus Expo Go.
> ⚠️ **Mélange SDK 54/55 NON résolu** : `expo ~54.0.0` mais `expo-build-properties`/`expo-constants`/`expo-document-picker`/`expo-secure-store` en `^55.0.x` — risque au prebuild/build EAS.

## Commandes
```bash
npm install                 # .npmrc force legacy-peer-deps=true
npm start                   # expo start --clear
npm run ios / android       # expo run:ios / run:android (Dev Build)
npm run lint                # expo lint (ESLint 9 flat config)
npx tsc --noEmit            # typecheck — seul check (aucun framework de test)
eas build --profile development|preview|production --platform ios   # SENTRY_DISABLE_AUTO_UPLOAD=true partout
```

## Persistance — 3 mécanismes, tous obligatoires
1. **`StorageService` + mutex global** : TOUTES les écritures passent par l'unique `writeMutex` (AsyncMutex) — une écriture AsyncStorage directe sur une clé de StorageService réintroduit les races read-modify-write que le mutex élimine (justification en commentaire dans le fichier).
2. **`SchemaMigration`** (service) : version sous `@healthlog/schema_version` (`CURRENT_VERSION=1`), `runMigrations()` appelé dans App.tsx AVANT `loadAll`. **Tout changement de schéma persisté = bump version + step idempotent dans ce registre**, plus seulement une retouche de StorageService.
3. **Notes sensibles (events, profils ET ordonnances)** : `expo-secure-store` via `SecureNotesService` (`entityType: 'event' | 'profile' | 'prescription'`), JAMAIS AsyncStorage — StorageService strippe le champ notes avant chaque setItem. `MAX_NOTE_CHARS=600` est lié à la limite ~2048 octets/clé de SecureStore.
Divers : `useMenstrualStore` écrit AsyncStorage en direct ; lecture des metadata d'events via `utils/safeParse.ts` (convention pour toute nouvelle lecture) ; `constants/limits.ts` centralise les caps techniques (`MAX_NOTIFICATIONS_PER_REMINDER=60` — plafond iOS 64 notifs pendantes, re-planification à chaque lancement ; `RECURRING_HORIZON_DAYS=365` ; `DRAFT_AUTOSAVE_MS=800` ; ⚠️ `MAX_PHOTOS_PER_EVENT=5` y est **mort** — le vrai cap est le défaut `maxPhotos = 5` en dur dans `PhotoPicker.tsx`, la prop n'est jamais passée).

## Structure
- `src/screens/` = 17 (dont `LockScreen` — verrou **Face ID** : `expo-local-authentication`, setting `app_lock_enabled` défaut false, re-lock automatique au passage en background).
- `src/services/` = 10 : Storage, SchemaMigration, Notification, Summary, Backup, Draft, PdfExport, Photo, Prescription, SecureNotes.
- `src/stores/` = 3 : useAppStore, useMenstrualStore, usePremiumStore.
- `navigation/RootNavigator.tsx` : 6 onglets (Accueil, Profils, Historique, Rappels, Ordonnances, Réglages) + 9 écrans stack. Onboarding conditionnel si `settings.legal_accepted` faux.
- `types/index.ts` : `EventType` = 12 valeurs. Ajouter un type d'event = types + `EventForm` (+ éventuel catalogue de chips dans `constants/*Catalog.ts` — symptom/mood/sleep/digestion/appetite) + `EventCard` + `SummaryService`.
- Config = `app.json` statique (pas d'app.config.ts).

## Pièges
- **Sentry volontairement bridé (données de santé)** : `tracesSampleRate 0`, `sendDefaultPii false`, `beforeBreadcrumb` supprime TOUS les breadcrumbs console, `beforeSend` strip `event.user` + `contexts.state` + tronque à 300 chars. **Ne jamais ajouter de `Sentry.setContext`/breadcrumb avec du contenu utilisateur.** Init dans App.tsx uniquement, `enabled: !__DEV__`.
- **Premium : AUCUNE feature réellement verrouillée.** Le bandeau Réglages promet « Profils illimités · Export PDF · Sauvegarde complète » mais backup/restore/export PDF ne testent jamais `isPremium` — marketing sans enforcement (le copy ne promet plus de chiffrement depuis 86b55af, et de fait les backups ZIP ne sont **pas chiffrés**). Le flux d'achat RevenueCat, lui, est réel (PaywallScreen purchase/restore, offres monthly/annual/lifetime, entitlement `premium`). Toute mise en place d'un vrai gating = décision produit Maxime, pas une initiative.
- **Thème « Calm Medical »** (`src/utils/theme.ts`) : fond crème `#FBF8F3`, primary sauge `#3A6E5F`, accent terra `#C97A6A` ; splash/icônes en terracotta `#A35E50` (app.json). L'ancien blanc/bleu-marine et la palette beige/corail sont morts (les `#FF6B6B` restants sont fonctionnels, pas des vestiges : échelle de sévérité `INTENSITY_COLORS` dans healthColors.ts et palette d'avatars `PROFILE_COLORS` dans types/index.ts).
- Backups ZIP versionnés : écriture v3, import accepte v1/v2/v3, restore avec choix remplacer/fusionner + double confirmation destructive. RevenueCat : `EXPO_PUBLIC_REVENUECAT_IOS_KEY` lue par usePremiumStore mais **absente de `.env.example`** (incomplet) ; garde isExpoGo conservée en défense.

## Repères
EAS projectId `3aaf9d10-ef57-4233-9b2e-0441628a1568`. Submit iOS : ascAppId `6764234021` (eas.json). `.env.example` : vars Sentry (DSN, AUTH_TOKEN, ORG=2mldigital, PROJECT=healthlog) — y ajouter la clé RevenueCat à l'occasion.
