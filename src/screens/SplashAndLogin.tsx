import React, { useEffect, useState } from 'react';
import { Accessibility, Building2, Cloud, Globe, KeyRound, LogIn } from 'lucide-react';
import { isNativeCapacitor } from '../lib/capacitor';
import { useCareSync } from '../store/useCareSyncStore';
import {
  FieldLabel,
  InputField,
  PrimaryButton,
  SingleChoiceChips,
} from '../components/UiPrimitives';
import { CareSyncState, Position } from '../types/caresync';

export const SplashScreen: React.FC = () => {
  const { go } = useCareSync();

  useEffect(() => {
    const t = window.setTimeout(() => {
      go('login', true);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [go]);

  return (
    <button
      type="button"
      onClick={() => go('login', true)}
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center text-white"
      style={{ backgroundColor: 'var(--g)' }}
    >
      <img
        src="/assets/coat-of-arms.png"
        alt="Nigerian Coat of Arms"
        className="mb-4 block w-36 drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
      />
      <h1 className="text-5xl font-bold tracking-wide">MaKSET</h1>
      <p className="mt-2 text-base text-white/95">Connected Care. Anywhere.</p>
      <div className="my-4 h-0.5 w-11 rounded-full bg-[#39c27a]" />
      <p className="text-base font-medium text-white/95">Offline-first PHC System</p>

      <svg
        viewBox="0 0 380 90"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-0 left-0 h-24 w-full"
      >
        <path d="M0 50Q90 20 190 50T380 40V90H0z" fill="rgba(255,255,255,0.08)" />
      </svg>
    </button>
  );
};

const QUICK_ROLE_OPTIONS: { label: string; pos: Position; defaultEmail: string }[] = [
  { label: 'Nurse/CHEW', pos: 'nurse', defaultEmail: 'amina@azare.phc' },
  { label: 'Officer in charge', pos: 'oc', defaultEmail: 'halima@azare.phc' },
  { label: 'OC assistant', pos: 'asst', defaultEmail: 'ibrahim@azare.phc' },
  { label: 'Lab technician', pos: 'lab', defaultEmail: 'musa@azare.phc' },
  { label: 'Pharmacist', pos: 'pharm', defaultEmail: 'hauwa@azare.phc' },
  { label: 'App creator', pos: 'creator', defaultEmail: 'creator@makset.ng' },
];

export const LoginScreen: React.FC = () => {
  const {
    state,
    authLoading,
    authError,
    signedInEmail,
    signInWithGoogle,
    completeMobileAuthCode,
    loginLocalStaff,
    continueSession,
    showModal,
    closeModal,
    setLanguage,
    toggleHighContrast,
    toast,
  } = useCareSync();

  const [selectedRoleLabel, setSelectedRoleLabel] = useState('Nurse/CHEW');
  const [staffInput, setStaffInput] = useState('amina@azare.phc');
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const nativeApp = isNativeCapacitor();

  const handleSelectRole = (label: string) => {
    setSelectedRoleLabel(label);
    const match = QUICK_ROLE_OPTIONS.find((r) => r.label === label);
    if (match) {
      setStaffInput(match.defaultEmail);
    }
  };

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const roleMatch = QUICK_ROLE_OPTIONS.find((r) => r.label === selectedRoleLabel);
    loginLocalStaff(staffInput, roleMatch?.pos);
  };

  const openDeviceSetupModal = () => {
    showModal({
      title: 'Facility Device Provisioning',
      body: (
        <div className="space-y-3 text-sm">
          <p style={{ color: 'var(--mu)' }}>
            This device is provisioned by your facility administrator for offline-first PHC records and cloud referral sync.
          </p>
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--gl)' }}>
            <div className="font-semibold">Registered Facility</div>
            <div className="text-xs" style={{ color: 'var(--mu)' }}>
              {state.fac} • Bauchi State
            </div>
          </div>
          <PrimaryButton onClick={closeModal}>Done</PrimaryButton>
        </div>
      ),
    });
  };

  const openLanguageModal = () => {
    const langs: CareSyncState['language'][] = ['English', 'Hausa', 'Yoruba', 'Igbo'];
    showModal({
      title: 'Select Language',
      body: (
        <div className="space-y-2">
          <SingleChoiceChips
            options={langs}
            value={state.language}
            onChange={(val) => {
              setLanguage(val as CareSyncState['language']);
              closeModal();
            }}
          />
        </div>
      ),
    });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-5 pb-8 pt-6 pt-safe pb-safe">
      <div>
        <div className="text-center">
          <img
            src="/assets/nphcda-logo.png"
            alt="NPHCDA Logo"
            className="mx-auto mb-2 block w-32 rounded-2xl bg-white p-1.5 shadow-sm"
          />
          <h2 className="text-3xl font-bold" style={{ color: 'var(--g)' }}>
            MaKSET
          </h2>
          <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--g)' }}>
            Primary Healthcare
          </p>
        </div>

        <div
          className="mb-4 flex items-center gap-3 rounded-xl border p-3.5"
          style={{ backgroundColor: 'var(--gl)', borderColor: 'var(--ln)' }}
        >
          <Building2 className="h-7 w-7 flex-none" style={{ color: 'var(--g)' }} />
          <div>
            <div className="text-sm font-bold">{state.fac}</div>
            <div className="text-xs" style={{ color: 'var(--mu)' }}>
              Bauchi State • Offline-ready device
            </div>
          </div>
        </div>

        {authError && (
          <div
            className="mb-3 rounded-xl border px-3.5 py-2.5 text-xs font-medium"
            style={{ backgroundColor: 'var(--rdl)', borderColor: 'var(--rd)', color: 'var(--rd)' }}
          >
            {authError}
          </div>
        )}

        <form onSubmit={handleStaffLogin} className="space-y-2.5">
          <div>
            <FieldLabel className="!mt-0">Facility role</FieldLabel>
            <SingleChoiceChips
              options={QUICK_ROLE_OPTIONS.map((r) => r.label)}
              value={selectedRoleLabel}
              onChange={handleSelectRole}
            />
          </div>

          <div>
            <FieldLabel>Staff email or ID</FieldLabel>
            <InputField
              type="text"
              value={staffInput}
              onChange={(e) => setStaffInput(e.target.value)}
              placeholder="e.g. amina@azare.phc or NRS-0142"
            />
          </div>

          <PrimaryButton type="submit" disabled={authLoading}>
            <LogIn className="h-4 w-4" />
            Sign in to Facility
          </PrimaryButton>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1" style={{ backgroundColor: 'var(--ln)' }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--mu)' }}>
            Cloud Sync Account
          </span>
          <div className="h-px flex-1" style={{ backgroundColor: 'var(--ln)' }} />
        </div>

        {signedInEmail ? (
          <div className="space-y-2">
            <PrimaryButton variant="outline" disabled={authLoading} onClick={() => void continueSession()}>
              <Cloud className="h-4 w-4" />
              {authLoading ? 'Opening MaKSET…' : `Sync & continue as ${signedInEmail}`}
            </PrimaryButton>
            <PrimaryButton
              variant="outline"
              compact
              disabled={authLoading}
              onClick={() => void signInWithGoogle()}
            >
              Switch Google account
            </PrimaryButton>
          </div>
        ) : (
          <PrimaryButton variant="outline" disabled={authLoading} onClick={() => void signInWithGoogle()}>
            <Cloud className="h-4 w-4" />
            {authLoading ? 'Connecting…' : 'Sign in with Google (Cloud Sync)'}
          </PrimaryButton>
        )}

        <p className="mt-2 text-center text-xs" style={{ color: 'var(--mu)' }}>
          Use Staff Sign-In above for instant offline clinic access, or Google Sign-In to sync across facilities.
        </p>

        {nativeApp && (
          <div className="mt-3">
            {!showCodeEntry ? (
              <button
                type="button"
                onClick={() => setShowCodeEntry(true)}
                className="mx-auto flex items-center gap-1.5 py-1.5 text-xs font-semibold"
                style={{ color: 'var(--g)' }}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Have a browser sign-in code? Enter it
              </button>
            ) : (
              <div
                className="space-y-2 rounded-xl border p-3"
                style={{ backgroundColor: 'var(--sf)', borderColor: 'var(--ln)' }}
              >
                <div className="text-xs font-semibold">Enter 10-character sign-in code</div>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A7K9M2P4Q8"
                  className="w-full rounded-lg border px-3 py-2 text-sm font-mono tracking-wider uppercase outline-none"
                  style={{ borderColor: 'var(--ln)', backgroundColor: 'var(--bg)' }}
                />
                <PrimaryButton
                  disabled={authLoading || !manualCode.trim()}
                  onClick={() => void completeMobileAuthCode(manualCode)}
                >
                  Verify & Open MaKSET
                </PrimaryButton>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={openDeviceSetupModal}
          className="mt-3 block w-full py-2 text-center text-sm font-semibold"
          style={{ color: 'var(--g)' }}
        >
          Facility device status
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={openLanguageModal}
          className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 font-medium"
        >
          <Globe className="h-4 w-4" style={{ color: 'var(--g)' }} />
          <span>{state.language} ▾</span>
        </button>

        <button
          type="button"
          onClick={() => {
            toggleHighContrast();
            toast(state.highContrast ? 'Standard contrast enabled' : 'High-contrast accessibility mode enabled');
          }}
          aria-label="Toggle high contrast accessibility mode"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm"
          style={{ backgroundColor: 'var(--g)' }}
        >
          <Accessibility className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
