import React, { useState } from 'react';
import { RotateCcw, ShieldCheck, Users, Volume2, VolumeX } from 'lucide-react';
import { ROLE_LABELS } from '../data/seedData';
import { useCareSync } from '../store/useCareSyncStore';
import { FacilityInfo, StaffMember, ThemePreference } from '../types/caresync';
import {
  Avatar,
  Card,
  FieldLabel,
  InputField,
  ListRowCard,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
  SingleChoiceChips,
} from '../components/UiPrimitives';

export const MoreScreen: React.FC = () => {
  const {
    state,
    syncNow,
    go,
    logout,
    toggleMute,
    toggleNinGate,
    setTheme,
    toggleHighContrast,
    resetAllData,
    showModal,
    closeModal,
  } = useCareSync();

  const openSettingsModal = () => {
    showModal({
      title: 'Device & App Settings',
      body: (
        <div className="space-y-3 text-sm">
          <div>
            <FieldLabel className="!mt-0">Appearance theme</FieldLabel>
            <SingleChoiceChips
              options={['system', 'light', 'dark']}
              value={state.theme}
              onChange={(v) => setTheme(v as ThemePreference)}
            />
          </div>

          <div className="flex items-center justify-between border-t pt-2.5" style={{ borderColor: 'var(--ln)' }}>
            <span className="font-medium">High-contrast sunlight mode</span>
            <PrimaryButton compact className="!my-0 !w-auto px-3" variant={state.highContrast ? 'solid' : 'outline'} onClick={toggleHighContrast}>
              {state.highContrast ? 'On' : 'Off'}
            </PrimaryButton>
          </div>

          <div className="flex items-center justify-between border-t pt-2.5" style={{ borderColor: 'var(--ln)' }}>
            <span className="font-medium">Alert chime</span>
            <PrimaryButton compact className="!my-0 !w-auto px-3" variant={!state.mute ? 'solid' : 'outline'} onClick={toggleMute}>
              {state.mute ? 'Muted' : 'On'}
            </PrimaryButton>
          </div>

          <div className="flex items-center justify-between border-t pt-2.5" style={{ borderColor: 'var(--ln)' }}>
            <div>
              <div className="font-medium">NIN verification gate</div>
              <div className="text-[11px]" style={{ color: 'var(--mu)' }}>
                Require thumb/PIN/override before opening patient records
              </div>
            </div>
            <PrimaryButton compact className="!my-0 !w-auto px-3" variant={state.ninEnabled ? 'solid' : 'outline'} onClick={toggleNinGate}>
              {state.ninEnabled ? 'Enabled' : 'Off'}
            </PrimaryButton>
          </div>

          <div className="border-t pt-2.5" style={{ borderColor: 'var(--ln)' }}>
            <PrimaryButton
              variant="danger"
              compact
              onClick={async () => {
                closeModal();
                await resetAllData();
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset offline device data
            </PrimaryButton>
          </div>
        </div>
      ),
    });
  };

  const activeFacilityStaffCount = state.stf.filter(
    (s) => (s.fac === state.fac || s.facilities?.includes(state.fac)) && s.st === 'Active',
  ).length;
  const profileRoleLabel =
    state.pos === 'creator'
      ? 'App creator'
      : ROLE_LABELS[state.pos as keyof typeof ROLE_LABELS] || 'Clinician';

  return (
    <div>
      <ScreenHeader title="Profile & More" subtitle={state.fac} />
      <div className="p-3.5">
        <Card>
          <div className="flex items-center gap-3">
            <Avatar name={state.nm} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-bold">{state.nm}</div>
              <div className="truncate text-xs" style={{ color: 'var(--mu)' }}>
                {profileRoleLabel} • Staff ID: {state.sid}
              </div>
              <div className="truncate text-xs" style={{ color: 'var(--mu)' }}>
                {state.fac}
              </div>
            </div>
          </div>
        </Card>

        {(state.pos === 'oc' || state.pos === 'asst') && (
          <ListRowCard onClick={() => go('stf')}>
            <Users className="h-5 w-5 flex-none" style={{ color: 'var(--g)' }} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">Staff and access</div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                {activeFacilityStaffCount} active in {state.fac}
              </div>
            </div>
          </ListRowCard>
        )}

        <Card>
          <SectionTitle>Sync status</SectionTitle>
          <div className="mb-2 text-xs font-medium" style={{ color: state.off ? '#b07a00' : 'var(--g)' }}>
            {state.off
              ? 'Offline — no internet connection. Queued items sync automatically when online.'
              : 'Connected — automatic background sync active'}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="text-2xl font-bold" style={{ color: '#b07a00' }}>
                {state.pending}
              </div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                Pending
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--g)' }}>
                {state.synced}
              </div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                Synced
              </div>
            </div>
          </div>
        </Card>

        {state.pending > 0 && !state.off && <PrimaryButton onClick={syncNow}>Sync now</PrimaryButton>}
        <PrimaryButton variant="outline" onClick={() => go('dash')}>
          Open dashboards
        </PrimaryButton>
        <PrimaryButton variant="outline" onClick={() => go('surv')}>
          Surveillance and signals
        </PrimaryButton>

        {state.role === 'nurse' && state.aud.length > 0 && (
          <Card className="mt-2.5">
            <SectionTitle>Access audit log</SectionTitle>
            <div className="space-y-1">
              {state.aud.slice(0, 6).map((entry, idx) => (
                <div key={idx} className="text-xs" style={{ color: 'var(--mu)' }}>
                  {entry}
                </div>
              ))}
            </div>
          </Card>
        )}

        <ListRowCard onClick={toggleNinGate}>
          <ShieldCheck className="h-5 w-5 flex-none" style={{ color: 'var(--g)' }} />
          <div>
            <div className="text-sm font-bold">
              NIN verification gate: {state.ninEnabled ? 'Enabled' : 'Disabled'}
            </div>
            <div className="text-xs" style={{ color: 'var(--mu)' }}>
              Tap to toggle thumbprint / PIN / emergency override verification
            </div>
          </div>
        </ListRowCard>

        <ListRowCard onClick={toggleMute}>
          {state.mute ? (
            <VolumeX className="h-5 w-5 flex-none" style={{ color: 'var(--mu)' }} />
          ) : (
            <Volume2 className="h-5 w-5 flex-none" style={{ color: 'var(--g)' }} />
          )}
          <div>
            <div className="text-sm font-bold">Alert sound: {state.mute ? 'Off' : 'On'}</div>
            <div className="text-xs" style={{ color: 'var(--mu)' }}>
              Lab & pharmacy task notification tone
            </div>
          </div>
        </ListRowCard>

        <ListRowCard onClick={openSettingsModal}>
          <div>
            <div className="text-sm font-bold">Settings</div>
            <div className="text-xs" style={{ color: 'var(--mu)' }}>
              Theme, contrast, NIN gate, reset local data
            </div>
          </div>
        </ListRowCard>

        <ListRowCard onClick={logout}>
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--rd)' }}>
              Log out
            </div>
          </div>
        </ListRowCard>
      </div>
    </div>
  );
};

const StaffRowCard: React.FC<{ staff: StaffMember }> = ({ staff }) => {
  const { state, setStaffStatus, toggleStaffFacility } = useCareSync();
  const isCreator = state.pos === 'creator';
  const assignedFacilities = Array.from(new Set([staff.fac, ...(staff.facilities || [])]));
  const canManage =
    isCreator ||
    (state.pos === 'oc' && staff.role !== 'oc') ||
    (state.pos === 'asst' && state.agr && staff.role !== 'oc' && staff.role !== 'asst');

  return (
    <Card>
      <div className="flex items-center gap-3">
        <Avatar name={staff.n} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{staff.n}</div>
          <div className="truncate text-xs" style={{ color: 'var(--mu)' }}>
            {ROLE_LABELS[staff.role]} • {staff.id}{staff.e ? ` • ${staff.e}` : ''}
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{
            backgroundColor: staff.st === 'Active' ? 'var(--gl)' : 'var(--rdl)',
            color: staff.st === 'Active' ? 'var(--g)' : 'var(--rd)',
          }}
        >
          {staff.st}
        </span>
      </div>

      {isCreator && (
        <div className="mt-2.5 border-t pt-2" style={{ borderColor: 'var(--ln)' }}>
          <div className="mb-1 text-[11px] font-medium" style={{ color: 'var(--mu)' }}>
            Registered facilities (tap to grant/revoke facility access)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {state.facilities.map((f) => {
              const active = assignedFacilities.includes(f.name);
              const isPrimary = f.name === staff.fac;
              return (
                <button
                  key={f.name}
                  type="button"
                  disabled={isPrimary}
                  onClick={() => toggleStaffFacility(staff.id, f.name)}
                  className="rounded-full border px-2.5 py-1 text-[11px] font-medium disabled:opacity-80"
                  style={
                    active
                      ? { backgroundColor: 'var(--gl)', borderColor: 'var(--g)', color: 'var(--g)' }
                      : { backgroundColor: 'var(--card)', borderColor: 'var(--ln)', color: 'var(--mu)' }
                  }
                >
                  {f.name}
                  {isPrimary ? ' (Primary)' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {canManage && (
        <div className="mt-2.5 flex gap-2">
          {isCreator ? (
            staff.st === 'Active' ? (
              <PrimaryButton compact variant="danger" className="!my-0" onClick={() => setStaffStatus(staff.id, 'Blocked')}>
                Block access
              </PrimaryButton>
            ) : (
              <PrimaryButton compact variant="outline" className="!my-0" onClick={() => setStaffStatus(staff.id, 'Active')}>
                Restore access
              </PrimaryButton>
            )
          ) : (
            <>
              {staff.st === 'Active' && (
                <PrimaryButton compact variant="outline" className="!my-0" onClick={() => setStaffStatus(staff.id, 'Suspended')}>
                  Suspend
                </PrimaryButton>
              )}
              {staff.st === 'Suspended' && (
                <PrimaryButton compact variant="outline" className="!my-0" onClick={() => setStaffStatus(staff.id, 'Active')}>
                  Restore
                </PrimaryButton>
              )}
              {(staff.st === 'Active' || staff.st === 'Suspended') && (
                <PrimaryButton compact variant="danger" className="!my-0" onClick={() => setStaffStatus(staff.id, 'Terminated')}>
                  Terminate
                </PrimaryButton>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
};

export const StaffAccessScreen: React.FC = () => {
  const { state, toggleAssistantFullAccess, enrollStaff } = useCareSync();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleLabel, setRoleLabel] = useState('Nurse/CHEW');

  const facilityStaff = state.stf.filter(
    (s) => s.fac === state.fac || s.facilities?.includes(state.fac),
  );
  const countRole = (role: StaffMember['role']) =>
    facilityStaff.filter((s) => s.role === role && s.st === 'Active').length;
  const canEnroll = state.pos === 'oc';

  return (
    <div>
      <ScreenHeader title="Staff and access" subtitle={state.fac} showBack />
      <div className="p-3.5">
        <div className="mb-2.5 grid grid-cols-2 gap-2.5">
          {(
            [
              ['Nurses/CHEWs', 'nurse'],
              ['Lab technicians', 'lab'],
              ['Pharmacists', 'pharm'],
              ['OC assistants', 'asst'],
            ] as const
          ).map(([label, role]) => (
            <Card key={role} className="!mb-0">
              <div className="text-2xl font-bold" style={{ color: 'var(--g)' }}>
                {countRole(role)}
              </div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                {label}
              </div>
            </Card>
          ))}
        </div>

        {state.pos === 'oc' && (
          <Card>
            <div className="font-bold">Assistant access</div>
            <div className="mt-0.5 text-xs" style={{ color: 'var(--mu)' }}>
              By default the assistant can only see staff. Grant full access so the assistant can also work as nurse,
              lab technician and pharmacist.
            </div>
            <div className="mt-2.5">
              <SingleChoiceChips
                options={[state.agr ? 'Full access granted' : 'Full access not granted']}
                value={state.agr ? 'Full access granted' : ''}
                onChange={toggleAssistantFullAccess}
                allowDeselect
              />
            </div>
          </Card>
        )}

        {facilityStaff.map((staff) => (
          <StaffRowCard key={staff.id} staff={staff} />
        ))}

        {canEnroll && (
          <Card>
            <SectionTitle>Register new staff</SectionTitle>
            <div className="mb-1.5 text-xs" style={{ color: 'var(--mu)' }}>
              Only the Officer in Charge can register facility staff. Accounts sync to the backend server for authentication.
            </div>
            <FieldLabel>Full name</FieldLabel>
            <InputField value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sadiya Abubakar" />
            <FieldLabel>Email</FieldLabel>
            <InputField type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@facility.org" />
            <FieldLabel>Role</FieldLabel>
            <SingleChoiceChips
              options={['Nurse/CHEW', 'Lab technician', 'Pharmacy', 'OC assistant']}
              value={roleLabel}
              onChange={setRoleLabel}
            />
            <PrimaryButton
              className="mt-3"
              onClick={() => {
                if (enrollStaff(name, email, roleLabel)) {
                  setName('');
                  setEmail('');
                }
              }}
            >
              Register staff
            </PrimaryButton>
          </Card>
        )}
      </div>
    </div>
  );
};

export const CreatorAdminScreen: React.FC = () => {
  const { state, setAdminFacility, registerFacility } = useCareSync();
  const [newFacName, setNewFacName] = useState('');
  const [newFacType, setNewFacType] = useState<FacilityInfo['type']>('PHC');
  const [newFacLga, setNewFacLga] = useState('Katagum');

  const facName = state.af || state.facilities[0]?.name || '';
  const list = state.stf.filter((s) => s.fac === facName || s.facilities?.includes(facName));
  const activeCount = list.filter((s) => s.st === 'Active').length;

  return (
    <div>
      <ScreenHeader title="Facilities and staff" subtitle="Creator control" showBack />
      <div className="p-3.5">
        <div className="mb-3">
          <SingleChoiceChips
            options={state.facilities.map((f) => f.name)}
            value={facName}
            onChange={setAdminFacility}
          />
        </div>

        <Card>
          <div className="font-bold">{facName}</div>
          <div className="text-xs" style={{ color: 'var(--mu)' }}>
            {activeCount} active of {list.length} staff. Block the in-charge or any staff to remove their access to the
            app.
          </div>
        </Card>

        {list.map((staff) => (
          <StaffRowCard key={staff.id} staff={staff} />
        ))}

        <Card>
          <SectionTitle>Register interoperable facility</SectionTitle>
          <div className="mb-1 text-xs" style={{ color: 'var(--mu)' }}>
            Any newly registered PHC or hospital can immediately send and receive automatic referrals across MaKSET.
          </div>
          <FieldLabel>Facility name</FieldLabel>
          <InputField
            value={newFacName}
            onChange={(e) => setNewFacName(e.target.value)}
            placeholder="e.g. Jama'are General Hospital"
          />
          <FieldLabel>Facility type</FieldLabel>
          <SingleChoiceChips
            options={['PHC', 'Hospital']}
            value={newFacType}
            onChange={(v) => setNewFacType(v as FacilityInfo['type'])}
          />
          <FieldLabel>LGA</FieldLabel>
          <InputField value={newFacLga} onChange={(e) => setNewFacLga(e.target.value)} placeholder="Katagum" />
          <PrimaryButton
            className="mt-3"
            onClick={() => {
              if (registerFacility(newFacName, newFacType, newFacLga)) {
                setNewFacName('');
              }
            }}
          >
            Register facility
          </PrimaryButton>
        </Card>
      </div>
    </div>
  );
};
