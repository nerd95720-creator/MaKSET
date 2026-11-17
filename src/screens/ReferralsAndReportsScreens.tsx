import React, { useState } from 'react';
import {
  buildSummaryLines,
  DASHBOARD_LEVELS,
  IDSR_SIGNALS,
} from '../data/seedData';
import { downloadTextFile } from '../lib/capacitor';
import { shareTextOrUrl } from '../lib/shareUtils';
import { useCareSync } from '../store/useCareSyncStore';
import { DashboardLevelKey, Referral } from '../types/caresync';
import {
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
  TextareaField,
} from '../components/UiPrimitives';

export const ReferPatientScreen: React.FC = () => {
  const { state, currentPatient, createReferral } = useCareSync();
  const otherFacilities = state.facilities.filter((f) => f.name !== state.fac);
  const nearestHospital = otherFacilities.find((f) => f.type === 'Hospital');
  const [toFacility, setToFacility] = useState(
    nearestHospital?.name || otherFacilities[0]?.name || 'Bauchi General Hospital',
  );
  const [reason, setReason] = useState('Severe malaria with persistent vomiting');
  const [urgency, setUrgency] = useState<Referral['ur']>('Urgent');
  const [treatmentGiven, setTreatmentGiven] = useState('Artesunate IM, first dose');
  const summaryLines = buildSummaryLines(state.cur, state.pts, state.E);

  return (
    <div>
      <ScreenHeader title="Refer Patient" subtitle={`${currentPatient.n} • From ${state.fac}`} showBack />
      <div className="p-3.5">
        <FieldLabel>Receiving facility (registered on MaKSET)</FieldLabel>
        <SelectField value={toFacility} onChange={(e) => setToFacility(e.target.value)}>
          {otherFacilities.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name} ({f.type}, {f.lga})
            </option>
          ))}
        </SelectField>
        {nearestHospital && (
          <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
            Suggested for emergencies: {nearestHospital.name} ({nearestHospital.lga})
          </div>
        )}

        <FieldLabel>Reason for referral</FieldLabel>
        <TextareaField rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />

        <FieldLabel>Urgency</FieldLabel>
        <SingleChoiceChips
          options={['Emergency', 'Urgent', 'Routine']}
          value={urgency}
          onChange={(v) => setUrgency(v as Referral['ur'])}
        />

        <FieldLabel>Treatment already given</FieldLabel>
        <InputField
          value={treatmentGiven}
          onChange={(e) => setTreatmentGiven(e.target.value)}
          placeholder="e.g. Artesunate IM, first dose"
        />

        <Card className="mt-3" style={{ backgroundColor: 'var(--gl)' }}>
          <SectionTitle>Sent automatically with the referral</SectionTitle>
          <div className="space-y-0.5">
            {summaryLines.map((line, i) => (
              <div key={i} className="text-xs" style={{ color: 'var(--mu)' }}>
                {line}
              </div>
            ))}
          </div>
        </Card>

        <PrimaryButton
          onClick={() => createReferral({ to: toFacility, reason, urgency, treatmentGiven })}
        >
          Send referral automatically
        </PrimaryButton>
      </div>
    </div>
  );
};

export const ReferralNoteScreen: React.FC = () => {
  const { state, go, toast } = useCareSync();
  const r = state.ref.find((item) => item.id === state.lastReferralId) || state.ref[0];
  const p = state.pts[r.pi] || state.pts[0];

  const noteText = `REFERRAL NOTE
From: ${r.from}
To: ${r.to}
Patient: ${p.n} (${p.id})
Reason: ${r.reason}
Treatment given: ${r.tx}
Urgency: ${r.ur}

${r.sum.join('\n')}`;

  return (
    <div>
      <ScreenHeader title="Referral sent" subtitle={p.n} showBack />
      <div className="p-3.5">
        <Card style={{ borderColor: 'var(--g)' }}>
          <div className="text-sm font-bold">
            {r.st === 'Queued'
              ? '⏳ Queued. Sends automatically when online'
              : `✓ Delivered to ${r.to}`}
          </div>
          <div className="text-xs" style={{ color: 'var(--mu)' }}>
            {r.id} • {r.time}
          </div>
        </Card>

        <Card>
          <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">{noteText}</pre>
        </Card>

        <div className="mb-1 text-xs" style={{ color: 'var(--mu)' }}>
          Backup if the receiving facility has no signal:
        </div>
        <PrimaryButton
          variant="whatsapp"
          onClick={() => shareTextOrUrl('MaKSET Referral Note', noteText, 'WhatsApp', undefined, toast)}
        >
          Share via WhatsApp
        </PrimaryButton>
        <PrimaryButton
          variant="outline"
          onClick={() => shareTextOrUrl('MaKSET Referral Note', noteText, 'SMS', undefined, toast)}
        >
          Share via SMS
        </PrimaryButton>
        <PrimaryButton variant="outline" onClick={() => go('refs', true)}>
          View all referrals
        </PrimaryButton>
      </div>
    </div>
  );
};

export const ReferralsListScreen: React.FC = () => {
  const { state, go, acceptReferral, openReferralOutcome } = useCareSync();
  const outgoing = state.ref.filter((r) => r.from === state.fac);
  const incoming = state.ref.filter((r) => r.to === state.fac && r.st !== 'Queued');
  const [tab, setTab] = useState<'Outgoing' | 'Incoming'>(
    incoming.some((r) => r.st !== 'Completed') && outgoing.length === 0 ? 'Incoming' : 'Outgoing',
  );

  return (
    <div>
      <ScreenHeader title="Referrals" subtitle={state.fac} showBack />
      <div className="p-3.5">
        <div className="mb-3 flex gap-2">
          <SingleChoiceChips
            options={[`Outgoing (${outgoing.length})`, `Incoming (${incoming.length})`]}
            value={tab === 'Outgoing' ? `Outgoing (${outgoing.length})` : `Incoming (${incoming.length})`}
            onChange={(val) => setTab(val.startsWith('Incoming') ? 'Incoming' : 'Outgoing')}
          />
        </div>

        {tab === 'Outgoing' ? (
          <>
            {outgoing.length ? (
              outgoing.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{r.p}</span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{
                        backgroundColor: r.st === 'Completed' ? 'var(--gl)' : 'var(--aml)',
                        color: r.st === 'Completed' ? 'var(--g)' : 'var(--tx)',
                      }}
                    >
                      {r.st}
                    </span>
                  </div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
                    To {r.to} • {r.ur} • {r.time}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--mu)' }}>
                    {r.reason}
                  </div>
                  {r.fb ? (
                    <div className="mt-1.5 text-xs font-semibold" style={{ color: 'var(--g)' }}>
                      Feedback: {r.fb}
                    </div>
                  ) : (
                    <div className="mt-1.5 text-xs" style={{ color: 'var(--mu)' }}>
                      Awaiting feedback
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <Card>
                <div className="text-sm" style={{ color: 'var(--mu)' }}>
                  No outgoing referrals from {state.fac} yet.
                </div>
              </Card>
            )}
            <PrimaryButton variant="outline" onClick={() => go('search')}>
              Send new patient referral
            </PrimaryButton>
          </>
        ) : incoming.length ? (
          incoming.map((r) => (
            <Card key={r.id} blink={r.st === 'Delivered'}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{r.p}</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: r.ur === 'Emergency' ? 'var(--rdl)' : 'var(--gl)',
                    color: r.ur === 'Emergency' ? 'var(--rd)' : 'var(--g)',
                  }}
                >
                  {r.ur}
                </span>
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
                From {r.from} • {r.time}
              </div>
              <div className="mt-1 text-xs">
                <b>Reason:</b> {r.reason}
              </div>
              {r.sum.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {r.sum.map((line, i) => (
                    <div key={i} className="text-xs" style={{ color: 'var(--mu)' }}>
                      {line}
                    </div>
                  ))}
                </div>
              )}
              {r.st === 'Delivered' && (
                <PrimaryButton compact className="mt-3" onClick={() => acceptReferral(r.id)}>
                  Accept referral
                </PrimaryButton>
              )}
              {r.st === 'Accepted' && (
                <PrimaryButton compact className="mt-3" onClick={() => openReferralOutcome(r.id)}>
                  Record outcome
                </PrimaryButton>
              )}
              {r.st === 'Completed' && (
                <div className="mt-2 text-xs font-semibold" style={{ color: 'var(--g)' }}>
                  Completed: {r.fb}
                </div>
              )}
            </Card>
          ))
        ) : (
          <Card>
            <div className="text-sm" style={{ color: 'var(--mu)' }}>
              No incoming referrals to {state.fac} yet.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export const ReferralOutcomeScreen: React.FC = () => {
  const { state, submitReferralOutcome } = useCareSync();
  const r = state.ref[state.refIndex] || state.ref[0];
  const [outcome, setOutcome] = useState('Treated and discharged');
  const [note, setNote] = useState('');

  if (!r) return null;

  return (
    <div>
      <ScreenHeader title="Referral outcome" subtitle={r.p} showBack />
      <div className="p-3.5">
        <FieldLabel>Outcome</FieldLabel>
        <SingleChoiceChips
          options={['Treated and discharged', 'Admitted', 'Referred further', 'Patient did not arrive']}
          value={outcome}
          onChange={setOutcome}
        />
        <FieldLabel>Feedback note</FieldLabel>
        <InputField value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        <PrimaryButton className="mt-3" onClick={() => submitReferralOutcome(r.id, outcome, note)}>
          Send feedback to {r.from}
        </PrimaryButton>
      </div>
    </div>
  );
};

export const ReportsScreen: React.FC = () => {
  const { state, go, toast } = useCareSync();

  const opdCount = 212 + state.E.filter((e) => e.t === 'OPD').length + state.pending;
  const ancCount = 37 + state.E.filter((e) => e.t === 'ANC').length;
  const immCount = 63 + state.E.filter((e) => e.t === 'Immunization').length;
  const refCount = state.ref.length;

  const handleExport = () => {
    const csv = [
      'Facility,Indicator,Count',
      `${state.fac},OPD Attendances,${opdCount}`,
      `${state.fac},ANC Visits,${ancCount}`,
      `${state.fac},Immunizations,${immCount}`,
      `${state.fac},Referrals,${refCount}`,
    ].join('\n');
    downloadTextFile('makset-azare-phc-monthly-summary.csv', csv);
    toast('Monthly summary exported as CSV for LGA reporting');
  };

  return (
    <div>
      <ScreenHeader title="Reports" subtitle="Monthly summary, generated automatically" />
      <div className="p-3.5">
        <Card>
          <SectionTitle>Monthly Summary • {state.fac}</SectionTitle>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--g)' }}>
                {opdCount}
              </div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                OPD attendances
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--g)' }}>
                {ancCount}
              </div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                ANC visits
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--g)' }}>
                {immCount}
              </div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                Immunizations
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--g)' }}>
                {refCount}
              </div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                Referrals
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ backgroundColor: 'var(--gl)' }}>
          <div className="text-xs font-medium">
            No re-entry needed. These figures come from the visits you already recorded.
          </div>
        </Card>

        <PrimaryButton variant="outline" onClick={handleExport}>
          Export monthly summary
        </PrimaryButton>
        <PrimaryButton variant="outline" onClick={() => go('dash')}>
          Open dashboards
        </PrimaryButton>
        <PrimaryButton variant="outline" onClick={() => go('surv')}>
          Surveillance and signals
        </PrimaryButton>
      </div>
    </div>
  );
};

export const DashboardsScreen: React.FC = () => {
  const { state, setDashboardLevel, go } = useCareSync();
  const levels = Object.keys(DASHBOARD_LEVELS) as DashboardLevelKey[];
  const d = DASHBOARD_LEVELS[state.lv];
  const maxVal = Math.max(...d.b.map((x) => x[1]), 1);

  return (
    <div>
      <ScreenHeader title="Dashboards" subtitle="Illustrative data only" showBack />
      <div className="p-3.5">
        <div className="mb-3">
          <SingleChoiceChips
            options={levels}
            value={state.lv}
            onChange={(val) => setDashboardLevel(val as DashboardLevelKey)}
          />
        </div>

        {state.off && state.lv !== 'PHC' && (
          <div
            className="mb-3 rounded-xl px-3.5 py-2.5 text-xs font-medium"
            style={{ backgroundColor: 'var(--aml)' }}
          >
            Offline. Showing figures from the last sync.
          </div>
        )}

        <Card>
          <div className="font-bold">{d.t}</div>
          <div className="text-xs" style={{ color: 'var(--mu)' }}>
            {d.s}. Access is limited to your geography.
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2.5">
          {d.k.map(([label, val]) => (
            <Card key={label} className="!mb-0">
              <div className="text-xl font-bold" style={{ color: 'var(--g)' }}>
                {val}
              </div>
              <div className="text-xs" style={{ color: 'var(--mu)' }}>
                {label}
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-2.5">
          <SectionTitle>{d.bt}</SectionTitle>
          <div className="mt-3 flex h-28 items-end gap-2 pb-5">
            {d.b.map(([lbl, val]) => (
              <div
                key={lbl}
                className="relative flex-1 rounded-t-md transition-all"
                style={{
                  height: `${Math.max(4, Math.round((val / maxVal) * 100))}%`,
                  backgroundColor: 'var(--g)',
                }}
              >
                <span
                  className="absolute -bottom-5 left-0 right-0 text-center text-[10px]"
                  style={{ color: 'var(--mu)' }}
                >
                  {lbl}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {d.rh.map((h) => (
                  <th key={h} className="border-b py-2 text-left font-semibold" style={{ borderColor: 'var(--ln)', color: 'var(--mu)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.r.map((row, idx) => (
                <tr key={idx}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border-b py-2"
                      style={{
                        borderColor: 'var(--ln)',
                        color:
                          cell === 'Alert'
                            ? 'var(--rd)'
                            : cell === 'Watch' || cell === 'Late'
                              ? '#b07a00'
                              : undefined,
                        fontWeight: cell === 'Alert' || cell === 'Watch' || cell === 'Late' ? 700 : undefined,
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {(state.lv === 'NCDC' || state.lv === 'State' || state.lv === 'LGA') && (
          <PrimaryButton onClick={() => go('surv')}>Review surveillance signals</PrimaryButton>
        )}
      </div>
    </div>
  );
};

export const SurveillanceScreen: React.FC = () => {
  const { go, showModal, closeModal } = useCareSync();

  const inspectSignal = (signal: [string, string, string, 'Alert' | 'Watch' | 'Normal']) => {
    showModal({
      title: signal[0],
      body: (
        <div className="space-y-2.5 text-sm">
          <div className="text-xs" style={{ color: 'var(--mu)' }}>
            Location: {signal[1]} • Volume: {signal[2]} • Level: {signal[3]}
          </div>
          <p className="text-xs leading-relaxed">
            Threshold indicators are reviewed jointly by the LGA Disease Surveillance Notification Officer (DSNO) and
            State epidemiologist before any outbreak declaration.
          </p>
          <PrimaryButton compact onClick={closeModal}>
            Close
          </PrimaryButton>
        </div>
      ),
    });
  };

  return (
    <div>
      <ScreenHeader title="Surveillance" subtitle="IDSR signals" showBack />
      <div className="p-3.5">
        <Card style={{ backgroundColor: 'var(--gl)' }}>
          <div className="text-xs leading-relaxed">
            Signals are indicators for review by authorised public-health staff. The app never declares an outbreak by
            itself.
          </div>
        </Card>

        {IDSR_SIGNALS.map((s) => (
          <ListRowCard key={s[0]} onClick={() => inspectSignal(s)}>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{s[0]}</div>
                <div className="text-xs" style={{ color: 'var(--mu)' }}>
                  {s[1]} • {s[2]}
                </div>
              </div>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{
                  backgroundColor:
                    s[3] === 'Alert' ? 'var(--rdl)' : s[3] === 'Watch' ? 'var(--aml)' : 'var(--gl)',
                  color: s[3] === 'Alert' ? 'var(--rd)' : s[3] === 'Watch' ? '#b07a00' : 'var(--g)',
                }}
              >
                {s[3]}
              </span>
            </div>
          </ListRowCard>
        ))}

        <PrimaryButton onClick={() => go('cs')}>Notify a suspected case</PrimaryButton>
      </div>
    </div>
  );
};

export const CaseNotificationScreen: React.FC = () => {
  const { currentPatient, submitSurveillanceCase } = useCareSync();
  const [disease, setDisease] = useState('Cholera');
  const [onsetDate, setOnsetDate] = useState('2026-10-27');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [sampleTaken, setSampleTaken] = useState('No');
  const [notes, setNotes] = useState('');

  return (
    <div>
      <ScreenHeader title="Case notification" subtitle={`${currentPatient.n} • ${currentPatient.id}`} showBack />
      <div className="p-3.5">
        <FieldLabel>Suspected disease</FieldLabel>
        <SelectField value={disease} onChange={(e) => setDisease(e.target.value)}>
          <option>Cholera</option>
          <option>Measles</option>
          <option>Lassa fever</option>
          <option>Meningitis</option>
          <option>Acute flaccid paralysis</option>
        </SelectField>

        <FieldLabel>Date of onset</FieldLabel>
        <InputField type="date" value={onsetDate} onChange={(e) => setOnsetDate(e.target.value)} />

        <FieldLabel>Signs and symptoms</FieldLabel>
        <MultiChoiceChips
          options={['Fever', 'Watery diarrhoea', 'Vomiting', 'Rash', 'Stiff neck', 'Bleeding']}
          values={symptoms}
          onChange={setSymptoms}
        />

        <FieldLabel>Sample taken</FieldLabel>
        <SingleChoiceChips options={['No', 'Yes']} value={sampleTaken} onChange={setSampleTaken} />

        <FieldLabel>Notes</FieldLabel>
        <TextareaField rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <PrimaryButton className="mt-3" onClick={submitSurveillanceCase}>
          Submit notification
        </PrimaryButton>
      </div>
    </div>
  );
};
