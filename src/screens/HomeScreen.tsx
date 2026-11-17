import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Baby,
  Bell,
  FlaskConical,
  Menu,
  Pill,
  Search,
  Stethoscope,
  Syringe,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCareSync } from '../store/useCareSyncStore';
import { Card, PrimaryButton, SyncStatusBar } from '../components/UiPrimitives';

export const HomeScreen: React.FC = () => {
  const {
    state,
    setDrawerOpen,
    go,
    logout,
    toast,
    unreadCount,
    taskAlertCount,
  } = useCareSync();

  // App Creator home
  if (state.pos === 'creator') {
    const activeStaff = state.stf.filter((s) => s.st === 'Active').length;
    return (
      <div>
        <header className="px-4 py-4 pt-safe text-white" style={{ backgroundColor: 'var(--g)' }}>
          <div className="text-lg font-semibold">Good morning, App Creator</div>
          <div className="text-xs text-white/85">Overall control • all facilities</div>
        </header>
        <div className="p-3.5">
          <div className="grid grid-cols-3 gap-2.5">
            <Card>
              <div className="text-2xl font-bold" style={{ color: 'var(--g)' }}>
                {state.facilities.length}
              </div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                Facilities
              </div>
            </Card>
            <Card>
              <div className="text-2xl font-bold" style={{ color: 'var(--g)' }}>
                {activeStaff}
              </div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                Active staff
              </div>
            </Card>
            <Card>
              <div className="text-2xl font-bold" style={{ color: 'var(--g)' }}>
                {state.stf.length - activeStaff}
              </div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                No access
              </div>
            </Card>
          </div>
          <PrimaryButton onClick={() => go('adm')}>Facilities, in-charges and staff</PrimaryButton>
          <PrimaryButton variant="outline" onClick={logout}>
            Log out
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // OC Assistant restricted home
  if (state.role === 'asst') {
    return (
      <div>
        <header className="px-4 py-4 pt-safe text-white" style={{ backgroundColor: 'var(--g)' }}>
          <div className="text-lg font-semibold">Good morning, {state.nm}</div>
          <div className="text-xs text-white/85">OC assistant • {state.fac}</div>
        </header>
        <div className="p-3.5">
          <PrimaryButton onClick={() => go('stf')}>
            <Users className="h-5 w-5" />
            Staff and access
          </PrimaryButton>
          <Card style={{ backgroundColor: 'var(--aml)' }}>
            <div className="text-sm">
              Your officer in charge decides whether you can also work as a nurse, lab technician or pharmacist.
            </div>
          </Card>
          <PrimaryButton variant="outline" onClick={logout}>
            Log out
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // Lab & Pharmacy home
  if (state.role === 'lab' || state.role === 'pharm') {
    const isLab = state.role === 'lab';
    const waiting = isLab ? state.lab.length : state.ph.length;
    return (
      <div>
        <header className="px-4 pb-3.5 pt-3 pt-safe text-white" style={{ backgroundColor: 'var(--g)' }}>
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl active:bg-white/15"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Bell className="h-5 w-5 opacity-80" />
          </div>
          <div className="mt-2 text-lg font-semibold">Good morning, {state.nm}</div>
          <div className="text-xs text-white/85">{state.fac}</div>
        </header>
        <SyncStatusBar />
        <div className="p-3.5">
          <button
            type="button"
            onClick={() => go('tasks')}
            className={`flex min-h-[96px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border p-4 text-center text-white shadow-sm ${
              waiting > 0 ? 'animate-makset-blink' : ''
            }`}
            style={{ backgroundColor: 'var(--g)', borderColor: 'var(--g)' }}
          >
            {isLab ? <FlaskConical className="h-7 w-7" /> : <Pill className="h-7 w-7" />}
            <span className="text-base font-semibold">
              {isLab ? 'Lab investigations' : 'Prescriptions to dispense'} ({waiting})
            </span>
          </button>

          {waiting > 0 ? (
            <button
              type="button"
              onClick={() => go('tasks')}
              className="mt-3 flex w-full min-h-[46px] items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold"
              style={{ backgroundColor: 'var(--rdl)', color: 'var(--rd)' }}
            >
              <AlertTriangle className="h-4 w-4 flex-none" />
              <span>{waiting} waiting. Tap to open.</span>
            </button>
          ) : (
            <Card className="mt-3">
              <div className="text-sm" style={{ color: 'var(--mu)' }}>
                No tasks waiting.
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Interoperable Clinical Home for all registered facilities
  const openReferralsCount = state.ref.filter(
    (r) => r.from === state.fac && r.st !== 'Completed',
  ).length;
  const incomingReferralsCount = state.ref.filter(
    (r) => r.to === state.fac && r.st !== 'Queued' && r.st !== 'Completed',
  ).length;

  const handleServiceTile = (svc: string) => {
    if (svc === 'Laboratory') {
      go('tasks');
    } else if (svc === 'Referrals') {
      go('refs');
    } else {
      toast('Choose a patient first');
      go('search');
    }
  };

  const services: { label: string; icon: React.ReactNode }[] = [
    { label: 'OPD', icon: <Stethoscope className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
    { label: 'ANC', icon: <UserCheck className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
    { label: 'Child Health', icon: <Baby className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
    { label: 'Immunization', icon: <Syringe className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
    { label: 'Laboratory', icon: <FlaskConical className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
    { label: 'Referrals', icon: <ArrowUpRight className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
  ];

  return (
    <div>
      <header className="px-4 pb-3.5 pt-3 pt-safe text-white" style={{ backgroundColor: 'var(--g)' }}>
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl active:bg-white/15"
          >
            <Menu className="h-6 w-6" />
          </button>

          <button
            type="button"
            aria-label="Open notifications"
            onClick={() => go('notif')}
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl active:bg-white/15"
          >
            <span className={unreadCount > 0 ? 'animate-makset-ring' : ''}>
              <Bell className="h-5 w-5" />
            </span>
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#e53935] px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="mt-2 text-lg font-semibold">Good morning, {state.nm}</div>
        <div className="text-xs text-white/85">{state.fac}</div>
      </header>

      <SyncStatusBar />

      <div className="p-3.5">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => go('search')}
            className="flex min-h-[82px] flex-col items-center justify-center gap-1.5 rounded-xl p-4 text-sm font-semibold text-white shadow-sm active:opacity-90"
            style={{ backgroundColor: 'var(--g)' }}
          >
            <Search className="h-6 w-6" />
            <span>Find Patient</span>
          </button>
          <button
            type="button"
            onClick={() => go('register')}
            className="flex min-h-[82px] flex-col items-center justify-center gap-1.5 rounded-xl p-4 text-sm font-semibold text-white shadow-sm active:opacity-90"
            style={{ backgroundColor: 'var(--g)' }}
          >
            <UserPlus className="h-6 w-6" />
            <span>Register Patient</span>
          </button>
        </div>

        <div className="mb-2 mt-4 text-sm font-bold">Services</div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {services.map((svc) => (
            <button
              key={svc.label}
              type="button"
              onClick={() => handleServiceTile(svc.label)}
              className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center text-xs font-medium active:opacity-85"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--ln)' }}
            >
              {svc.icon}
              <span>{svc.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go('refs')}
          className="mt-3.5 flex min-h-[48px] w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-semibold"
          style={{ backgroundColor: 'var(--rdl)', color: 'var(--rd)' }}
        >
          <span
            className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--rd)' }}
          >
            !
          </span>
          <span>
            {openReferralsCount}{' '}
            {openReferralsCount === 1 ? 'outgoing referral needs follow-up' : 'outgoing referrals need follow-up'}
          </span>
        </button>

        {incomingReferralsCount > 0 && (
          <button
            type="button"
            onClick={() => go('refs')}
            className="mt-2.5 flex min-h-[46px] w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold animate-makset-blink"
            style={{ backgroundColor: 'var(--gl)', borderColor: 'var(--g)', color: 'var(--g)' }}
          >
            <span>
              {incomingReferralsCount}{' '}
              {incomingReferralsCount === 1 ? 'incoming referral to review' : 'incoming referrals to review'}
            </span>
            <span>Open →</span>
          </button>
        )}

        {taskAlertCount > 0 && (
          <button
            type="button"
            onClick={() => go('notif')}
            className="mt-2.5 flex min-h-[46px] w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold animate-makset-blink"
            style={{ backgroundColor: 'var(--gl)', borderColor: 'var(--g)', color: 'var(--g)' }}
          >
            <span>Lab or pharmacy updates ready ({taskAlertCount})</span>
            <span>Open →</span>
          </button>
        )}
      </div>
    </div>
  );
};
