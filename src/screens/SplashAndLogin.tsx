import React, { useEffect, useState } from 'react';
import { Accessibility, Building2, Eye, EyeOff, Globe } from 'lucide-react';
import { useCareSync } from '../store/useCareSyncStore';
import { FieldLabel, InputField, PrimaryButton, SingleChoiceChips } from '../components/UiPrimitives';
import { CareSyncState } from '../types/caresync';

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

export const LoginScreen: React.FC = () => {
  const { state, signIn, showModal, closeModal, setLanguage, toggleHighContrast, toast } =
    useCareSync();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn(identifier, password);
  };

  const openDeviceSetupModal = () => {
    showModal({
      title: 'Facility Device Provisioning',
      body: (
        <div className="space-y-3 text-sm">
          <p style={{ color: 'var(--mu)' }}>
            This device is provisioned by your facility administrator for secure PHC and referral access.
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
            className="mx-auto mb-2 block w-36 rounded-2xl bg-white p-1.5 shadow-sm"
          />
          <h2 className="text-3xl font-bold" style={{ color: 'var(--g)' }}>
            MaKSET
          </h2>
          <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--g)' }}>
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

        <form onSubmit={handleSubmit}>
          <FieldLabel className="!font-semibold">
            <span style={{ color: 'var(--tx)' }}>Staff ID or email</span>
          </FieldLabel>
          <InputField
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Staff ID, name, or email"
            autoComplete="username"
          />

          <FieldLabel className="!font-semibold">
            <span style={{ color: 'var(--tx)' }}>Password</span>
          </FieldLabel>
          <div className="relative">
            <InputField
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg"
              style={{ color: 'var(--mu)' }}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <PrimaryButton type="submit" className="mt-5">
            Log In
          </PrimaryButton>
          <p className="mt-1.5 text-center text-[11px]" style={{ color: 'var(--mu)' }}>
            Server authentication pending — enter your staff credentials to open.
          </p>
        </form>

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
