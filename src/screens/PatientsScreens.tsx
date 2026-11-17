import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Fingerprint,
  FlaskConical,
  MoreVertical,
  Pill,
  QrCode,
  Share2,
  Stethoscope,
} from 'lucide-react';
import { shareTextOrUrl } from '../lib/shareUtils';
import { useCareSync } from '../store/useCareSyncStore';
import {
  Avatar,
  Card,
  FieldLabel,
  InputField,
  ListRowCard,
  MultiChoiceChips,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
  SelectField,
  SingleChoiceChips,
} from '../components/UiPrimitives';

function maskNin(nin?: string): string {
  return nin ? `•••••••${nin.slice(-4)}` : 'No NIN yet (temporary ID)';
}

export const SearchScreen: React.FC = () => {
  const { state, setQuery, setPatientIndex, setProfileTab, go, showModal, closeModal, toast } = useCareSync();
  const q = state.q.trim().toLowerCase();
  const indexed = state.pts.map((p, idx) => ({ p, idx }));
  const filtered = q
    ? indexed.filter(({ p }) => `${p.n} ${p.id} ${p.nin || ''} ${p.phone || ''}`.toLowerCase().includes(q))
    : indexed.slice(0, 1);

  const openQrScannerModal = () => {
    showModal({
      title: 'Scan Patient QR Card',
      body: (
        <div className="space-y-3 text-center text-sm">
          <div
            className="mx-auto flex h-36 w-36 items-center justify-center rounded-2xl border-2 border-dashed"
            style={{ borderColor: 'var(--g)', backgroundColor: 'var(--gl)' }}
          >
            <QrCode className="h-16 w-16" style={{ color: 'var(--g)' }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--mu)' }}>
            Point the device camera at the patient MaKSET QR card or select a demo patient card below:
          </p>
          <div className="space-y-1.5">
            {state.pts.slice(0, 3).map((pt, idx) => (
              <PrimaryButton
                key={pt.id}
                compact
                variant="outline"
                onClick={() => {
                  closeModal();
                  setProfileTab('Summary');
                  toast(`QR scanned: ${pt.n}`);
                  go('profile', false, idx);
                }}
              >
                Simulate QR: {pt.n} ({pt.id})
              </PrimaryButton>
            ))}
          </div>
        </div>
      ),
    });
  };

  return (
    <div>
      <ScreenHeader title="Find or Register Patient" showBack />
      <div className="p-3.5">
        <InputField
          placeholder="Name, ID, NIN or phone number"
          value={state.q}
          onChange={(e) => setQuery(e.target.value)}
        />
        <PrimaryButton variant="outline" onClick={openQrScannerModal} className="mt-2.5">
          <QrCode className="h-4 w-4" />
          Scan Patient QR
        </PrimaryButton>

        <FieldLabel>Search Results (searched on this device)</FieldLabel>
        {filtered.length ? (
          filtered.map(({ p, idx }) => (
            <ListRowCard
              key={p.id}
              onClick={() => {
                setPatientIndex(idx);
                setProfileTab('Summary');
                go('profile', false, idx);
              }}
            >
              <Avatar name={p.n} />
              <div className="min-w-0">
                <div className="truncate font-bold">{p.n}</div>
                <div className="text-xs" style={{ color: 'var(--mu)' }}>
                  {p.s} • {p.a}
                </div>
                <div className="text-xs" style={{ color: 'var(--mu)' }}>
                  {state.ninEnabled ? `NIN ${maskNin(p.nin)}` : `Patient ID: ${p.id}`}
                </div>
              </div>
            </ListRowCard>
          ))
        ) : (
          <Card>
            <div className="text-sm" style={{ color: 'var(--mu)' }}>
              No match. Register this patient as new.
            </div>
          </Card>
        )}

        {state.role !== 'lab' && (
          <div className="mt-6">
            <PrimaryButton onClick={() => go('register')}>Register New Patient</PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
};

export const RegisterScreen: React.FC = () => {
  const { state, registerPatient, toast } = useCareSync();
  const [firstName, setFirstName] = useState('Hauwa');
  const [surname, setSurname] = useState('Garba');
  const [sex, setSex] = useState('Female');
  const [dob, setDob] = useState('1998-03-14');
  const [phone, setPhone] = useState('0803 555 0142');
  const [lga, setLga] = useState('Bauchi / Katagum / Azare');
  const [address, setAddress] = useState('Behind the central market');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergy, setAllergy] = useState('');
  const [nin, setNin] = useState('');
  const [noNin, setNoNin] = useState(false);
  const [pin, setPin] = useState('');
  const [consentFp, setConsentFp] = useState(false);
  const [nimcState, setNimcState] = useState<'idle' | 'scanning' | 'verified'>('idle');

  const handleNimcScan = () => {
    if (nin.trim().length !== 11) {
      toast('Enter the 11-digit NIN first');
      return;
    }
    setNimcState('scanning');
    window.setTimeout(() => {
      setNimcState('verified');
    }, 1100);
  };

  return (
    <div>
      <ScreenHeader title="Register Patient" subtitle="Capture identity once" showBack />
      <div className="p-3.5">
        <FieldLabel>First name</FieldLabel>
        <InputField value={firstName} onChange={(e) => setFirstName(e.target.value)} />

        <FieldLabel>Surname</FieldLabel>
        <InputField value={surname} onChange={(e) => setSurname(e.target.value)} />

        <FieldLabel>Sex</FieldLabel>
        <SingleChoiceChips options={['Female', 'Male']} value={sex} onChange={setSex} />

        <FieldLabel>Date of birth</FieldLabel>
        <InputField type="date" value={dob} onChange={(e) => setDob(e.target.value)} />

        <FieldLabel>Phone number</FieldLabel>
        <InputField value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />

        <FieldLabel>State / LGA / Ward</FieldLabel>
        <SelectField value={lga} onChange={(e) => setLga(e.target.value)}>
          <option value="Bauchi / Katagum / Azare">Bauchi / Katagum / Azare</option>
          <option value="Bauchi / Katagum / Chinade">Bauchi / Katagum / Chinade</option>
          <option value="Bauchi / Katagum / Madara">Bauchi / Katagum / Madara</option>
          <option value="Bauchi / Misau / Misau Central">Bauchi / Misau / Misau Central</option>
        </SelectField>

        <FieldLabel>Address</FieldLabel>
        <InputField value={address} onChange={(e) => setAddress(e.target.value)} />

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <FieldLabel>Blood group</FieldLabel>
            <SelectField value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
              {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <FieldLabel>Allergies (if any)</FieldLabel>
            <InputField
              value={allergy}
              onChange={(e) => setAllergy(e.target.value)}
              placeholder="e.g. Penicillin"
            />
          </div>
        </div>

        {state.ninEnabled && (
          <Card className="mt-3">
            <SectionTitle>National ID (NIN)</SectionTitle>
            <FieldLabel>NIN (11 digits)</FieldLabel>
            <InputField
              inputMode="numeric"
              maxLength={11}
              value={nin}
              onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
              placeholder="11-digit NIN"
            />
            <div className="mt-2">
              <MultiChoiceChips
                options={['No NIN yet, use a temporary ID']}
                values={noNin ? ['No NIN yet, use a temporary ID'] : []}
                onChange={(vals) => setNoNin(vals.length > 0)}
              />
            </div>
            <PrimaryButton variant="outline" compact onClick={handleNimcScan} className="mt-2.5">
              {nimcState === 'scanning'
                ? 'Scanning…'
                : nimcState === 'verified'
                  ? '✓ Verified with NIMC (simulated)'
                  : 'Scan thumb and verify with NIMC'}
            </PrimaryButton>
            <FieldLabel>Patient PIN for later visits (4 digits)</FieldLabel>
            <InputField
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 4821"
            />
            <div className="mt-2">
              <MultiChoiceChips
                options={['Patient consents to saving an encrypted fingerprint template']}
                values={consentFp ? ['Patient consents to saving an encrypted fingerprint template'] : []}
                onChange={(vals) => setConsentFp(vals.length > 0)}
              />
            </div>
            <div className="mt-1.5 text-xs" style={{ color: 'var(--mu)' }}>
              Saving templates is pending NIMC and NDPA approval.
            </div>
          </Card>
        )}

        <Card className="mt-3" style={{ backgroundColor: 'var(--gl)' }}>
          <div className="text-xs font-medium">The duplicate check runs on this device before saving.</div>
        </Card>

        <PrimaryButton
          onClick={() =>
            registerPatient({
              firstName,
              surname,
              sex,
              dob,
              phone,
              lga,
              address,
              bloodGroup,
              allergy,
              nin,
              noNin,
              pin,
              nimcVerified: nimcState === 'verified',
            })
          }
        >
          Save patient
        </PrimaryButton>
      </div>
    </div>
  );
};

export const VerifyScreen: React.FC = () => {
  const {
    state,
    setVerifyField,
    runThumbScan,
    confirmPinVerification,
    confirmSmsVerification,
    grantEmergencyVerification,
    grantQrVerification,
  } = useCareSync();
  const [pinInput, setPinInput] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');
  const p = state.pts[state.vs.pi] || state.pts[0];
  const scanning = state.vs.ph === 'scanning';

  return (
    <div>
      <ScreenHeader title="Verify patient" subtitle="The patient must be present" showBack />
      <div className="p-3.5">
        <Card className="flex items-center gap-3">
          <Avatar name={p.n} />
          <div>
            <div className="font-bold">{p.n}</div>
            <div className="text-xs" style={{ color: 'var(--mu)' }}>
              NIN {maskNin(p.nin)} • {p.id}
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>1. Connect the scanner</SectionTitle>
          <SingleChoiceChips
            options={['USB cable', 'Bluetooth']}
            value={state.vs.conn}
            onChange={(v) => setVerifyField('conn', v as 'USB cable' | 'Bluetooth')}
            centered
          />
          <div className="mt-2 text-center text-xs" style={{ color: 'var(--mu)' }}>
            ● Scanner connected (simulated)
          </div>
        </Card>

        <Card className="text-center">
          <SectionTitle className="text-left">2. Scan the patient thumb</SectionTitle>
          <SingleChoiceChips
            options={['Right thumb', 'Left thumb', 'Right index', 'Left index']}
            value={state.vs.fin}
            onChange={(v) => setVerifyField('fin', v as typeof state.vs.fin)}
            centered
          />

          <button
            type="button"
            onClick={runThumbScan}
            className={`mx-auto my-3.5 flex h-28 w-28 items-center justify-center rounded-full border-4 transition-all ${
              scanning ? 'animate-makset-blink' : ''
            }`}
            style={{
              borderColor: state.vs.ph === 'fail' ? 'var(--rd)' : 'var(--g)',
              backgroundColor: 'var(--gl)',
            }}
          >
            <Fingerprint className="h-14 w-14" style={{ color: state.vs.ph === 'fail' ? 'var(--rd)' : 'var(--g)' }} />
          </button>

          <div className="text-sm font-bold">
            {scanning ? 'Scanning… hold still' : 'Tap, then place the thumb on the scanner'}
          </div>
          {state.vs.msg && (
            <div className="mt-2 text-xs font-bold" style={{ color: 'var(--rd)' }}>
              {state.vs.msg}
            </div>
          )}

          <FieldLabel className="mt-3">Simulation outcome</FieldLabel>
          <SingleChoiceChips
            options={['Match', 'No match']}
            value={state.vs.sim}
            onChange={(v) => setVerifyField('sim', v as 'Match' | 'No match')}
            centered
          />
        </Card>

        <Card>
          <SectionTitle>Other ways to confirm</SectionTitle>
          <FieldLabel>Patient PIN (demo PIN: {p.pin || '1234'})</FieldLabel>
          <div className="flex items-center gap-2">
            <InputField
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="4-digit PIN"
            />
            <PrimaryButton compact className="!my-0 !w-auto px-4" onClick={() => confirmPinVerification(pinInput)}>
              Confirm
            </PrimaryButton>
          </div>
          <PrimaryButton variant="outline" compact className="mt-2.5" onClick={grantQrVerification}>
            Scan patient QR card
          </PrimaryButton>
          <PrimaryButton variant="outline" compact onClick={confirmSmsVerification}>
            Code by SMS (needs internet)
          </PrimaryButton>
        </Card>

        <Card style={{ borderColor: 'var(--rd)' }}>
          <SectionTitle className="!text-[var(--rd)]">Emergency access</SectionTitle>
          <div className="text-xs" style={{ color: 'var(--mu)' }}>
            Only when the patient cannot be verified, for example unconscious. It is logged and flagged on the record.
          </div>
          <InputField
            className="mt-2"
            value={emergencyReason}
            onChange={(e) => setEmergencyReason(e.target.value)}
            placeholder="Reason (required)"
          />
          <PrimaryButton variant="danger" onClick={() => grantEmergencyVerification(emergencyReason)}>
            Open record in emergency
          </PrimaryButton>
        </Card>

        <Card style={{ backgroundColor: 'var(--gl)' }}>
          <div className="text-xs font-medium">No patient record is shown until the identity is confirmed.</div>
        </Card>
      </div>
    </div>
  );
};

export const ProfileScreen: React.FC = () => {
  const {
    state,
    currentPatient,
    setProfileTab,
    go,
    openTask,
    openOpenEncounter,
    pendingLabsForEncounter,
  } = useCareSync();

  const p = currentPatient;
  const mine = state.E.filter((e) => e.pi === state.cur);
  const latest = mine[mine.length - 1];

  // Lab-only patient view
  if (state.role === 'lab') {
    const pendingTasks = state.lab.filter((t) => t.p === p.n);
    const pastResults: string[] = [];
    mine.forEach((e) => e.res.forEach((z) => pastResults.push(`${e.time} • ${z}`)));
    return (
      <div>
        <ScreenHeader title={p.n} subtitle={`Patient ID: ${p.id}`} showBack />
        <div className="p-3.5">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--gl)', color: 'var(--g)' }}>
              {p.s}
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--gl)', color: 'var(--g)' }}>
              {p.a}
            </span>
          </div>
          {p.al && (
            <Card style={{ backgroundColor: 'var(--rdl)', borderColor: 'var(--rd)' }}>
              <div className="text-xs font-semibold" style={{ color: 'var(--rd)' }}>
                ⚠ {p.al}
              </div>
            </Card>
          )}
          <SectionTitle className="mt-3">Pending investigations</SectionTitle>
          {pendingTasks.length ? (
            pendingTasks.map((t) => (
              <ListRowCard key={t.id} blink onClick={() => openTask('lab', state.lab.indexOf(t))}>
                <div>
                  <div className="text-sm font-bold">{t.t}</div>
                  <div className="text-xs" style={{ color: 'var(--mu)' }}>
                    Tap to enter results
                  </div>
                </div>
              </ListRowCard>
            ))
          ) : (
            <Card>
              <div className="text-sm" style={{ color: 'var(--mu)' }}>
                None waiting.
              </div>
            </Card>
          )}
          <SectionTitle className="mt-3">Previous lab results</SectionTitle>
          {pastResults.length ? (
            pastResults.map((z, i) => (
              <Card key={i}>
                <div className="text-xs">{z}</div>
              </Card>
            ))
          ) : (
            <Card>
              <div className="text-sm" style={{ color: 'var(--mu)' }}>
                None on record.
              </div>
            </Card>
          )}
          <Card style={{ backgroundColor: 'var(--gl)' }}>
            <div className="text-xs font-medium">Your role has laboratory access only.</div>
          </Card>
        </div>
      </div>
    );
  }

  const pendingLabCount = state.lab.filter((x) => x.p === p.n).length;

  return (
    <div>
      <ScreenHeader
        title={p.n}
        subtitle={`Patient ID: ${p.id}`}
        showBack
        rightSlot={
          <button
            type="button"
            aria-label="Patient history"
            onClick={() => go('hist')}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl active:bg-white/15"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        }
      />
      <div className="p-3.5">
        <div className="mb-3 flex gap-1.5">
          {[p.s, p.a, p.bg].map((tag, i) => (
            <span
              key={i}
              className="flex-1 rounded-full px-3 py-1.5 text-center text-xs font-semibold"
              style={{ backgroundColor: 'var(--gl)', color: 'var(--g)' }}
            >
              {tag}
            </span>
          ))}
        </div>

        {p.al && (
          <div
            className="mb-3 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
            style={{ backgroundColor: 'var(--rdl)', color: 'var(--rd)' }}
          >
            <AlertTriangle className="h-4 w-4 flex-none" />
            <span>{p.al}</span>
          </div>
        )}

        {state.ninEnabled && (
          <div className="mb-2 text-xs" style={{ color: 'var(--mu)' }}>
            NIN {maskNin(p.nin)} •{' '}
            <b style={{ color: 'var(--g)' }}>
              {p.idv === 'Verified' ? 'Identity verified (NIMC)' : 'Identity not verified'}
            </b>
          </div>
        )}

        {state.brk[state.cur] && (
          <div
            className="mb-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
            style={{ backgroundColor: 'var(--rdl)', color: 'var(--rd)' }}
          >
            ⚠ Opened by emergency override. Reason: {state.brk[state.cur]}. Verify the patient as soon as possible.
          </div>
        )}

        <PrimaryButton onClick={() => go('sel')}>Start New Encounter</PrimaryButton>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          <PrimaryButton variant="outline" compact onClick={() => go('hist')}>
            Patient History
          </PrimaryButton>
          <PrimaryButton variant="outline" compact onClick={() => go('shr')}>
            Share History
          </PrimaryButton>
          <PrimaryButton variant="outline" compact onClick={() => go('ref')}>
            Refer Patient
          </PrimaryButton>
        </div>

        <div className="my-3 flex border-b" style={{ borderColor: 'var(--ln)' }}>
          {(['Summary', 'History', 'Services'] as const).map((tab) => {
            const active = state.tab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setProfileTab(tab)}
                className="min-h-[44px] flex-1 border-b-2 text-sm transition-colors"
                style={{
                  borderColor: active ? 'var(--g)' : 'transparent',
                  color: active ? 'var(--g)' : 'var(--mu)',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {state.tab === 'Summary' && (
          <div>
            {[
              {
                icon: <Calendar className="h-5 w-5" style={{ color: 'var(--g)' }} />,
                title: 'Recent encounter',
                sub: latest ? `${latest.time} • ${latest.t}` : 'No encounters yet',
              },
              {
                icon: <Pill className="h-5 w-5" style={{ color: 'var(--g)' }} />,
                title: 'Medications',
                sub: latest && latest.rx.length ? latest.rx.join(', ') : 'None recorded',
              },
              {
                icon: <FlaskConical className="h-5 w-5" style={{ color: 'var(--g)' }} />,
                title: 'Laboratory',
                sub: pendingLabCount ? `${pendingLabCount} pending` : 'No pending results',
              },
              {
                icon: <Stethoscope className="h-5 w-5" style={{ color: 'var(--g)' }} />,
                title: 'Maternal / clinical care',
                sub: p.s === 'Female' ? 'ANC & OPD records on device' : 'Pediatric / OPD records on device',
              },
            ].map((row) => (
              <ListRowCard key={row.title} onClick={() => go('encs')}>
                {row.icon}
                <div>
                  <div className="text-sm font-bold">{row.title}</div>
                  <div className="text-xs" style={{ color: 'var(--mu)' }}>
                    {row.sub}
                  </div>
                </div>
              </ListRowCard>
            ))}
          </div>
        )}

        {state.tab === 'History' && (
          <div>
            {mine.length ? (
              mine
                .slice()
                .reverse()
                .map((e) => {
                  const isOpen = e.status === 'open';
                  const pendCount = pendingLabsForEncounter(e.uid).length;
                  return (
                    <Card key={e.uid}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">
                          {e.t} • {e.time}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: e.sync ? 'var(--gl)' : 'var(--aml)',
                            color: e.sync ? 'var(--g)' : 'var(--tx)',
                          }}
                        >
                          {isOpen ? (pendCount ? 'Awaiting lab' : 'Results ready') : e.sync ? 'Synced' : 'Pending'}
                        </span>
                      </div>
                      {e.cc && (
                        <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
                          Complaint: {e.cc}
                        </div>
                      )}
                      {e.labs.length > 0 && (
                        <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
                          Investigations ordered: {e.labs.join(', ')}
                        </div>
                      )}
                      {e.labs.length > 0 && (
                        <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
                          {e.res.length ? `Results: ${e.res.join('; ')}` : 'Results: pending'}
                        </div>
                      )}
                      {e.dx && (
                        <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
                          Diagnosis: {e.dx}
                          {e.dxm ? ` (${e.dxm})` : ''}
                        </div>
                      )}
                      {e.rx.length > 0 && (
                        <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
                          Medication: {e.rx.join(', ')} • {e.rxs || 'awaiting pharmacy'}
                        </div>
                      )}
                      {e.out && (
                        <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
                          Outcome: {e.out}
                        </div>
                      )}
                      {e.bypass && (
                        <div className="mt-1 text-xs font-bold" style={{ color: 'var(--rd)' }}>
                          ⚠ Lab result bypassed. Reason: {e.bypass}
                        </div>
                      )}
                      <div className="mt-1.5 text-[11px]" style={{ color: 'var(--mu)' }}>
                        Recorded by {e.by}
                      </div>
                      {isOpen && (
                        <PrimaryButton
                          variant="outline"
                          compact
                          className="mt-2"
                          onClick={() => openOpenEncounter(e.uid)}
                        >
                          Continue encounter
                        </PrimaryButton>
                      )}
                    </Card>
                  );
                })
            ) : (
              <Card>
                <div className="text-sm" style={{ color: 'var(--mu)' }}>
                  No previous encounters yet.
                </div>
              </Card>
            )}
          </div>
        )}

        {state.tab === 'Services' && (
          <div>
            <Card>
              <div className="text-sm font-bold">Immunization</div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                The schedule loads from approved NPHCDA national master data
              </div>
              <PrimaryButton compact variant="outline" className="mt-2" onClick={() => go('sel')}>
                Open immunization register
              </PrimaryButton>
            </Card>
            <Card>
              <div className="text-sm font-bold">Referrals</div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                {state.ref.filter((r) => r.pi === state.cur).length} referral(s) recorded
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export const HistoryScreen: React.FC = () => {
  const { state, currentPatient, go, openOpenEncounter, pendingLabsForEncounter } = useCareSync();
  const mine = state.E.filter((e) => e.pi === state.cur).slice().reverse();
  const latest = mine[0];

  return (
    <div>
      <ScreenHeader title="Patient History" subtitle={`${currentPatient.n} • ${currentPatient.id}`} showBack />
      <div className="p-3.5">
        {currentPatient.al && (
          <div
            className="mb-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
            style={{ backgroundColor: 'var(--rdl)', color: 'var(--rd)' }}
          >
            ⚠ {currentPatient.al}
          </div>
        )}

        <Card style={{ backgroundColor: 'var(--gl)' }}>
          <SectionTitle>Most recent</SectionTitle>
          {latest ? (
            <div className="text-xs space-y-0.5">
              <div className="text-sm font-bold">
                {latest.t} • {latest.time}
              </div>
              {latest.dx && <div style={{ color: 'var(--mu)' }}>Diagnosis: {latest.dx}</div>}
              {latest.rx.length > 0 && <div style={{ color: 'var(--mu)' }}>Treatment: {latest.rx.join(', ')}</div>}
              <div style={{ color: 'var(--mu)' }}>
                Outcome: {latest.out || 'Not recorded'}
                {currentPatient.al ? ` • Allergy: ${currentPatient.al}` : ''}
              </div>
            </div>
          ) : (
            <div className="text-xs">
              <b>First visit.</b> No previous history on record.
            </div>
          )}
        </Card>

        {mine.length ? (
          mine.map((e) => {
            const isOpen = e.status === 'open';
            const pendCount = pendingLabsForEncounter(e.uid).length;
            return (
              <Card key={e.uid}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">
                    {e.t} • {e.time}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: e.sync ? 'var(--gl)' : 'var(--aml)' }}
                  >
                    {isOpen ? (pendCount ? 'Awaiting lab' : 'Results ready') : e.sync ? 'Synced' : 'Pending'}
                  </span>
                </div>
                {e.cc && (
                  <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
                    Complaint: {e.cc}
                  </div>
                )}
                {e.res.length > 0 && (
                  <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
                    Results: {e.res.join('; ')}
                  </div>
                )}
                {e.dx && (
                  <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
                    Diagnosis: {e.dx}
                  </div>
                )}
                {e.rx.length > 0 && (
                  <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
                    Meds: {e.rx.join(', ')} ({e.rxs || 'awaiting pharmacy'})
                  </div>
                )}
                {e.bypass && (
                  <div className="mt-1 text-xs font-bold" style={{ color: 'var(--rd)' }}>
                    ⚠ Lab bypassed: {e.bypass}
                  </div>
                )}
                {e.x &&
                  Object.entries(e.x)
                    .filter(([, v]) => Boolean(v))
                    .slice(0, 6)
                    .map(([k, v]) => (
                      <div key={k} className="mt-0.5 text-xs" style={{ color: 'var(--mu)' }}>
                        {k}: {v}
                      </div>
                    ))}
                {isOpen && (
                  <PrimaryButton
                    variant="outline"
                    compact
                    className="mt-2"
                    onClick={() => openOpenEncounter(e.uid)}
                  >
                    Continue encounter
                  </PrimaryButton>
                )}
              </Card>
            );
          })
        ) : (
          <Card>
            <div className="text-sm" style={{ color: 'var(--mu)' }}>
              No previous encounters yet.
            </div>
          </Card>
        )}

        <PrimaryButton onClick={() => go('sel')}>Start New Encounter</PrimaryButton>
        <PrimaryButton variant="outline" onClick={() => go('shr')}>
          <Share2 className="h-4 w-4" />
          Share this history
        </PrimaryButton>
      </div>
    </div>
  );
};

export const ShareHistoryScreen: React.FC = () => {
  const { state, currentPatient, shareHistory, toast } = useCareSync();
  const [recipient, setRecipient] = useState(
    state.facilities.filter((f) => f.name !== state.fac)[0]?.name || 'Bauchi General Hospital',
  );
  const [contact, setContact] = useState('');
  const [reason, setReason] = useState('Referral');
  const [includeFields, setIncludeFields] = useState([
    'Allergies',
    'Diagnoses',
    'Medications',
    'Lab results',
    'Immunization',
    'ANC summary',
  ]);
  const [consent, setConsent] = useState('Given verbally');

  const mine = state.E.filter((e) => e.pi === state.cur);

  const summaryText = [
    `MaKSET CareSync Patient History Summary`,
    `Patient: ${currentPatient.n} (${currentPatient.id})`,
    `To: ${recipient} | Reason: ${reason} | Consent: ${consent}`,
    currentPatient.al ? `Allergy: ${currentPatient.al}` : '',
    ...mine.map((e) => `${e.time} • ${e.t}: ${e.dx || 'Recorded'} | ${e.rx.join(', ') || 'No medication'}`),
  ]
    .filter(Boolean)
    .join('\n');

  const handleShare = async (method: string) => {
    shareHistory(method);
    if (method === 'WhatsApp' || method === 'SMS' || method === 'secure link') {
      await shareTextOrUrl('MaKSET Patient History', summaryText, method, contact, toast);
    } else if (method === 'print') {
      window.print();
    }
  };

  return (
    <div>
      <ScreenHeader title="Share History" subtitle={`${currentPatient.n} • ${currentPatient.id}`} showBack />
      <div className="p-3.5">
        <Card style={{ backgroundColor: 'var(--gl)' }}>
          <SectionTitle>Summary to be shared</SectionTitle>
          {currentPatient.al && (
            <div className="text-xs" style={{ color: 'var(--mu)' }}>
              Allergy: {currentPatient.al}
            </div>
          )}
          {mine.length ? (
            mine.map((e) => (
              <div key={e.uid} className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
                {e.time} • {e.t}: {e.dx || 'Visit recorded'} • {e.rx.join(', ') || 'no medication'}
              </div>
            ))
          ) : (
            <div className="text-xs" style={{ color: 'var(--mu)' }}>
              No encounters to share yet.
            </div>
          )}
        </Card>

        <FieldLabel>Send to</FieldLabel>
        <SelectField value={recipient} onChange={(e) => setRecipient(e.target.value)}>
          {state.facilities.filter((f) => f.name !== state.fac).map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
          <option value="Private doctor or clinic">Private doctor or clinic</option>
        </SelectField>

        <FieldLabel>Recipient phone or email</FieldLabel>
        <InputField
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Optional, for WhatsApp or SMS"
        />

        <FieldLabel>Reason</FieldLabel>
        <SingleChoiceChips
          options={['Referral', 'Transfer of care', 'Second opinion']}
          value={reason}
          onChange={setReason}
        />

        <FieldLabel>Include</FieldLabel>
        <MultiChoiceChips
          options={['Allergies', 'Diagnoses', 'Medications', 'Lab results', 'Immunization', 'ANC summary']}
          values={includeFields}
          onChange={setIncludeFields}
        />

        <FieldLabel>Patient consent</FieldLabel>
        <SingleChoiceChips
          options={['Given verbally', 'Given in writing']}
          value={consent}
          onChange={setConsent}
        />

        <PrimaryButton className="mt-3" onClick={() => handleShare('secure link')}>
          Share via secure link
        </PrimaryButton>
        <div className="grid grid-cols-3 gap-2">
          <PrimaryButton variant="outline" compact onClick={() => handleShare('WhatsApp')}>
            WhatsApp
          </PrimaryButton>
          <PrimaryButton variant="outline" compact onClick={() => handleShare('SMS')}>
            SMS
          </PrimaryButton>
          <PrimaryButton variant="outline" compact onClick={() => handleShare('print')}>
            Print
          </PrimaryButton>
        </div>

        {state.sh.length > 0 && (
          <div className="mt-4">
            <SectionTitle>Sharing log</SectionTitle>
            {state.sh.map((entry, idx) => (
              <Card key={idx}>
                <div className="text-xs font-bold">{entry}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
