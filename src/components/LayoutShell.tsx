import React from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  Home,
  LogOut,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ROLE_LABELS } from '../data/seedData';
import { useCareSync } from '../store/useCareSyncStore';
import { ScreenId } from '../types/caresync';
import { Avatar } from './UiPrimitives';

const SCREEN_TO_NAV: Partial<Record<ScreenId, string>> = {
  home: 'Home',
  notif: 'Home',
  rfo: 'Home',
  stf: 'More',
  adm: 'Home',
  search: 'Patients',
  register: 'Patients',
  verify: 'Patients',
  profile: 'Patients',
  hist: 'Patients',
  shr: 'Patients',
  encs: 'Patients',
  sel: 'Patients',
  opd: 'Patients',
  gen: 'Patients',
  imm: 'Patients',
  ref: 'Patients',
  note: 'Patients',
  refs: 'Patients',
  tasks: 'Tasks',
  tdet: 'Tasks',
  reports: 'Reports',
  dash: 'Reports',
  more: 'More',
  surv: 'More',
  cs: 'More',
};

export const LayoutShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    state,
    currentScreen,
    drawerOpen,
    setDrawerOpen,
    modal,
    closeModal,
    toastMessage,
    go,
    logout,
    toggleMute,
    switchRegisteredFacility,
    taskAlertCount,
  } = useCareSync();

  const hideNav =
    currentScreen === 'splash' ||
    currentScreen === 'login' ||
    state.role === 'admin' ||
    state.role === 'asst';

  const activeTab = SCREEN_TO_NAV[currentScreen] || 'Home';

  const allNavItems: { label: string; screen: ScreenId; icon: React.ReactNode }[] = [
    { label: 'Home', screen: 'home', icon: <Home className="h-5 w-5" /> },
    { label: 'Patients', screen: 'search', icon: <Users className="h-5 w-5" /> },
    { label: 'Tasks', screen: 'tasks', icon: <ClipboardList className="h-5 w-5" /> },
    { label: 'Reports', screen: 'reports', icon: <BarChart3 className="h-5 w-5" /> },
    { label: 'More', screen: 'more', icon: <MoreHorizontal className="h-5 w-5" /> },
  ];

  const navItems = allNavItems.filter((item) => {
    if (state.role === 'lab') {
      return !['Patients', 'Reports', 'More'].includes(item.label);
    }
    if (state.role === 'pharm') {
      return !['Patients', 'Reports', 'More'].includes(item.label);
    }
    return true;
  });

  const currentFacilityInfo = state.facilities.find((f) => f.name === state.fac);
  const lgaLabel = `${currentFacilityInfo?.lga || 'Katagum'}, Bauchi State`;

  const drawerRoleLabel =
    state.pos === 'creator'
      ? 'App creator'
      : ROLE_LABELS[state.pos as keyof typeof ROLE_LABELS] || 'Nurse (PHC)';

  const taskBadgeCount =
    state.role === 'lab'
      ? state.lab.length
      : state.role === 'pharm'
        ? state.ph.length
        : state.lab.length + state.ph.length;

  const activeFacilityStaffCount = state.stf.filter(
    (s) => (s.fac === state.fac || s.facilities?.includes(state.fac)) && s.st === 'Active',
  ).length;
  const canViewStaffAccess = state.pos === 'oc' || state.pos === 'asst';

  return (
    <div className="relative flex min-h-screen w-full flex-col lg:flex-row" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Desktop navigation rail for tablet/desktop viewports */}
      {!hideNav && (
        <aside
          className="hidden lg:flex lg:w-64 lg:flex-none lg:flex-col lg:border-r"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--ln)' }}
        >
          <div className="p-5 text-white" style={{ backgroundColor: 'var(--g)' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-2xl font-extrabold text-[#0b5d34]">
                +
              </div>
              <div className="min-w-0">
                <div className="truncate font-bold tracking-tight">MaKSET</div>
                <div className="truncate text-xs text-white/80">{state.fac}</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const isActive = item.label === activeTab;
              const badge = item.label === 'Tasks' ? taskBadgeCount : 0;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => go(item.screen, true)}
                  className="flex min-h-[46px] w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors"
                  style={
                    isActive
                      ? { backgroundColor: 'var(--gl)', color: 'var(--g)' }
                      : { color: 'var(--tx)' }
                  }
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {badge > 0 && (
                    <span className="rounded-full bg-[#e53935] px-2 py-0.5 text-[11px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="border-t p-3 text-xs" style={{ borderColor: 'var(--ln)' }}>
            <div className="mb-2 flex items-center gap-2.5">
              <Avatar name={state.nm} />
              <div className="min-w-0">
                <div className="truncate font-semibold">{state.nm}</div>
                <div className="truncate" style={{ color: 'var(--mu)' }}>
                  {drawerRoleLabel} • {state.sid}
                </div>
              </div>
            </div>
            {canViewStaffAccess && (
              <button
                type="button"
                onClick={() => go('stf')}
                className="mb-2 flex min-h-[40px] w-full items-center gap-2 rounded-lg border px-2.5 text-xs font-semibold"
                style={{ borderColor: 'var(--g)', backgroundColor: 'var(--gl)', color: 'var(--g)' }}
              >
                <Users className="h-4 w-4 flex-none" />
                <span className="truncate">Staff & access ({activeFacilityStaffCount} active)</span>
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border text-xs font-semibold"
              style={{ borderColor: 'var(--ln)', color: 'var(--tx)' }}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 min-w-0 ${!hideNav ? 'pb-20 lg:pb-6' : ''}`}>
        <div className={currentScreen === 'splash' || currentScreen === 'login' ? 'h-full w-full' : 'mx-auto w-full max-w-4xl'}>
          {children}
        </div>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      {!hideNav && (
        <nav
          aria-label="Primary navigation"
          className="fixed bottom-0 left-0 right-0 z-30 flex border-t pb-safe lg:hidden"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--ln)',
          }}
        >
          {navItems.map((item) => {
            const isActive = item.label === activeTab;
            const badge = item.label === 'Tasks' ? taskBadgeCount : item.label === 'Home' && state.role === 'nurse' ? taskAlertCount : 0;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => go(item.screen, true)}
                className={`relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] transition-colors ${
                  item.label === 'Tasks' && taskBadgeCount > 0 ? 'animate-makset-blink' : ''
                }`}
                style={{
                  color: isActive ? 'var(--g)' : 'var(--mu)',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <div className="relative">
                  {item.icon}
                  {badge > 0 && item.label === 'Tasks' && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#e53935] px-1 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Slide-out Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
          />
          <div
            className="relative z-10 flex h-full w-[82%] max-w-[320px] flex-col overflow-y-auto shadow-2xl"
            style={{ backgroundColor: 'var(--card)' }}
          >
            <div className="p-5 pt-safe text-white" style={{ backgroundColor: 'var(--g)' }}>
              <div className="flex items-start justify-between">
                <Avatar name={state.nm} inverse />
                <button
                  type="button"
                  aria-label="Close drawer"
                  onClick={() => setDrawerOpen(false)}
                  className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-white/90 active:bg-white/15"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3 text-lg font-semibold">{state.nm}</div>
              <div className="text-xs text-white/85">Staff ID: {state.sid}</div>
            </div>

            <div className="flex-1 px-4 py-2">
              {[
                ['Role', drawerRoleLabel],
                ['Facility', state.fac],
                ['LGA and State', lgaLabel],
                ['Device', 'Registered to this facility'],
                ['Last synced', state.lastSyncedLabel],
              ].map(([k, v]) => (
                <div key={k} className="border-b py-2" style={{ borderColor: 'var(--ln)' }}>
                  <div className="text-[11px]" style={{ color: 'var(--mu)' }}>
                    {k}
                  </div>
                  <div className="text-sm font-semibold">{v}</div>
                </div>
              ))}

              {state.registeredFacilities.length > 1 && (
                <div className="border-b py-2.5" style={{ borderColor: 'var(--ln)' }}>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--mu)' }}>
                    <Building2 className="h-3.5 w-3.5" style={{ color: 'var(--g)' }} />
                    Registered facilities
                  </div>
                  <div className="space-y-1">
                    {state.registeredFacilities.map((facName) => {
                      const isCurrent = facName === state.fac;
                      return (
                        <button
                          key={facName}
                          type="button"
                          onClick={() => !isCurrent && switchRegisteredFacility(facName)}
                          className="flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs font-semibold"
                          style={
                            isCurrent
                              ? { backgroundColor: 'var(--gl)', borderColor: 'var(--g)', color: 'var(--g)' }
                              : { backgroundColor: 'var(--card)', borderColor: 'var(--ln)', color: 'var(--tx)' }
                          }
                        >
                          <span className="truncate">{facName}</span>
                          {isCurrent && <span className="ml-2 text-[10px]">Active</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-2 space-y-0.5">
                {canViewStaffAccess && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      go('stf');
                    }}
                    className="flex min-h-[46px] w-full items-center justify-between gap-3 border-b py-2 text-left text-sm font-semibold"
                    style={{ borderColor: 'var(--ln)' }}
                  >
                    <span className="flex items-center gap-3">
                      <Users className="h-5 w-5" style={{ color: 'var(--g)' }} />
                      Staff and access
                    </span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: 'var(--gl)', color: 'var(--g)' }}
                    >
                      {activeFacilityStaffCount} active
                    </span>
                  </button>
                )}
                {state.role === 'nurse' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false);
                        go('dash');
                      }}
                      className="flex min-h-[46px] w-full items-center gap-3 border-b py-2 text-left text-sm font-semibold"
                      style={{ borderColor: 'var(--ln)' }}
                    >
                      <BarChart3 className="h-5 w-5" style={{ color: 'var(--g)' }} />
                      Dashboards
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false);
                        go('surv');
                      }}
                      className="flex min-h-[46px] w-full items-center gap-3 border-b py-2 text-left text-sm font-semibold"
                      style={{ borderColor: 'var(--ln)' }}
                    >
                      <Activity className="h-5 w-5" style={{ color: 'var(--g)' }} />
                      Surveillance
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false);
                        go('more', true);
                      }}
                      className="flex min-h-[46px] w-full items-center gap-3 border-b py-2 text-left text-sm font-semibold"
                      style={{ borderColor: 'var(--ln)' }}
                    >
                      <RefreshCw className="h-5 w-5" style={{ color: 'var(--g)' }} />
                      Sync status
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    if (state.role === 'nurse') {
                      go('more', true);
                    }
                  }}
                  className="flex min-h-[46px] w-full items-center gap-3 border-b py-2 text-left text-sm font-semibold"
                  style={{ borderColor: 'var(--ln)' }}
                >
                  <Settings className="h-5 w-5" style={{ color: 'var(--g)' }} />
                  Settings
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex min-h-[46px] w-full items-center gap-3 border-b py-2 text-left text-sm font-semibold"
                  style={{ borderColor: 'var(--ln)' }}
                >
                  {state.mute ? (
                    <VolumeX className="h-5 w-5" style={{ color: 'var(--mu)' }} />
                  ) : (
                    <Volume2 className="h-5 w-5" style={{ color: 'var(--g)' }} />
                  )}
                  Alert sound: {state.mute ? 'Off' : 'On'}
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="flex min-h-[46px] w-full items-center gap-3 py-2 text-left text-sm font-semibold"
                  style={{ color: 'var(--rd)' }}
                >
                  <LogOut className="h-5 w-5" />
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Overlay */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]">
          <div
            className="w-full max-w-md rounded-2xl border p-4 shadow-2xl"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--ln)' }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-base font-bold">{modal.title}</div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close modal"
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg"
                style={{ color: 'var(--mu)' }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {modal.body}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md rounded-xl bg-[#14231b] px-4 py-3 text-center text-[13px] font-medium text-white shadow-xl lg:bottom-6"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};
