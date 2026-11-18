import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  buildSummaryLines,
  createInitialState,
  ENCOUNTER_FLAGS,
  HOME_FACILITY,
} from '../data/seedData';
import {
  API_BASE,
  apiRequest,
  BootstrapResponse,
  exchangeMobileAuthCode,
  getMemoryIdToken,
  setMemoryIdToken,
} from '../lib/api';
import {
  clearPersistedJson,
  closeExternalAuthBrowser,
  initCapacitorShell,
  isNativeCapacitor,
  loadPersistedJson,
  openExternalAuthUrl,
  playAlertBeep,
  savePersistedJson,
  subscribeAuthDeepLink,
  subscribeBackButton,
  subscribeNetworkChanges,
  triggerHaptic,
} from '../lib/capacitor';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  CareSyncState,
  DashboardLevelKey,
  Encounter,
  FacilityInfo,
  Patient,
  Position,
  ProfileTab,
  Referral,
  Role,
  ScreenId,
  StaffMember,
  ThemePreference,
} from '../types/caresync';

const ROLE_GATED_SCREENS = new Set<ScreenId>([
  'profile',
  'hist',
  'shr',
  'encs',
  'sel',
  'opd',
  'gen',
  'imm',
  'ref',
]);

const ACCESS_BY_ROLE: Partial<Record<Role, ScreenId[]>> = {
  lab: ['home', 'tasks', 'tdet'],
  pharm: ['home', 'tasks', 'tdet'],
  asst: ['home', 'stf'],
  admin: ['home', 'adm'],
};

function nowTimeLabel(): string {
  return `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function computeAgeLabel(dob: string): string {
  if (!dob) return '28 years';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return '28 years';
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    years -= 1;
  }
  if (years >= 1) return `${years} ${years === 1 ? 'year' : 'years'}`;
  const months = Math.max(0, (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth()));
  if (months >= 1) return `${months} ${months === 1 ? 'month' : 'months'}`;
  const days = Math.max(0, Math.floor((today.getTime() - birth.getTime()) / 86400000));
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

export interface ModalConfig {
  title: string;
  body: React.ReactNode;
}

interface CareSyncContextValue {
  state: CareSyncState;
  currentScreen: ScreenId;
  currentPatient: Patient;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  modal: ModalConfig | null;
  closeModal: () => void;
  showModal: (modal: ModalConfig) => void;
  toastMessage: string | null;
  toast: (message: string) => void;
  go: (screen: ScreenId, reset?: boolean, overridePatientIndex?: number) => void;
  back: () => void;
  setQuery: (q: string) => void;
  setPatientIndex: (idx: number) => void;
  setProfileTab: (tab: ProfileTab) => void;
  setEncounterType: (type: string) => void;
  setDashboardLevel: (level: DashboardLevelKey) => void;
  setAdminFacility: (fac: string) => void;
  authLoading: boolean;
  authError: string | null;
  signedInEmail: string | null;
  signInWithGoogle: () => Promise<boolean>;
  completeMobileAuthCode: (code: string) => Promise<boolean>;
  loginLocalStaff: (emailOrId: string, preferredPos?: Position) => boolean;
  continueSession: () => Promise<boolean>;
  logout: () => void;
  syncNow: () => void;
  registerPatient: (input: {
    firstName: string;
    surname: string;
    sex: string;
    dob: string;
    phone: string;
    lga: string;
    address: string;
    bloodGroup: string;
    allergy: string;
    nin: string;
    noNin: boolean;
    pin: string;
    nimcVerified: boolean;
  }) => boolean;
  startOrLoadDraft: (type: string) => Encounter;
  updateDraft: (patch: Partial<Encounter>) => void;
  pendingLabsForEncounter: (encounterUid: string) => CareSyncState['lab'];
  sendLabOrder: (tests: string[], cc: string) => boolean;
  saveAndWaitLab: (cc: string, customFields: Record<string, string>) => boolean;
  continueToStage2: (cc: string, customFields: Record<string, string>) => boolean;
  sendPharmacyOrder: (
    meds: string[],
    otherTx: string,
    dx: string,
    cc: string,
    dxm: string,
    out: string,
    customFields: Record<string, string>,
    bypassReason?: string,
  ) => { ok: boolean; needsBypass?: boolean };
  completeEncounter: (input: {
    cc: string;
    dx: string;
    dxm: string;
    out: string;
    customFields: Record<string, string>;
    pendingLabSelection: string[];
    pendingRxSelection: string[];
    pendingTxText: string;
    bypassReason?: string;
  }) => { ok: boolean; needsBypass?: boolean };
  openTask: (kind: 'lab' | 'ph', index: number) => void;
  completeTask: (outcomes: string[]) => boolean;
  openNotification: (notifId: string) => void;
  openOpenEncounter: (encounterUid: string) => void;
  createReferral: (input: { to: string; reason: string; urgency: Referral['ur']; treatmentGiven: string }) => boolean;
  acceptReferral: (referralId: string) => void;
  openReferralOutcome: (referralId: string) => void;
  submitReferralOutcome: (referralId: string, outcome: string, note: string) => void;
  shareHistory: (method: string) => void;
  submitSurveillanceCase: () => void;
  setVerifyField: <K extends keyof CareSyncState['vs']>(key: K, value: CareSyncState['vs'][K]) => void;
  runThumbScan: () => void;
  confirmPinVerification: (pin: string) => boolean;
  confirmSmsVerification: () => void;
  grantEmergencyVerification: (reason: string) => boolean;
  grantQrVerification: () => void;
  toggleMute: () => void;
  toggleNinGate: () => void;
  setTheme: (theme: ThemePreference) => void;
  toggleHighContrast: () => void;
  setLanguage: (lang: CareSyncState['language']) => void;
  switchRegisteredFacility: (facilityName: string) => void;
  registerFacility: (name: string, type: FacilityInfo['type'], lga: string) => boolean;
  toggleStaffFacility: (staffId: string, facilityName: string) => void;
  toggleAssistantFullAccess: () => void;
  setStaffStatus: (staffId: string, status: StaffMember['st']) => void;
  enrollStaff: (name: string, email: string, roleLabel: string) => boolean;
  resetAllData: () => Promise<void>;
  unreadCount: number;
  taskAlertCount: number;
}

const CareSyncContext = createContext<CareSyncContextValue | null>(null);

export const CareSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CareSyncState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  }, []);

  const showModal = useCallback((cfg: ModalConfig) => {
    setModal(cfg);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  // Hydrate persisted offline state & initialize Capacitor plugins
  useEffect(() => {
    let mounted = true;
    initCapacitorShell().catch(() => {});

    loadPersistedJson<Partial<CareSyncState>>()
      .then((saved) => {
        if (!mounted) return;
        if (saved && Array.isArray(saved.pts) && Array.isArray(saved.E)) {
          const base = createInitialState();
          setState({
            ...base,
            ...saved,
            off: typeof navigator !== 'undefined' ? !navigator.onLine : false,
            facilities: Array.isArray(saved.facilities) && saved.facilities.length ? saved.facilities : base.facilities,
            registeredFacilities:
              Array.isArray(saved.registeredFacilities) && saved.registeredFacilities.length
                ? saved.registeredFacilities
                : [saved.fac || base.fac],
            // Always start at splash screen cleanly on cold boot
            stack: ['splash'],
            draftEncounter: null,
            pendingRoute: null,
          });
        }
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Persist changes to Capacitor Preferences / localStorage
  useEffect(() => {
    if (!hydrated) return;
    const toPersist = { ...state, stack: undefined, draftEncounter: undefined, pendingRoute: undefined };
    savePersistedJson(toPersist).catch(() => {});
  }, [state, hydrated]);

  // Apply theme & contrast attributes to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', state.theme);
    }
    if (state.highContrast) {
      root.setAttribute('data-contrast', 'high');
    } else {
      root.removeAttribute('data-contrast');
    }
  }, [state.theme, state.highContrast]);

  const applyBootstrap = useCallback((data: BootstrapResponse, navigateHome: boolean) => {
    setState((prev) => {
      const pos: Position = data.user.pos;
      const nextRole: Role =
        pos === 'creator'
          ? 'admin'
          : pos === 'lab'
            ? 'lab'
            : pos === 'pharm'
              ? 'pharm'
              : pos === 'asst' && !data.user.agr
                ? 'asst'
                : 'nurse';
      const activeFacility = data.user.registeredFacilities.includes(prev.fac)
        ? prev.fac
        : data.user.fac;
      return {
        ...prev,
        off: false,
        pending: 0,
        lastSyncedLabel: nowTimeLabel(),
        pos,
        role: nextRole,
        agr: data.user.agr,
        nm: data.user.name,
        sid: data.user.staffCode,
        fac: activeFacility,
        registeredFacilities: data.user.registeredFacilities,
        facilities: data.facilities.length ? data.facilities : prev.facilities,
        stf: data.stf.length ? data.stf : prev.stf,
        pts: data.pts.length ? data.pts : prev.pts,
        E: data.E,
        lab: data.lab,
        ph: data.ph,
        ref: data.ref,
        nt: data.nt,
        aud: data.aud,
        ...(navigateHome ? { ver: {}, brk: {}, stack: ['home' as ScreenId] } : {}),
      };
    });
  }, []);

  const syncBatchToBackend = useCallback(async () => {
    if (!getMemoryIdToken() || stateRef.current.off) return false;
    const s = stateRef.current;
    const unsyncedEncounters = s.E.filter((e) => !e.sync).map((encounter) => ({
      encounter,
      patientCode: s.pts[encounter.pi]?.id || 'MAK-002431',
    }));
    const queuedReferrals = s.ref
      .filter((r) => r.st === 'Queued')
      .map((referral) => ({
        referral,
        patientCode: s.pts[referral.pi]?.id || 'MAK-002431',
      }));
    await apiRequest('/api/sync', {
      method: 'POST',
      body: {
        patientsList: s.pts,
        encountersList: unsyncedEncounters,
        referralsList: queuedReferrals,
        facilitiesList: s.facilities,
        staffList: s.pos === 'oc' ? s.stf : [],
        facility: s.fac,
      },
    });
    const fresh = await apiRequest<BootstrapResponse>('/api/bootstrap');
    applyBootstrap(fresh, false);
    return true;
  }, [applyBootstrap]);

  // Keep in-memory Firebase ID token synchronized with auth session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMemoryIdToken(null);
        setSignedInEmail(null);
        return;
      }
      setSignedInEmail(user.email || null);
      try {
        const token = await user.getIdToken();
        setMemoryIdToken(token);
      } catch {
        setMemoryIdToken(null);
      }
    });
    return () => unsub();
  }, []);

  // Automatically track real network connection & sync offline queue on reconnect
  useEffect(() => {
    return subscribeNetworkChanges((connected) => {
      if (!connected) {
        setState((prev) => {
          if (prev.off) return prev;
          return { ...prev, off: true };
        });
      } else {
        const hadOfflineOrPending =
          stateRef.current.off ||
          stateRef.current.pending > 0 ||
          stateRef.current.ref.some((r) => r.st === 'Queued');
        if (!hadOfflineOrPending) return;

        setState((prev) => ({ ...prev, off: false }));
        if (getMemoryIdToken()) {
          syncBatchToBackend()
            .then(() => {
              toast('Connection restored. Queued records synced to server.');
            })
            .catch(() => {
              // Keep queued changes locally if backend is unreachable
            });
        }
      }
    });
  }, [syncBatchToBackend, toast]);

  const currentScreen = state.stack[state.stack.length - 1] || 'splash';
  const currentPatient = state.pts[state.cur] || state.pts[0];

  const pendingLabsForEncounter = useCallback(
    (encounterUid: string) => stateRef.current.lab.filter((t) => t.encounterUid === encounterUid),
    [],
  );

  const readyEncounters = useMemo(
    () => state.E.filter((e) => e.status === 'open' && !state.lab.some((t) => t.encounterUid === e.uid)),
    [state.E, state.lab],
  );

  const otherNotifications = useMemo(
    () =>
      state.nt.filter(
        (n) => !(n.k === 'lab' && n.encounterUid && state.E.find((e) => e.uid === n.encounterUid)?.status === 'open'),
      ),
    [state.nt, state.E],
  );

  const unreadCount = useMemo(
    () => readyEncounters.length + otherNotifications.filter((n) => !n.read).length,
    [readyEncounters.length, otherNotifications],
  );

  const taskAlertCount = useMemo(() => {
    if (state.role === 'admin' || state.role === 'asst') return 0;
    if (state.role === 'lab') return state.lab.length;
    if (state.role === 'pharm') return state.ph.length;
    return unreadCount;
  }, [state.role, state.lab.length, state.ph.length, unreadCount]);

  // Periodic alert beep when unread tasks/results await
  useEffect(() => {
    if (!taskAlertCount || currentScreen === 'login' || currentScreen === 'splash') return;
    if (currentScreen === 'home') {
      playAlertBeep(state.mute);
    }
    const id = window.setInterval(() => {
      const scr = stateRef.current.stack[stateRef.current.stack.length - 1];
      if (scr !== 'login' && scr !== 'splash') {
        playAlertBeep(stateRef.current.mute);
      }
    }, 12000);
    return () => window.clearInterval(id);
  }, [taskAlertCount, currentScreen, state.mute]);

  const go = useCallback(
    (screen: ScreenId, reset = false, overridePatientIndex?: number) => {
      const s = stateRef.current;
      if (screen === 'adm' && s.pos !== 'creator') {
        toast('Not available for your role');
        return;
      }
      if (screen === 'stf' && s.pos !== 'oc' && s.pos !== 'asst') {
        toast('Not available for your role');
        return;
      }
      const allowed = ACCESS_BY_ROLE[s.role];
      if (allowed && screen !== 'login' && screen !== 'splash' && !allowed.includes(screen)) {
        toast('Not available for your role');
        return;
      }

      const targetPi =
        overridePatientIndex !== undefined
          ? overridePatientIndex
          : screen === 'imm' && s.role === 'nurse'
            ? 1
            : s.cur;

      // NIN verification gate when enabled
      if (
        s.ninEnabled &&
        ROLE_GATED_SCREENS.has(screen) &&
        s.role !== 'pharm' &&
        !s.ver[targetPi]
      ) {
        setState((prev) => ({
          ...prev,
          cur: targetPi,
          pendingRoute: { screen, reset },
          vs: {
            pi: targetPi,
            conn: 'USB cable',
            fin: 'Right thumb',
            sim: 'Match',
            ph: 'idle',
            msg: '',
          },
          stack: [...prev.stack, 'verify'],
        }));
        window.scrollTo({ top: 0, behavior: 'auto' });
        return;
      }

      setState((prev) => ({
        ...prev,
        cur: targetPi,
        draftEncounter: screen === 'sel' ? null : prev.draftEncounter,
        stack: reset ? [screen] : [...prev.stack, screen],
      }));
      triggerHaptic(true).catch(() => {});
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [toast],
  );

  const back = useCallback(() => {
    setState((prev) => {
      if (prev.stack.length <= 1) return prev;
      return { ...prev, stack: prev.stack.slice(0, -1) };
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  // Native Android hardware back button handling
  useEffect(() => {
    return subscribeBackButton(() => {
      if (drawerOpen) {
        setDrawerOpen(false);
        return true;
      }
      if (modal) {
        setModal(null);
        return true;
      }
      if (stateRef.current.stack.length > 1) {
        back();
        return true;
      }
      return false;
    });
  }, [drawerOpen, modal, back]);

  const completeMobileAuthCode = useCallback(
    async (code: string): Promise<boolean> => {
      const clean = code.trim().toUpperCase();
      if (!clean) {
        toast('Enter the sign-in code from your browser');
        return false;
      }
      setAuthError(null);
      setAuthLoading(true);
      try {
        const { idToken, accessToken } = await exchangeMobileAuthCode(clean);
        const cred = GoogleAuthProvider.credential(idToken || null, accessToken || null);
        const result = await signInWithCredential(auth, cred);
        const token = await result.user.getIdToken();
        setMemoryIdToken(token);
        setSignedInEmail(result.user.email || null);
        const data = await apiRequest<BootstrapResponse>('/api/bootstrap');
        applyBootstrap(data, true);
        triggerHaptic(false).catch(() => {});
        return true;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unable to complete mobile Google sign-in.';
        setAuthError(msg);
        toast(msg);
        return false;
      } finally {
        setAuthLoading(false);
      }
    },
    [applyBootstrap, toast],
  );

  useEffect(() => {
    return subscribeAuthDeepLink((code) => {
      closeExternalAuthBrowser().catch(() => {});
      void completeMobileAuthCode(code);
    });
  }, [completeMobileAuthCode]);

  const loginLocalStaff = useCallback(
    (emailOrId: string, preferredPos?: Position): boolean => {
      setAuthError(null);
      const s = stateRef.current;
      const q = emailOrId.trim().toLowerCase();

      if (q === 'creator' || q === 'creator@makset.ng' || (!q && preferredPos === 'creator')) {
        setState((prev) => ({
          ...prev,
          pos: 'creator',
          role: 'admin',
          nm: 'App Creator',
          sid: 'CRE-0001',
          registeredFacilities: prev.facilities.map((f) => f.name),
          ver: {},
          brk: {},
          stack: ['home'],
        }));
        triggerHaptic(false).catch(() => {});
        return true;
      }

      const match = q
        ? s.stf.find((st) => st.e.toLowerCase() === q || st.id.toLowerCase() === q)
        : preferredPos
          ? s.stf.find(
              (st) =>
                st.role === preferredPos &&
                (st.fac === s.fac || st.facilities?.includes(s.fac)),
            ) || s.stf.find((st) => st.role === preferredPos)
          : undefined;

      if (!match) {
        const msg =
          'Staff email or ID not found on this device. Select a facility role chip below, ask your Officer in Charge to register you, or use Google Sign-In.';
        setAuthError(msg);
        toast(msg);
        return false;
      }

      if (match.st !== 'Active') {
        const msg =
          match.role === 'oc' && match.st === 'Blocked'
            ? 'Access blocked by the administrator.'
            : match.st === 'Terminated'
              ? 'Your access has been terminated. Contact your officer in charge.'
              : 'Your access is suspended. Contact your officer in charge.';
        setAuthError(msg);
        toast(msg);
        return false;
      }

      const mappedRole: Role =
        match.role === 'lab'
          ? 'lab'
          : match.role === 'pharm'
            ? 'pharm'
            : match.role === 'asst' && !s.agr
              ? 'asst'
              : 'nurse';

      const regFacilities = Array.from(new Set([match.fac, ...(match.facilities || [])]));
      setState((prev) => ({
        ...prev,
        pos: match.role,
        role: mappedRole,
        nm: match.n,
        sid: match.id,
        fac: regFacilities.includes(prev.fac) ? prev.fac : match.fac,
        registeredFacilities: regFacilities,
        ver: {},
        brk: {},
        stack: ['home'],
      }));
      triggerHaptic(false).catch(() => {});
      return true;
    },
    [toast],
  );

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setAuthError(null);
    if (isNativeCapacitor()) {
      setAuthLoading(true);
      try {
        await openExternalAuthUrl(`${API_BASE}/?mobile_auth=1`);
        toast('Complete Google sign-in in Chrome to return to MaKSET.');
        return true;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unable to open browser for Google sign-in.';
        setAuthError(msg);
        toast(msg);
        return false;
      } finally {
        setAuthLoading(false);
      }
    }
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      setMemoryIdToken(token);
      setSignedInEmail(result.user.email || null);
      const data = await apiRequest<BootstrapResponse>('/api/bootstrap');
      applyBootstrap(data, true);
      triggerHaptic(false).catch(() => {});
      return true;
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : 'Unable to sign in with Google.';
      const msg = /unauthorized-domain|requested action is invalid/i.test(raw)
        ? 'Google Sign-In is only available on the published web app or updated APK. Use Staff Sign-In above for offline/facility access.'
        : raw;
      setAuthError(msg);
      toast(msg);
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, [applyBootstrap, toast]);

  const continueSession = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) {
      return signInWithGoogle();
    }
    setAuthError(null);
    setAuthLoading(true);
    try {
      const token = await auth.currentUser.getIdToken(true);
      setMemoryIdToken(token);
      const data = await apiRequest<BootstrapResponse>('/api/bootstrap');
      applyBootstrap(data, true);
      triggerHaptic(false).catch(() => {});
      return true;
    } catch (error: unknown) {
      if (stateRef.current.off) {
        setState((prev) => ({ ...prev, stack: ['home'] }));
        toast('Opened offline session using saved device records.');
        return true;
      }
      const msg = error instanceof Error ? error.message : 'Unable to restore session.';
      setAuthError(msg);
      toast(msg);
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, [applyBootstrap, signInWithGoogle, toast]);

  const logout = useCallback(() => {
    setDrawerOpen(false);
    setMemoryIdToken(null);
    setSignedInEmail(null);
    firebaseSignOut(auth).catch(() => {});
    setState((prev) => ({
      ...prev,
      ver: {},
      brk: {},
      draftEncounter: null,
      stack: ['login'],
    }));
  }, []);

  const syncNow = useCallback(() => {
    if (stateRef.current.off) {
      toast('No internet connection. Records stay saved locally until online.');
      return;
    }
    if (!getMemoryIdToken()) {
      toast('Sign in with Google to sync records to the server.');
      return;
    }
    syncBatchToBackend()
      .then(() => {
        toast('All records synced');
      })
      .catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : 'Sync failed. Please try again.';
        toast(msg);
      });
  }, [syncBatchToBackend, toast]);

  const registerPatient: CareSyncContextValue['registerPatient'] = useCallback(
    (input) => {
      const fn = input.firstName.trim();
      const sn = input.surname.trim();
      if (!fn || !sn) {
        toast('Enter first name and surname');
        return false;
      }
      if (stateRef.current.ninEnabled && !input.noNin && input.nin.trim().length !== 11) {
        toast('Enter the 11-digit NIN or choose No NIN yet');
        return false;
      }
      const fullName = `${fn} ${sn}`;
      const duplicate = stateRef.current.pts.find(
        (p) => p.n.toLowerCase() === fullName.toLowerCase() && (p.phone === input.phone || p.dob === input.dob),
      );
      if (duplicate) {
        toast(`Duplicate found on this device: ${duplicate.n} (${duplicate.id})`);
        return false;
      }

      const newIndex = stateRef.current.pts.length;
      const newPatient: Patient = {
        n: fullName,
        s: input.sex || 'Female',
        a: computeAgeLabel(input.dob),
        id: `MAK-0024${newIndex + 10}`,
        al: input.allergy.trim(),
        bg: input.bloodGroup || 'O+',
        nin: input.noNin ? '' : input.nin.trim(),
        idv: input.nimcVerified && !input.noNin ? 'Verified' : 'Not verified',
        pin: input.pin.trim() || '1234',
        phone: input.phone.trim(),
        lga: input.lga,
        address: input.address.trim(),
        dob: input.dob,
      };

      const auditEntry = `${stateRef.current.nm} registered ${fullName}${input.noNin ? ' (temporary ID)' : ''}`;
      const isOnline = !stateRef.current.off && Boolean(getMemoryIdToken());

      setState((prev) => ({
        ...prev,
        pts: [...prev.pts, newPatient],
        cur: newIndex,
        ver: { ...prev.ver, [newIndex]: true },
        pending: isOnline ? prev.pending : prev.pending + 1,
        tab: 'Summary',
        aud: [auditEntry, ...prev.aud],
        stack: ['profile'],
      }));

      if (isOnline) {
        apiRequest('/api/patients', {
          method: 'POST',
          body: { patient: newPatient, auditEntry },
        })
          .then(() => {
            setState((prev) => ({ ...prev, synced: prev.synced + 1, lastSyncedLabel: nowTimeLabel() }));
            toast('Patient saved to server.');
          })
          .catch(() => {
            setState((prev) => ({ ...prev, pending: prev.pending + 1 }));
            toast('Patient saved locally. Pending sync.');
          });
      } else {
        toast('Patient saved on this device. Pending sync.');
      }
      triggerHaptic(false).catch(() => {});
      return true;
    },
    [toast],
  );

  const startOrLoadDraft = useCallback((type: string): Encounter => {
    const s = stateRef.current;
    if (s.draftEncounter && s.draftEncounter.pi === s.cur && s.draftEncounter.t === type) {
      return s.draftEncounter;
    }
    const fresh: Encounter = {
      uid: `enc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pi: s.cur,
      t: type,
      time: nowTimeLabel(),
      by: s.nm,
      cc: '',
      labs: [],
      res: [],
      dx: '',
      dxm: '',
      rx: [],
      rxs: '',
      out: '',
      notes: '',
      sync: false,
      stage: 1,
    };
    setState((prev) => ({ ...prev, draftEncounter: fresh }));
    return fresh;
  }, []);

  const updateDraft = useCallback((patch: Partial<Encounter>) => {
    setState((prev) => {
      if (!prev.draftEncounter) return prev;
      return { ...prev, draftEncounter: { ...prev.draftEncounter, ...patch } };
    });
  }, []);

  const sendLabOrder = useCallback(
    (tests: string[], cc: string): boolean => {
      if (!tests.length) {
        toast('Select at least one test');
        return false;
      }
      const s = stateRef.current;
      const draft = s.draftEncounter;
      if (!draft) return false;
      const mergedLabs = Array.from(new Set([...draft.labs, ...tests]));
      const updatedDraft: Encounter = { ...draft, cc, labs: mergedLabs };
      const pName = s.pts[s.cur]?.n || 'Patient';
      const newTask = {
        id: `lab-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        p: pName,
        t: tests.join(', '),
        items: [...tests],
        encounterUid: updatedDraft.uid,
      };
      setState((prev) => ({
        ...prev,
        draftEncounter: updatedDraft,
        lab: [newTask, ...prev.lab],
      }));
      if (!s.off && getMemoryIdToken()) {
        apiRequest('/api/tasks', {
          method: 'POST',
          body: { kind: 'lab', task: newTask, facility: s.fac },
        }).catch(() => {});
      }
      toast('Lab order sent. The lab is alerted.');
      return true;
    },
    [toast],
  );

  const saveAndWaitLab = useCallback(
    (cc: string, customFields: Record<string, string>): boolean => {
      const s = stateRef.current;
      const draft = s.draftEncounter;
      if (!draft) return false;
      const hasPending = s.lab.some((t) => t.encounterUid === draft.uid);
      if (!hasPending) {
        toast('No lab result is pending. Use Complete.');
        return false;
      }
      const isOnline = !s.off && Boolean(getMemoryIdToken());
      const saved: Encounter = {
        ...draft,
        cc,
        x: { ...(draft.x || {}), ...customFields },
        status: 'open',
        stage: 1,
        sync: isOnline,
      };
      setState((prev) => {
        const exists = prev.E.some((e) => e.uid === saved.uid);
        return {
          ...prev,
          E: exists ? prev.E.map((e) => (e.uid === saved.uid ? saved : e)) : [...prev.E, saved],
          draftEncounter: null,
          pending: isOnline ? prev.pending : prev.pending + 1,
          stack: ['home'],
        };
      });
      if (isOnline) {
        const patientCode = s.pts[saved.pi]?.id || 'MAK-002431';
        apiRequest('/api/encounters', {
          method: 'POST',
          body: { encounter: saved, patientCode, facility: s.fac },
        }).catch(() => {
          setState((prev) => ({
            ...prev,
            E: prev.E.map((e) => (e.uid === saved.uid ? { ...e, sync: false } : e)),
            pending: prev.pending + 1,
          }));
        });
      }
      toast('Saved. You will be notified when the result is ready.');
      return true;
    },
    [toast],
  );

  const continueToStage2 = useCallback(
    (cc: string, customFields: Record<string, string>): boolean => {
      if (!cc.trim()) {
        toast('Enter the complaint first');
        return false;
      }
      setState((prev) => {
        if (!prev.draftEncounter) return prev;
        return {
          ...prev,
          draftEncounter: {
            ...prev.draftEncounter,
            cc,
            x: { ...(prev.draftEncounter.x || {}), ...customFields },
            stage: 2,
          },
        };
      });
      return true;
    },
    [toast],
  );

  const sendPharmacyOrder: CareSyncContextValue['sendPharmacyOrder'] = useCallback(
    (meds, otherTx, dx, cc, dxm, out, customFields, bypassReason) => {
      const list = [...meds];
      if (otherTx.trim()) list.push(otherTx.trim());
      if (!list.length) {
        toast('Select a medicine first');
        return { ok: false };
      }
      const s = stateRef.current;
      const draft = s.draftEncounter;
      if (!draft) return { ok: false };
      const flags = ENCOUNTER_FLAGS[draft.t] ?? 'LDR';
      if (flags.includes('D') && !dx.trim()) {
        toast('Enter the diagnosis before sending to pharmacy');
        return { ok: false };
      }
      const hasPending = s.lab.some((t) => t.encounterUid === draft.uid);
      const effectiveBypass = bypassReason?.trim() || draft.bypass;
      if (hasPending && !effectiveBypass) {
        return { ok: false, needsBypass: true };
      }

      const mergedRx = Array.from(new Set([...draft.rx, ...list]));
      const updatedDraft: Encounter = {
        ...draft,
        cc,
        dx,
        dxm,
        out,
        x: { ...(draft.x || {}), ...customFields },
        rx: mergedRx,
        bypass: effectiveBypass,
      };
      const pName = s.pts[s.cur]?.n || 'Patient';
      const newTask = {
        id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        p: pName,
        t: list.join(', '),
        items: list,
        encounterUid: updatedDraft.uid,
      };
      setState((prev) => ({
        ...prev,
        draftEncounter: updatedDraft,
        ph: [newTask, ...prev.ph],
      }));
      if (!s.off && getMemoryIdToken()) {
        apiRequest('/api/tasks', {
          method: 'POST',
          body: { kind: 'ph', task: newTask, facility: s.fac },
        }).catch(() => {});
      }
      toast('Sent to pharmacy. Pharmacy is alerted.');
      return { ok: true };
    },
    [toast],
  );

  const completeEncounter: CareSyncContextValue['completeEncounter'] = useCallback(
    (input) => {
      const s = stateRef.current;
      const draft = s.draftEncounter;
      if (!draft) return { ok: false };
      if (input.pendingLabSelection.length) {
        toast('Tap Send lab order for the selected tests first');
        return { ok: false };
      }
      if (input.pendingRxSelection.length || input.pendingTxText.trim()) {
        toast('Tap Send pharmacy order for the selected medicines first');
        return { ok: false };
      }
      if ((draft.t === 'OPD' || draft.t === 'Inpatient') && !input.dx.trim()) {
        toast('Enter the diagnosis before completing');
        return { ok: false };
      }
      const hasPending = s.lab.some((t) => t.encounterUid === draft.uid);
      const effectiveBypass = input.bypassReason?.trim() || draft.bypass;
      if (hasPending && !effectiveBypass) {
        return { ok: false, needsBypass: true };
      }

      const flags = ENCOUNTER_FLAGS[draft.t] ?? 'LDR';
      const isOnline = !s.off && Boolean(getMemoryIdToken());
      const finalized: Encounter = {
        ...draft,
        cc: input.cc,
        dx: input.dx.trim() || (flags.includes('D') ? 'Not recorded' : ''),
        dxm: input.dxm,
        out: input.out,
        x: { ...(draft.x || {}), ...input.customFields },
        bypass: effectiveBypass,
        status: '',
        sync: isOnline,
      };

      let message = isOnline ? 'Encounter saved to server.' : 'Saved on this device. Pending sync.';
      let newborn: Patient | null = null;
      if (finalized.t === 'Labour/Delivery' && finalized.x?.['Newborn outcome'] === 'Live birth') {
        const mother = s.pts[s.cur];
        newborn = {
          n: `Baby of ${mother?.n || 'Mother'}`,
          s: finalized.x['Newborn sex'] || 'Unknown',
          a: '0 days',
          id: `MAK-0024${s.pts.length + 10}`,
          al: '',
          bg: 'Newborn',
        };
        message = 'Saved. A linked newborn record was created.';
      }

      setState((prev) => {
        const exists = prev.E.some((e) => e.uid === finalized.uid);
        return {
          ...prev,
          E: exists ? prev.E.map((e) => (e.uid === finalized.uid ? finalized : e)) : [...prev.E, finalized],
          pts: newborn ? [...prev.pts, newborn] : prev.pts,
          draftEncounter: null,
          tab: 'History',
          pending: isOnline ? prev.pending : prev.pending + 1,
          synced: isOnline ? prev.synced + 1 : prev.synced,
          stack: ['profile'],
        };
      });

      if (isOnline) {
        const patientCode = s.pts[finalized.pi]?.id || 'MAK-002431';
        (async () => {
          if (newborn) {
            await apiRequest('/api/patients', { method: 'POST', body: { patient: newborn } });
          }
          await apiRequest('/api/encounters', {
            method: 'POST',
            body: { encounter: finalized, patientCode, facility: s.fac },
          });
        })().catch(() => {
          setState((prev) => ({
            ...prev,
            E: prev.E.map((e) => (e.uid === finalized.uid ? { ...e, sync: false } : e)),
            pending: prev.pending + 1,
          }));
        });
      }

      toast(message);
      triggerHaptic(false).catch(() => {});
      return { ok: true };
    },
    [toast],
  );

  const openTask = useCallback((kind: 'lab' | 'ph', index: number) => {
    setState((prev) => ({
      ...prev,
      taskKind: kind,
      taskIndex: index,
      stack: [...prev.stack, 'tdet'],
    }));
  }, []);

  const completeTask = useCallback(
    (outcomes: string[]): boolean => {
      const s = stateRef.current;
      const list = s.taskKind === 'lab' ? s.lab : s.ph;
      const task = list[s.taskIndex];
      if (!task) return false;
      const isLab = s.taskKind === 'lab';
      const isOnline = !s.off && Boolean(getMemoryIdToken());
      const targetEnc = task.encounterUid ? s.E.find((e) => e.uid === task.encounterUid) : undefined;
      const notifId = `nt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      const notifTxt = isLab ? `Result: ${outcomes.join('; ')}` : `Pharmacy: ${outcomes.join('; ')}`;
      const patientCode = targetEnc ? s.pts[targetEnc.pi]?.id || 'MAK-002431' : 'MAK-002431';
      const pName = targetEnc ? s.pts[targetEnc.pi]?.n || task.p : task.p;

      setState((prev) => {
        const nextLab = isLab ? prev.lab.filter((_, idx) => idx !== prev.taskIndex) : prev.lab;
        const nextPh = !isLab ? prev.ph.filter((_, idx) => idx !== prev.taskIndex) : prev.ph;
        let nextE = prev.E;
        let nextNt = prev.nt;

        if (task.encounterUid && targetEnc) {
          nextE = prev.E.map((e) => {
            if (e.uid !== task.encounterUid) return e;
            return {
              ...e,
              res: isLab ? [...e.res, ...outcomes] : e.res,
              rxs: !isLab ? (e.rxs ? `${e.rxs}; ` : '') + outcomes.join('; ') : e.rxs,
              sync: isOnline,
            };
          });
          nextNt = [
            {
              id: notifId,
              encounterUid: targetEnc.uid,
              pi: targetEnc.pi,
              k: isLab ? 'lab' : 'ph',
              p: pName,
              txt: notifTxt,
              read: false,
            },
            ...prev.nt,
          ];
        }

        return {
          ...prev,
          lab: nextLab,
          ph: nextPh,
          E: nextE,
          nt: nextNt,
          pending: isOnline ? prev.pending : prev.pending + 1,
          stack: prev.stack.length > 1 ? prev.stack.slice(0, -1) : prev.stack,
        };
      });

      if (isOnline) {
        apiRequest('/api/tasks/complete', {
          method: 'POST',
          body: {
            kind: isLab ? 'lab' : 'ph',
            taskUid: task.id,
            encounterUid: task.encounterUid,
            outcomes,
            notif: targetEnc
              ? { id: notifId, patientCode, patientName: pName, txt: notifTxt, facility: s.fac }
              : undefined,
          },
        }).catch(() => {});
      }

      toast(isLab ? 'Results sent. The nurse is notified.' : 'Dispensing recorded. The nurse is notified.');
      triggerHaptic(false).catch(() => {});
      return true;
    },
    [toast],
  );

  const openOpenEncounter = useCallback((encounterUid: string) => {
    const s = stateRef.current;
    const enc = s.E.find((e) => e.uid === encounterUid);
    if (!enc) return;
    const hasPend = s.lab.some((t) => t.encounterUid === enc.uid);
    const updatedEnc: Encounter = { ...enc, stage: hasPend ? 1 : 2 };
    setState((prev) => ({
      ...prev,
      cur: enc.pi,
      g: enc.t,
      draftEncounter: updatedEnc,
      nt: prev.nt.map((n) => (n.encounterUid === enc.uid ? { ...n, read: true } : n)),
      stack: [...prev.stack, enc.t === 'OPD' ? 'opd' : 'gen'],
    }));
  }, []);

  const openNotification = useCallback(
    (notifId: string) => {
      const n = stateRef.current.nt.find((item) => item.id === notifId);
      if (!n) return;
      if (n.k === 'ph' || n.k === 'ref') {
        setState((prev) => ({
          ...prev,
          cur: n.pi,
          tab: 'History',
          nt: prev.nt.map((item) => (item.id === notifId ? { ...item, read: true } : item)),
          stack: [...prev.stack, 'profile'],
        }));
        return;
      }
      if (n.encounterUid) {
        const enc = stateRef.current.E.find((e) => e.uid === n.encounterUid);
        if (enc?.status === 'open') {
          openOpenEncounter(enc.uid);
          return;
        }
      }
      setState((prev) => ({
        ...prev,
        cur: n.pi,
        tab: 'History',
        nt: prev.nt.map((item) => (item.id === notifId ? { ...item, read: true } : item)),
        stack: [...prev.stack, 'profile'],
      }));
    },
    [openOpenEncounter],
  );

  const createReferral: CareSyncContextValue['createReferral'] = useCallback(
    ({ to, reason, urgency, treatmentGiven }) => {
      if (!reason.trim()) {
        toast('Enter the reason for referral');
        return false;
      }
      const s = stateRef.current;
      const p = s.pts[s.cur];
      const isOnline = !s.off && Boolean(getMemoryIdToken());
      const st: Referral['st'] = isOnline ? 'Delivered' : 'Queued';
      const newRef: Referral = {
        id: `REF-${1001 + s.ref.length}-${Date.now().toString().slice(-3)}`,
        pi: s.cur,
        p: p.n,
        from: s.fac,
        to,
        reason: reason.trim(),
        ur: urgency,
        tx: treatmentGiven.trim() || 'None recorded',
        sum: buildSummaryLines(s.cur, s.pts, s.E),
        st,
        time: nowTimeLabel(),
        fb: '',
        w: `${st} to ${to}`,
      };
      setState((prev) => ({
        ...prev,
        ref: [newRef, ...prev.ref],
        lastReferralId: newRef.id,
        pending: isOnline ? prev.pending : prev.pending + 1,
        stack: [...prev.stack, 'note'],
      }));
      if (isOnline) {
        apiRequest('/api/referrals', {
          method: 'POST',
          body: { referral: newRef, patientCode: p.id },
        }).catch(() => {
          setState((prev) => ({
            ...prev,
            ref: prev.ref.map((r) => (r.id === newRef.id ? { ...r, st: 'Queued', w: `Queued to ${to}` } : r)),
            pending: prev.pending + 1,
          }));
        });
      }
      toast(
        isOnline
          ? `Referral delivered to ${to}`
          : 'Saved. The referral sends automatically when the phone is online.',
      );
      return true;
    },
    [toast],
  );

  const acceptReferral = useCallback(
    (referralId: string) => {
      const s = stateRef.current;
      const target = s.ref.find((r) => r.id === referralId);
      if (!target) return;
      const notifId = `nt-${Date.now()}`;
      const message = `Referral accepted by ${target.to}`;
      const updated: Referral = { ...target, st: 'Accepted', w: `Accepted to ${target.to}` };

      setState((prev) => ({
        ...prev,
        ref: prev.ref.map((r) => (r.id === referralId ? updated : r)),
        nt: [
          {
            id: notifId,
            pi: target.pi,
            k: 'ref',
            p: target.p,
            txt: message,
            read: false,
          },
          ...prev.nt,
        ],
      }));
      if (!s.off && getMemoryIdToken()) {
        apiRequest('/api/referrals', {
          method: 'POST',
          body: {
            referral: updated,
            patientCode: s.pts[target.pi]?.id || 'MAK-002431',
            notif: { id: notifId, message, facility: target.from },
          },
        }).catch(() => {});
      }
      toast(`Accepted. ${target.from} is notified.`);
    },
    [toast],
  );

  const openReferralOutcome = useCallback((referralId: string) => {
    const idx = stateRef.current.ref.findIndex((r) => r.id === referralId);
    if (idx < 0) return;
    setState((prev) => ({
      ...prev,
      refIndex: idx,
      stack: [...prev.stack, 'rfo'],
    }));
  }, []);

  const submitReferralOutcome = useCallback(
    (referralId: string, outcome: string, note: string) => {
      const s = stateRef.current;
      const target = s.ref.find((r) => r.id === referralId);
      if (!target) return;
      const fb = outcome + (note.trim() ? `: ${note.trim()}` : '');
      const notifId = `nt-${Date.now()}`;
      const message = `Referral feedback from ${target.to}: ${fb}`;
      const updated: Referral = { ...target, st: 'Completed', fb, w: `Feedback: ${fb}` };

      setState((prev) => ({
        ...prev,
        ref: prev.ref.map((r) => (r.id === referralId ? updated : r)),
        nt: [
          {
            id: notifId,
            pi: target.pi,
            k: 'ref',
            p: target.p,
            txt: message,
            read: false,
          },
          ...prev.nt,
        ],
        stack: prev.stack.length > 1 ? prev.stack.slice(0, -1) : prev.stack,
      }));
      if (!s.off && getMemoryIdToken()) {
        apiRequest('/api/referrals', {
          method: 'POST',
          body: {
            referral: updated,
            patientCode: s.pts[target.pi]?.id || 'MAK-002431',
            notif: { id: notifId, message, facility: target.from },
          },
        }).catch(() => {});
      }
      toast(`Feedback sent to ${target.from}`);
    },
    [toast],
  );

  const shareHistory = useCallback(
    (method: string) => {
      const pName = stateRef.current.pts[stateRef.current.cur]?.n || 'Patient';
      const entry = `${pName} shared by ${method} • today`;
      setState((prev) => ({
        ...prev,
        sh: [entry, ...prev.sh],
        aud: [`${prev.nm} shared ${pName} history via ${method}`, ...prev.aud],
        pending: prev.pending + 1,
      }));
      toast(`Shared by ${method}. Recorded in the audit log.`);
    },
    [toast],
  );

  const submitSurveillanceCase = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pending: prev.pending + 1,
      stack: prev.stack.length > 1 ? prev.stack.slice(0, -1) : prev.stack,
    }));
    toast('Saved on this device. It reaches the LGA surveillance officer when online.');
  }, [toast]);

  const setVerifyField: CareSyncContextValue['setVerifyField'] = useCallback((key, value) => {
    setState((prev) => ({
      ...prev,
      vs: { ...prev.vs, [key]: value },
    }));
  }, []);

  const completeVerification = useCallback(
    (method: string, emergencyReason?: string) => {
      const s = stateRef.current;
      const p = s.pts[s.vs.pi];
      const staffName = s.role === 'lab' ? 'Lab Tech Musa' : s.nm;
      const logLine = `${emergencyReason ? 'EMERGENCY override: ' : ''}${staffName} opened ${p?.n || 'Patient'} (${method})${emergencyReason ? `. Reason: ${emergencyReason}` : ''}`;
      const route = s.pendingRoute;
      setState((prev) => {
        const popped = prev.stack.slice(0, -1);
        const nextStack = route
          ? route.reset
            ? [route.screen]
            : [...popped, route.screen]
          : popped;
        return {
          ...prev,
          ver: { ...prev.ver, [prev.vs.pi]: true },
          brk: emergencyReason ? { ...prev.brk, [prev.vs.pi]: emergencyReason } : prev.brk,
          aud: [logLine, ...prev.aud],
          pendingRoute: null,
          stack: nextStack.length ? nextStack : ['home'],
        };
      });
      toast(emergencyReason ? 'Emergency access granted. This is logged.' : 'Identity confirmed');
    },
    [toast],
  );

  const runThumbScan = useCallback(() => {
    if (stateRef.current.vs.ph === 'scanning') return;
    setState((prev) => ({ ...prev, vs: { ...prev.vs, ph: 'scanning', msg: '' } }));
    window.setTimeout(() => {
      const cur = stateRef.current;
      if (cur.stack[cur.stack.length - 1] !== 'verify') return;
      if (cur.vs.sim === 'Match') {
        completeVerification(`thumb scan, ${cur.vs.fin}`);
      } else {
        setState((prev) => ({
          ...prev,
          vs: {
            ...prev.vs,
            ph: 'fail',
            msg: 'No match. Clean the scanner and the thumb, then try another finger or use another method below.',
          },
        }));
      }
    }, 1200);
  }, [completeVerification]);

  const confirmPinVerification = useCallback(
    (pin: string): boolean => {
      const p = stateRef.current.pts[stateRef.current.vs.pi];
      if (pin.trim() === (p?.pin || '1234')) {
        completeVerification('patient PIN');
        return true;
      }
      toast('Wrong PIN');
      return false;
    },
    [completeVerification, toast],
  );

  const confirmSmsVerification = useCallback(() => {
    if (stateRef.current.off) {
      toast('Needs internet. Use the PIN or QR card.');
      return;
    }
    toast('Code sent to the patient phone (simulated)');
    window.setTimeout(() => {
      completeVerification('SMS code');
    }, 900);
  }, [completeVerification, toast]);

  const grantEmergencyVerification = useCallback(
    (reason: string): boolean => {
      if (!reason.trim()) {
        toast('Give a reason for emergency access');
        return false;
      }
      completeVerification('emergency override', reason.trim());
      return true;
    },
    [completeVerification, toast],
  );

  const grantQrVerification = useCallback(() => {
    completeVerification('QR card');
  }, [completeVerification]);

  const switchRegisteredFacility = useCallback(
    (facilityName: string) => {
      const s = stateRef.current;
      if (!s.registeredFacilities.includes(facilityName)) {
        toast('Access denied: you are not registered in that facility');
        return;
      }
      setDrawerOpen(false);
      setState((prev) => ({
        ...prev,
        fac: facilityName,
        stack: ['home'],
      }));
      toast(`Active facility set to ${facilityName}`);
    },
    [toast],
  );

  const registerFacility = useCallback(
    (name: string, type: FacilityInfo['type'], lga: string): boolean => {
      const trimmedName = name.trim();
      const trimmedLga = lga.trim() || 'Katagum';
      if (!trimmedName) {
        toast('Enter the facility name');
        return false;
      }
      if (stateRef.current.facilities.some((f) => f.name.toLowerCase() === trimmedName.toLowerCase())) {
        toast('This facility is already registered');
        return false;
      }
      const newFacility: FacilityInfo = { name: trimmedName, type, lga: trimmedLga };
      const isOnline = !stateRef.current.off && Boolean(getMemoryIdToken());
      setState((prev) => ({
        ...prev,
        facilities: [...prev.facilities, newFacility],
        af: trimmedName,
        pending: isOnline ? prev.pending : prev.pending + 1,
      }));
      if (isOnline) {
        apiRequest('/api/facilities', { method: 'POST', body: { facility: newFacility } }).catch(() => {});
      }
      toast(`${trimmedName} registered and ready for referrals`);
      return true;
    },
    [toast],
  );

  const toggleStaffFacility = useCallback(
    (staffId: string, facilityName: string) => {
      let nextAssigned: string[] | null = null;
      setState((prev) => ({
        ...prev,
        stf: prev.stf.map((s) => {
          if (s.id !== staffId) return s;
          const currentList = Array.from(new Set([s.fac, ...(s.facilities || [])]));
          const exists = currentList.includes(facilityName);
          if (exists && facilityName === s.fac) {
            return s;
          }
          nextAssigned = exists
            ? currentList.filter((f) => f !== facilityName)
            : [...currentList, facilityName];
          return { ...s, facilities: nextAssigned };
        }),
      }));
      if (nextAssigned && !stateRef.current.off && getMemoryIdToken()) {
        apiRequest(`/api/staff/${encodeURIComponent(staffId)}`, {
          method: 'PATCH',
          body: { assignedFacilities: nextAssigned },
        }).catch(() => {});
      }
      toast('Staff facility assignment updated');
    },
    [toast],
  );

  const toggleAssistantFullAccess = useCallback(() => {
    setState((prev) => {
      const next = !prev.agr;
      toast(next ? 'Assistant has full access' : 'Assistant access limited');
      if (!prev.off && getMemoryIdToken()) {
        apiRequest('/api/staff/assistant-access', {
          method: 'POST',
          body: { fullAccess: next },
        }).catch(() => {});
      }
      return { ...prev, agr: next };
    });
  }, [toast]);

  const setStaffStatus = useCallback(
    (staffId: string, status: StaffMember['st']) => {
      const target = stateRef.current.stf.find((s) => s.id === staffId);
      setState((prev) => ({
        ...prev,
        stf: prev.stf.map((s) => (s.id === staffId ? { ...s, st: status } : s)),
      }));
      if (!stateRef.current.off && getMemoryIdToken()) {
        apiRequest(`/api/staff/${encodeURIComponent(staffId)}`, {
          method: 'PATCH',
          body: { status },
        }).catch(() => {});
      }
      if (target) toast(`${target.n}: ${status}`);
    },
    [toast],
  );

  const enrollStaff = useCallback(
    (name: string, email: string, roleLabel: string): boolean => {
      if (stateRef.current.pos !== 'oc') {
        toast('Only the Officer in Charge can register new staff');
        return false;
      }
      const n = name.trim();
      const e = email.trim().toLowerCase();
      if (!n) {
        toast('Enter the staff name');
        return false;
      }
      if (!e) {
        toast('Enter the staff email address');
        return false;
      }
      const role: StaffMember['role'] = /Lab/.test(roleLabel)
        ? 'lab'
        : /Pharm/.test(roleLabel)
          ? 'pharm'
          : /assist/i.test(roleLabel)
            ? 'asst'
            : 'nurse';
      const prefix = { nurse: 'NRS', lab: 'LAB', pharm: 'PHM', asst: 'AST', oc: 'OC' }[role];
      const staffId = `${prefix}-${1000 + stateRef.current.stf.length}`;
      const newStaff: StaffMember = {
        id: staffId,
        n,
        e,
        role,
        fac: stateRef.current.fac,
        facilities: [stateRef.current.fac],
        st: 'Active',
      };
      const isOnline = !stateRef.current.off && Boolean(getMemoryIdToken());
      setState((prev) => ({
        ...prev,
        stf: [...prev.stf, newStaff],
        pending: isOnline ? prev.pending : prev.pending + 1,
      }));
      if (isOnline) {
        apiRequest('/api/staff', {
          method: 'POST',
          body: { staff: newStaff, requireOc: true },
        })
          .then(() => {
            toast(`${n} (${staffId}) registered on server.`);
          })
          .catch((err: unknown) => {
            toast(err instanceof Error ? err.message : 'Failed to save staff on server.');
          });
      } else {
        toast(`${n} (${staffId}) queued locally. Will sync to server when online.`);
      }
      return true;
    },
    [toast],
  );

  const resetAllData = useCallback(async () => {
    await clearPersistedJson();
    if (!stateRef.current.off && getMemoryIdToken()) {
      try {
        const data = await apiRequest<BootstrapResponse>('/api/bootstrap');
        applyBootstrap(data, true);
        toast('Local cache cleared and reloaded from server');
        return;
      } catch {
        // Fallback to local defaults
      }
    }
    const fresh = createInitialState();
    setState({ ...fresh, stack: ['home'] });
    toast('Demo data restored to initial Azare PHC records');
  }, [applyBootstrap, toast]);

  const value: CareSyncContextValue = {
    state,
    currentScreen,
    currentPatient,
    drawerOpen,
    setDrawerOpen,
    modal,
    closeModal,
    showModal,
    toastMessage,
    toast,
    go,
    back,
    setQuery: (q) => setState((prev) => ({ ...prev, q })),
    setPatientIndex: (cur) => setState((prev) => ({ ...prev, cur })),
    setProfileTab: (tab) => setState((prev) => ({ ...prev, tab })),
    setEncounterType: (g) => setState((prev) => ({ ...prev, g })),
    setDashboardLevel: (lv) => setState((prev) => ({ ...prev, lv })),
    setAdminFacility: (af) => setState((prev) => ({ ...prev, af })),
    authLoading,
    authError,
    signedInEmail,
    signInWithGoogle,
    completeMobileAuthCode,
    loginLocalStaff,
    continueSession,
    logout,
    syncNow,
    registerPatient,
    startOrLoadDraft,
    updateDraft,
    pendingLabsForEncounter,
    sendLabOrder,
    saveAndWaitLab,
    continueToStage2,
    sendPharmacyOrder,
    completeEncounter,
    openTask,
    completeTask,
    openNotification,
    openOpenEncounter,
    createReferral,
    acceptReferral,
    openReferralOutcome,
    submitReferralOutcome,
    shareHistory,
    submitSurveillanceCase,
    setVerifyField,
    runThumbScan,
    confirmPinVerification,
    confirmSmsVerification,
    grantEmergencyVerification,
    grantQrVerification,
    toggleMute: () => setState((prev) => ({ ...prev, mute: !prev.mute })),
    toggleNinGate: () =>
      setState((prev) => {
        const next = !prev.ninEnabled;
        toast(next ? 'NIN identity verification enabled' : 'NIN identity verification disabled');
        return { ...prev, ninEnabled: next };
      }),
    setTheme: (theme) => setState((prev) => ({ ...prev, theme })),
    toggleHighContrast: () => setState((prev) => ({ ...prev, highContrast: !prev.highContrast })),
    setLanguage: (language) => {
      setState((prev) => ({ ...prev, language }));
      toast(`Language set to ${language}`);
    },
    switchRegisteredFacility,
    registerFacility,
    toggleStaffFacility,
    toggleAssistantFullAccess,
    setStaffStatus,
    enrollStaff,
    resetAllData,
    unreadCount,
    taskAlertCount,
  };

  return <CareSyncContext.Provider value={value}>{children}</CareSyncContext.Provider>;
};

export function useCareSync(): CareSyncContextValue {
  const ctx = useContext(CareSyncContext);
  if (!ctx) throw new Error('useCareSync must be used inside CareSyncProvider');
  return ctx;
}
