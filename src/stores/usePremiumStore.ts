// src/stores/usePremiumStore.ts

import Constants from 'expo-constants';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';
import { create } from 'zustand';
import { useAppStore } from './useAppStore';

const ENTITLEMENT_ID = 'premium';
const RC_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

const isExpoGo =
  (Constants.appOwnership as string) === 'expo' ||
  Constants.executionEnvironment === 'storeClient';

// Module-level reference to the listener function — kept for the full session.
// Stored so we can deregister it before re-registering if init() is called twice.
let _listenerFn: ((info: CustomerInfo) => void) | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPremiumFromInfo(info: CustomerInfo): boolean {
  return !!info.entitlements.active[ENTITLEMENT_ID];
}

// Only writes to AsyncStorage if the value actually changed.
function syncWithAppStore(newIsPremium: boolean): void {
  const current = useAppStore.getState().settings.premium;
  if (current !== newIsPremium) {
    // Fire-and-forget — sync is best-effort, not blocking
    useAppStore.getState().updateSettings({ premium: newIsPremium }).catch(() => {});
  }
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface PremiumStore {
  isPremium: boolean;
  isLoading: boolean;
  offerings: PurchasesOfferings | null;
  customerInfo: CustomerInfo | null;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const usePremiumStore = create<PremiumStore>((set) => ({
  isPremium: false,
  isLoading: false,
  offerings: null,
  customerInfo: null,

  // ── init ──────────────────────────────────────────────────────────────────

  init: async () => {
    if (isExpoGo) {
      console.warn('[RC] Skipping init in Expo Go — use a dev build for RevenueCat features');
      return;
    }
    if (!RC_API_KEY) {
      console.warn('[RC] EXPO_PUBLIC_REVENUECAT_IOS_KEY is not set — skipping RevenueCat init');
      return;
    }

    set({ isLoading: true });
    try {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
      Purchases.configure({ apiKey: RC_API_KEY });

      // Register live listener — fires on any purchase/restore/subscription change.
      // Deregister stale listener first if init is called more than once.
      if (_listenerFn) Purchases.removeCustomerInfoUpdateListener(_listenerFn);
      _listenerFn = (info: CustomerInfo) => {
        const isPremium = isPremiumFromInfo(info);
        set({ customerInfo: info, isPremium });
        syncWithAppStore(isPremium);
      };
      Purchases.addCustomerInfoUpdateListener(_listenerFn);

      // Fetch initial state in parallel
      const [info, offerings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);

      const isPremium = isPremiumFromInfo(info);
      set({ customerInfo: info, offerings, isPremium, isLoading: false });
      syncWithAppStore(isPremium);
    } catch (e) {
      console.warn('[RC] Init error:', e);
      set({ isLoading: false });
    }
  },

  // ── refresh ───────────────────────────────────────────────────────────────

  refresh: async () => {
    if (isExpoGo || !RC_API_KEY) return;
    try {
      const info = await Purchases.getCustomerInfo();
      const isPremium = isPremiumFromInfo(info);
      set({ customerInfo: info, isPremium });
      syncWithAppStore(isPremium);
    } catch (e) {
      console.warn('[RC] Refresh error:', e);
    }
  },

  // ── purchasePackage ───────────────────────────────────────────────────────
  // Handles user cancel silently. All other errors propagate to the caller.

  purchasePackage: async (pkg) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPremium = isPremiumFromInfo(customerInfo);
      set({ customerInfo, isPremium });
      syncWithAppStore(isPremium);
    } catch (e) {
      // RC throws errors with a non-typed `userCancelled` boolean property.
      if (e && typeof e === 'object' && 'userCancelled' in e && (e as { userCancelled?: boolean }).userCancelled) return;
      throw e;
    }
  },

  // ── restorePurchases ──────────────────────────────────────────────────────
  // Errors propagate to the caller.

  restorePurchases: async () => {
    const info = await Purchases.restorePurchases();
    const isPremium = isPremiumFromInfo(info);
    set({ customerInfo: info, isPremium });
    syncWithAppStore(isPremium);
  },
}));
