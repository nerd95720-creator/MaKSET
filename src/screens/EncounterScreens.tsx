import React, { useEffect, useState } from 'react';
import {
  Baby,
  BedDouble,
  Calendar,
  Mic,
  Scale,
  Stethoscope,
  Syringe,
  UserCheck,
} from 'lucide-react';
import {
  ALL_VACCINES,
  ENCOUNTER_FLAGS,
  ENCOUNTER_OUTCOMES,
  LAB_TESTS,
  MEDICATIONS,
  NPHCDA_SCHEDULE,
} from '../data/seedData';
import { useCareSync } from '../store/useCareSyncStore';
import {
  Card,
  FieldLabel,
  InputField,
  MultiChoiceChips,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
  SingleChoiceChips,
  TextareaField,
} from '../components/UiPrimitives';

export const SelectEncounterScreen: React.FC = () => {
  const { state, currentPatient, setEncounterType, go } = useCareSync();
  const mine = state.E.filter((e) => e.pi === state.cur);
  const latest = mine[mine.length - 1];

  const types: { label: string; targetType: string; screen: 'opd' | 'gen'; icon: React.ReactNode }[] = [
    { label: 'OPD', targetType: 'OPD', screen: 'opd', icon: <Stethoscope className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
    { label: 'Inpatient', targetType: 'Inpatient', screen: 'gen', icon: <BedDouble className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
    { label: 'ANC', targetType: 'ANC', screen: 'gen', icon: <UserCheck className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
    { label: 'Labour/Delivery', targetType: 'Labour/Delivery', screen: 'gen', icon: <Baby className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
    { label: 'PNC', targetType: 'PNC', screen: 'gen', icon: <UserCheck className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
    { label: 'Immunization', targetType: 'Immunization', screen: 'gen', icon: <Syringe className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
    { label: 'Family Planning', targetType: 'Family Planning', screen: 'gen', icon: <Calendar className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
    { label: 'Others (Growth, Nutrition)', targetType: 'Growth and Nutrition', screen: 'gen', icon: <Scale className="h-6 w-6" style={{ color: 'var(--g)' }} /> },
  ];

  return (
    <div>
      <ScreenHeader title="New Encounter" subtitle={currentPatient.n} showBack />
      <div className="p-3.5">
        <Card style={{ backgroundColor: 'var(--gl)' }}>
          <SectionTitle>Review before you start</SectionTitle>
          {latest ? (
            <div className="text-xs space-y-0.5">
              <div className="font-bold">
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
          <PrimaryButton variant="outline" compact className="mt-2" onClick={() => go('hist')}>
            View full history
          </PrimaryButton>
        </Card>

        <FieldLabel>Choose the encounter type. This does not create another patient record.</FieldLabel>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
          {types.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setEncounterType(item.targetType);
                go(item.screen);
              }}
              className="flex min-h-[82px] flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-center text-xs font-medium active:opacity-85"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--ln)' }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const EncounterFormScreen: React.FC<{ forcedType?: string }> = ({ forcedType }) => {
  const {
    state,
    currentPatient,
    startOrLoadDraft,
    pendingLabsForEncounter,
    sendLabOrder,
    saveAndWaitLab,
    continueToStage2,
    sendPharmacyOrder,
    completeEncounter,
    go,
    showModal,
    closeModal,
    toast,
  } = useCareSync();

  const encounterType = forcedType || (state.g === 'Others' ? 'Growth and Nutrition' : state.g) || 'OPD';
  const draft = state.draftEncounter && state.draftEncounter.pi === state.cur && state.draftEncounter.t === encounterType
    ? state.draftEncounter
    : null;

  const [cc, setCc] = useState('');
  const [dx, setDx] = useState('');
  const [dxm, setDxm] = useState('Confirmed by laboratory');
  const [out, setOut] = useState('');
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  const [otherTx, setOtherTx] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  useEffect(() => {
    const loaded = startOrLoadDraft(encounterType);
    setCc(loaded.cc || '');
    setDx(loaded.dx && loaded.dx !== 'Not recorded' ? loaded.dx : '');
    setDxm(loaded.dxm || 'Confirmed by laboratory');
    setOut(loaded.out || (ENCOUNTER_OUTCOMES[encounterType] || ENCOUNTER_OUTCOMES.OPD)[0]);

    const initialFields: Record<string, string> = { ...(loaded.x || {}) };
    if (encounterType === 'Immunization') {
      state.E.filter((e) => e.pi === state.cur && e.t === 'Immunization').forEach((e) => {
        ALL_VACCINES.forEach((v) => {
          if (e.x?.[v] === 'Received' && !initialFields[v]) {
            initialFields[v] = 'Received';
          }
        });
      });
    }
    setCustomFields(initialFields);
    setSelectedLabs([]);
    setSelectedMeds([]);
    setOtherTx('');
  }, [encounterType, state.cur, startOrLoadDraft]);

  if (!draft) {
    return (
      <div>
        <ScreenHeader title={encounterType} subtitle={currentPatient.n} showBack />
      </div>
    );
  }

  const activeDraft = draft;
  const pendingTasks = pendingLabsForEncounter(activeDraft.uid);
  const flags = ENCOUNTER_FLAGS[encounterType] ?? 'LDR';
  const hasLabPhase = flags.includes('L');
  const hasDiagPhase = flags.includes('D');
  const hasRxPhase = flags.includes('R');

  const setField = (key: string, val: string) => {
    setCustomFields((prev) => ({ ...prev, [key]: val }));
  };

  const toggleMultiField = (key: string, vals: string[]) => {
    setField(key, vals.join(', '));
  };

  const getMultiField = (key: string): string[] => {
    const raw = customFields[key];
    return raw ? raw.split(', ').filter(Boolean) : [];
  };

  const handleDictate = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast('Tap the mic and speak. The nurse reviews the text before saving.');
      return;
    }
    try {
      const rec = new SpeechRec() as {
        lang: string;
        onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        start: () => void;
      };
      rec.lang = 'en-NG';
      rec.onresult = (ev) => {
        const transcript = ev.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setCc((prev) => (prev ? `${prev} ${transcript}` : transcript));
          toast('Dictation captured. Review before saving.');
        }
      };
      rec.onerror = () => {
        toast('Speak clearly or enter notes manually.');
      };
      rec.start();
      toast('Listening… speak now');
    } catch {
      toast('Tap the mic and speak. The nurse reviews the text before saving.');
    }
  };

  const openBypassModal = (action: 'save' | 'rx') => {
    let reasonDraft = '';
    showModal({
      title: '⚠ Lab result still pending',
      body: (
        <div className="space-y-3 text-sm">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--mu)' }}>
            Not every case should skip the lab. Treating before the result is back can lead to wrong or missed
            treatment. Bypass only when waiting could harm the patient, such as an emergency. Your reason is recorded
            in the patient history for the next clinician.
          </p>
          <InputField
            placeholder="Reason for bypass (required)"
            onChange={(e) => {
              reasonDraft = e.target.value;
            }}
          />
          <PrimaryButton
            variant="danger"
            onClick={() => {
              if (!reasonDraft.trim()) {
                toast('Give a reason to bypass');
                return;
              }
              closeModal();
              if (action === 'rx') {
                const res = sendPharmacyOrder(
                  selectedMeds,
                  otherTx,
                  dx,
                  cc,
                  dxm,
                  out,
                  customFields,
                  reasonDraft,
                );
                if (res.ok) {
                  setSelectedMeds([]);
                  setOtherTx('');
                }
              } else {
                completeEncounter({
                  cc,
                  dx,
                  dxm,
                  out,
                  customFields,
                  pendingLabSelection: selectedLabs,
                  pendingRxSelection: selectedMeds,
                  pendingTxText: otherTx,
                  bypassReason: reasonDraft,
                });
              }
            }}
          >
            Bypass lab result
          </PrimaryButton>
          <PrimaryButton
            variant="outline"
            onClick={() => {
              closeModal();
              if (action === 'save') {
                saveAndWaitLab(cc, customFields);
              }
            }}
          >
            {action === 'save' ? 'Save and wait for the result' : 'Wait for the result'}
          </PrimaryButton>
        </div>
      ),
    });
  };

  // Stage 1 Locked Waiting screen when lab tests have been sent and are awaiting lab completion
  if (hasLabPhase && activeDraft.labs.length > 0 && pendingTasks.length > 0) {
    return (
      <div>
        <ScreenHeader title={`${encounterType} Encounter`} subtitle={`${currentPatient.n} • ${currentPatient.id}`} showBack />
        <div className="p-3.5">
          <Card style={{ borderColor: 'var(--am)' }}>
            <SectionTitle>Waiting for lab results</SectionTitle>
            <div className="text-xs" style={{ color: 'var(--mu)' }}>
              Complaint: {activeDraft.cc || cc || 'Recorded'}
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--mu)' }}>
              Ordered: {activeDraft.labs.join(', ')}
            </div>
            <div className="mt-1.5 text-xs font-bold" style={{ color: '#b07a00' }}>
              Awaiting: {pendingTasks.map((t) => t.t).join(', ')}
            </div>
          </Card>

          <Card style={{ backgroundColor: 'var(--gl)' }}>
            <div className="text-xs font-medium">
              You will be notified when the result is ready. You can attend to another patient.
            </div>
          </Card>

          <PrimaryButton onClick={() => go('home', true)}>Back to home</PrimaryButton>
        </div>
      </div>
    );
  }

  // Immunization prior vaccine dates lookup
  const priorVaccineDates: Record<string, string> = {};
  if (encounterType === 'Immunization') {
    state.E.filter((e) => e.pi === state.cur && e.t === 'Immunization').forEach((e) => {
      ALL_VACCINES.forEach((v) => {
        if (e.x?.[v] === 'Received') {
          priorVaccineDates[v] = e.time.split(',')[0];
        }
      });
    });
  }

  const mine = state.E.filter((e) => e.pi === state.cur);
  const latest = mine[mine.length - 1];
  const isStageOneIntake = hasLabPhase && activeDraft.stage !== 2;

  return (
    <div>
      <ScreenHeader
        title={`${encounterType} Encounter`}
        subtitle={`${currentPatient.n} • ${currentPatient.id}`}
        showBack
      />
      <div className="p-3.5">
        {/* Lab Results Summary Card if labs ordered */}
        {activeDraft.labs.length > 0 && (
          <Card style={{ borderColor: pendingTasks.length ? 'var(--am)' : 'var(--g)' }}>
            <SectionTitle>Lab results</SectionTitle>
            {activeDraft.res.map((z, idx) => (
              <div key={idx} className="my-0.5 text-[13px]">
                ✓{' '}
                {z.includes('Positive') ? (
                  <span>
                    {z.split('Positive')[0]}
                    <b style={{ color: 'var(--rd)' }}>Positive</b>
                    {z.split('Positive')[1]}
                  </span>
                ) : (
                  z
                )}
              </div>
            ))}
            {pendingTasks.length > 0 ? (
              <div className="mt-1 text-xs font-semibold" style={{ color: '#b07a00' }}>
                Awaiting lab: {pendingTasks.map((t) => t.t).join(', ')}
              </div>
            ) : (
              <div className="mt-1 text-xs font-semibold" style={{ color: 'var(--g)' }}>
                All results are back. Enter the diagnosis and treatment.
              </div>
            )}
            {activeDraft.bypass && (
              <div className="mt-1.5 text-xs font-bold" style={{ color: 'var(--rd)' }}>
                ⚠ Lab result bypassed. Reason: {activeDraft.bypass}
              </div>
            )}
          </Card>
        )}

        {/* Previous Visit Card */}
        <Card style={{ backgroundColor: 'var(--gl)' }}>
          <SectionTitle>Previous visit</SectionTitle>
          {latest ? (
            <div className="text-xs space-y-0.5">
              <div className="font-bold">
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

        <Card>
          <SectionTitle>Encounter time</SectionTitle>
          <div className="text-xs">{activeDraft.time} • recorded automatically</div>
        </Card>

        {/* Complaint and Findings (All except Immunization) */}
        {encounterType !== 'Immunization' && (
          <Card>
            <SectionTitle>
              {encounterType === 'ANC' ? 'Gestation and findings' : 'Complaint and findings'}
            </SectionTitle>
            <TextareaField
              rows={3}
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Enter complaint and findings"
            />
            <PrimaryButton variant="outline" compact className="mt-2 !w-auto px-3" onClick={handleDictate}>
              <Mic className="h-4 w-4" />
              Dictate
            </PrimaryButton>
          </Card>
        )}

        {/* Type-specific clinical registers */}
        {encounterType === 'ANC' && (
          <>
            <Card>
              <SectionTitle>Antenatal assessment</SectionTitle>
              <FieldLabel>Visit number</FieldLabel>
              <SingleChoiceChips
                options={['1', '2', '3', '4', '5', '6', '7', '8']}
                value={customFields.Visit || ''}
                onChange={(v) => setField('Visit', v)}
                allowDeselect
              />
              <FieldLabel>Gestation (weeks)</FieldLabel>
              <InputField value={customFields.Gestation || ''} onChange={(e) => setField('Gestation', e.target.value)} placeholder="e.g. 24" />
              <FieldLabel>Blood pressure</FieldLabel>
              <InputField value={customFields.BP || ''} onChange={(e) => setField('BP', e.target.value)} placeholder="e.g. 110/70" />
              <FieldLabel>Weight (kg)</FieldLabel>
              <InputField value={customFields.Weight || ''} onChange={(e) => setField('Weight', e.target.value)} />
              <FieldLabel>Fundal height (cm)</FieldLabel>
              <InputField value={customFields['Fundal height'] || ''} onChange={(e) => setField('Fundal height', e.target.value)} />
              <FieldLabel>Fetal heart</FieldLabel>
              <SingleChoiceChips options={['Present', 'Absent']} value={customFields['Fetal heart'] || ''} onChange={(v) => setField('Fetal heart', v)} allowDeselect />
              <FieldLabel>Presentation</FieldLabel>
              <SingleChoiceChips options={['Cephalic', 'Breech', 'Other']} value={customFields.Presentation || ''} onChange={(v) => setField('Presentation', v)} allowDeselect />
              <FieldLabel>Urine protein</FieldLabel>
              <SingleChoiceChips options={['Negative', 'Positive']} value={customFields['Urine protein'] || ''} onChange={(v) => setField('Urine protein', v)} allowDeselect />
            </Card>
            <Card>
              <SectionTitle>ANC interventions</SectionTitle>
              <MultiChoiceChips
                options={['IPTp-SP', 'Td vaccine', 'ITN', 'Iron and folic acid', 'Deworming', 'Birth plan counselling']}
                values={getMultiField('Given')}
                onChange={(vals) => toggleMultiField('Given', vals)}
              />
              <FieldLabel>Danger signs</FieldLabel>
              <MultiChoiceChips
                options={['None', 'Bleeding', 'Severe headache', 'Swelling', 'Fever', 'Reduced fetal movement']}
                values={getMultiField('Danger signs')}
                onChange={(vals) => toggleMultiField('Danger signs', vals)}
              />
              <FieldLabel>Next visit</FieldLabel>
              <InputField type="date" value={customFields['Next visit'] || ''} onChange={(e) => setField('Next visit', e.target.value)} />
            </Card>
          </>
        )}

        {encounterType === 'Family Planning' && (
          <Card>
            <SectionTitle>Family planning</SectionTitle>
            <FieldLabel>Client type</FieldLabel>
            <SingleChoiceChips options={['New acceptor', 'Revisit', 'Switching method']} value={customFields['Client type'] || ''} onChange={(v) => setField('Client type', v)} allowDeselect />
            <FieldLabel>Pregnancy ruled out</FieldLabel>
            <SingleChoiceChips options={['Yes', 'No']} value={customFields['Pregnancy ruled out'] || ''} onChange={(v) => setField('Pregnancy ruled out', v)} allowDeselect />
            <FieldLabel>Method</FieldLabel>
            <SingleChoiceChips
              options={['Pills', 'Injectable (DMPA-SC)', 'Implant', 'IUD', 'Condoms', 'Natural methods', 'Emergency contraception', 'Permanent method (refer)']}
              value={customFields.Method || ''}
              onChange={(v) => setField('Method', v)}
              allowDeselect
            />
            <FieldLabel>Blood pressure</FieldLabel>
            <InputField value={customFields.BP || ''} onChange={(e) => setField('BP', e.target.value)} />
            <FieldLabel>Weight (kg)</FieldLabel>
            <InputField value={customFields.Weight || ''} onChange={(e) => setField('Weight', e.target.value)} />
            <FieldLabel>Counselling done</FieldLabel>
            <MultiChoiceChips options={['Method options', 'Side effects', 'Return signs', 'Dual protection']} values={getMultiField('Counselling')} onChange={(v) => toggleMultiField('Counselling', v)} />
            <FieldLabel>Side effects reported</FieldLabel>
            <InputField value={customFields['Side effects'] || ''} onChange={(e) => setField('Side effects', e.target.value)} placeholder="Optional" />
            <FieldLabel>Next appointment</FieldLabel>
            <InputField type="date" value={customFields['Next appointment'] || ''} onChange={(e) => setField('Next appointment', e.target.value)} />
          </Card>
        )}

        {encounterType === 'Labour/Delivery' && (
          <>
            <Card>
              <SectionTitle>Labour</SectionTitle>
              <FieldLabel>Onset of labour (time)</FieldLabel>
              <InputField value={customFields.Onset || ''} onChange={(e) => setField('Onset', e.target.value)} />
              <FieldLabel>Cervical dilatation on admission (cm)</FieldLabel>
              <InputField value={customFields.Dilatation || ''} onChange={(e) => setField('Dilatation', e.target.value)} />
              <FieldLabel>Fetal heart rate</FieldLabel>
              <InputField value={customFields.FHR || ''} onChange={(e) => setField('FHR', e.target.value)} placeholder="beats per minute" />
              <FieldLabel>Partograph</FieldLabel>
              <SingleChoiceChips options={['Started', 'Not started']} value={customFields.Partograph || ''} onChange={(v) => setField('Partograph', v)} allowDeselect />
              <FieldLabel>Mode of delivery</FieldLabel>
              <SingleChoiceChips options={['Spontaneous vaginal', 'Assisted vaginal', 'Referred for caesarean']} value={customFields['Mode of delivery'] || ''} onChange={(v) => setField('Mode of delivery', v)} allowDeselect />
              <FieldLabel>Delivery time</FieldLabel>
              <InputField value={customFields['Delivery time'] || ''} onChange={(e) => setField('Delivery time', e.target.value)} />
            </Card>
            <Card>
              <SectionTitle>Third stage and mother</SectionTitle>
              <FieldLabel>Active management (oxytocin)</FieldLabel>
              <SingleChoiceChips options={['Done', 'Not done']} value={customFields.AMTSL || ''} onChange={(v) => setField('AMTSL', v)} allowDeselect />
              <FieldLabel>Estimated blood loss (ml)</FieldLabel>
              <InputField value={customFields['Blood loss'] || ''} onChange={(e) => setField('Blood loss', e.target.value)} />
              <FieldLabel>Perineal tear</FieldLabel>
              <SingleChoiceChips options={['None', '1st degree', '2nd degree', '3rd or 4th (refer)']} value={customFields['Perineal tear'] || ''} onChange={(v) => setField('Perineal tear', v)} allowDeselect />
              <FieldLabel>Complications</FieldLabel>
              <MultiChoiceChips options={['None', 'Haemorrhage', 'Pre-eclampsia or eclampsia', 'Prolonged labour', 'Retained placenta']} values={getMultiField('Complications')} onChange={(v) => toggleMultiField('Complications', v)} />
            </Card>
            <Card>
              <SectionTitle>Newborn (a linked newborn record is created on save)</SectionTitle>
              <FieldLabel>Outcome</FieldLabel>
              <SingleChoiceChips options={['Live birth', 'Stillbirth']} value={customFields['Newborn outcome'] || ''} onChange={(v) => setField('Newborn outcome', v)} allowDeselect />
              <FieldLabel>Sex</FieldLabel>
              <SingleChoiceChips options={['Female', 'Male']} value={customFields['Newborn sex'] || ''} onChange={(v) => setField('Newborn sex', v)} allowDeselect />
              <FieldLabel>Birth weight (kg)</FieldLabel>
              <InputField value={customFields['Birth weight'] || ''} onChange={(e) => setField('Birth weight', e.target.value)} />
              <FieldLabel>Apgar score (1 min / 5 min)</FieldLabel>
              <InputField value={customFields.Apgar || ''} onChange={(e) => setField('Apgar', e.target.value)} placeholder="e.g. 8 / 9" />
              <FieldLabel>Immediate newborn care</FieldLabel>
              <MultiChoiceChips options={['Dried and warmed', 'Skin-to-skin', 'Early breastfeeding', 'Cord care', 'BCG, OPV0, Hep B0 given']} values={getMultiField('Newborn care')} onChange={(v) => toggleMultiField('Newborn care', v)} />
            </Card>
          </>
        )}

        {encounterType === 'PNC' && (
          <>
            <Card>
              <SectionTitle>Postnatal assessment</SectionTitle>
              <FieldLabel>Days since delivery</FieldLabel>
              <InputField value={customFields['Days since delivery'] || ''} onChange={(e) => setField('Days since delivery', e.target.value)} />
              <FieldLabel>Blood pressure</FieldLabel>
              <InputField value={customFields.BP || ''} onChange={(e) => setField('BP', e.target.value)} />
              <FieldLabel>Temperature (°C)</FieldLabel>
              <InputField value={customFields.Temperature || ''} onChange={(e) => setField('Temperature', e.target.value)} />
              <FieldLabel>Vaginal bleeding</FieldLabel>
              <SingleChoiceChips options={['Normal', 'Heavy']} value={customFields.Bleeding || ''} onChange={(v) => setField('Bleeding', v)} allowDeselect />
              <FieldLabel>Uterus</FieldLabel>
              <SingleChoiceChips options={['Well contracted', 'Not well contracted']} value={customFields.Uterus || ''} onChange={(v) => setField('Uterus', v)} allowDeselect />
              <FieldLabel>Breastfeeding</FieldLabel>
              <SingleChoiceChips options={['Exclusive', 'Difficulty', 'Not breastfeeding']} value={customFields.Breastfeeding || ''} onChange={(v) => setField('Breastfeeding', v)} allowDeselect />
              <FieldLabel>Family planning counselling</FieldLabel>
              <SingleChoiceChips options={['Done', 'Not done']} value={customFields['FP counselling'] || ''} onChange={(v) => setField('FP counselling', v)} allowDeselect />
            </Card>
            <Card>
              <SectionTitle>Newborn check</SectionTitle>
              <FieldLabel>Cord</FieldLabel>
              <SingleChoiceChips options={['Clean and dry', 'Infected']} value={customFields.Cord || ''} onChange={(v) => setField('Cord', v)} allowDeselect />
              <FieldLabel>Jaundice</FieldLabel>
              <SingleChoiceChips options={['None', 'Present']} value={customFields.Jaundice || ''} onChange={(v) => setField('Jaundice', v)} allowDeselect />
              <FieldLabel>Weight (kg)</FieldLabel>
              <InputField value={customFields['Newborn weight'] || ''} onChange={(e) => setField('Newborn weight', e.target.value)} />
              <FieldLabel>Danger signs</FieldLabel>
              <MultiChoiceChips options={['None', 'Fever', 'Poor feeding', 'Fast breathing', 'Convulsions']} values={getMultiField('Newborn danger signs')} onChange={(v) => toggleMultiField('Newborn danger signs', v)} />
            </Card>
          </>
        )}

        {encounterType === 'Inpatient' && (
          <Card>
            <SectionTitle>Admission and ward care</SectionTitle>
            <FieldLabel>Ward</FieldLabel>
            <SingleChoiceChips options={['Male', 'Female', 'Maternity', 'Children']} value={customFields.Ward || ''} onChange={(v) => setField('Ward', v)} allowDeselect />
            <FieldLabel>Reason for admission</FieldLabel>
            <InputField value={customFields['Admission reason'] || ''} onChange={(e) => setField('Admission reason', e.target.value)} />
            <FieldLabel>Vital signs</FieldLabel>
            <InputField value={customFields.Vitals || ''} onChange={(e) => setField('Vitals', e.target.value)} placeholder="Temp, pulse, BP, resp. rate" />
            <FieldLabel>Progress note</FieldLabel>
            <TextareaField rows={2} value={customFields.Progress || ''} onChange={(e) => setField('Progress', e.target.value)} />
          </Card>
        )}

        {encounterType === 'Growth and Nutrition' && (
          <Card>
            <SectionTitle>Growth and nutrition</SectionTitle>
            <FieldLabel>Weight (kg)</FieldLabel>
            <InputField value={customFields.Weight || ''} onChange={(e) => setField('Weight', e.target.value)} />
            <FieldLabel>Height or length (cm)</FieldLabel>
            <InputField value={customFields.Height || ''} onChange={(e) => setField('Height', e.target.value)} />
            <FieldLabel>MUAC (cm)</FieldLabel>
            <InputField value={customFields.MUAC || ''} onChange={(e) => setField('MUAC', e.target.value)} />
            <FieldLabel>MUAC colour</FieldLabel>
            <SingleChoiceChips options={['Green', 'Yellow', 'Red']} value={customFields['MUAC colour'] || ''} onChange={(v) => setField('MUAC colour', v)} allowDeselect />
            <FieldLabel>Oedema</FieldLabel>
            <SingleChoiceChips options={['None', 'Present']} value={customFields.Oedema || ''} onChange={(v) => setField('Oedema', v)} allowDeselect />
            <FieldLabel>Nutrition status</FieldLabel>
            <SingleChoiceChips options={['Normal', 'Moderate acute malnutrition', 'Severe acute malnutrition']} value={customFields['Nutrition status'] || ''} onChange={(v) => setField('Nutrition status', v)} allowDeselect />
            <FieldLabel>Intervention</FieldLabel>
            <MultiChoiceChips options={['Counselling', 'RUTF given', 'Deworming', 'Referred to stabilisation centre']} values={getMultiField('Intervention')} onChange={(v) => toggleMultiField('Intervention', v)} />
          </Card>
        )}

        {encounterType === 'Immunization' && (
          <>
            <Card style={{ backgroundColor: 'var(--gl)' }}>
              <div className="text-xs leading-relaxed">
                Tap Received or Not received for each vaccine. Earlier doses show their date. The schedule is
                configurable. Confirm it against the current NPHCDA schedule.
              </div>
            </Card>
            {NPHCDA_SCHEDULE.map(([ageGroup, vaccines]) => (
              <Card key={ageGroup}>
                <SectionTitle>{ageGroup}</SectionTitle>
                <div className="space-y-2.5">
                  {vaccines.map((vaccine) => (
                    <div key={vaccine} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-[128px]">
                        <div className="text-[13px] font-bold">{vaccine}</div>
                        {priorVaccineDates[vaccine] && (
                          <div className="text-[11px]" style={{ color: 'var(--mu)' }}>
                            Given {priorVaccineDates[vaccine]}
                          </div>
                        )}
                      </div>
                      <SingleChoiceChips
                        options={['Received', 'Not received']}
                        value={customFields[vaccine] || ''}
                        onChange={(v) => setField(vaccine, v)}
                        allowDeselect
                      />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            <Card>
              <SectionTitle>Safety and follow-up</SectionTitle>
              <FieldLabel>Adverse event after immunization</FieldLabel>
              <SingleChoiceChips options={['None', 'Mild', 'Serious (report)']} value={customFields.AEFI || ''} onChange={(v) => setField('AEFI', v)} allowDeselect />
              <FieldLabel>Next appointment</FieldLabel>
              <InputField type="date" value={customFields['Next appointment'] || ''} onChange={(e) => setField('Next appointment', e.target.value)} />
            </Card>
          </>
        )}

        {/* Two-stage Lab Flow */}
        {hasLabPhase && activeDraft.stage !== 2 && (
          <Card>
            <SectionTitle>Investigations</SectionTitle>
            <MultiChoiceChips options={LAB_TESTS} values={selectedLabs} onChange={setSelectedLabs} />
            {activeDraft.labs.length > 0 && (
              <div className="mt-2 text-xs" style={{ color: 'var(--mu)' }}>
                Ordered: {activeDraft.labs.join(', ')}
              </div>
            )}
          </Card>
        )}

        {isStageOneIntake ? (
          <div className="mt-2">
            <PrimaryButton
              onClick={() => {
                if (!cc.trim()) {
                  toast('Enter the complaint first');
                  return;
                }
                if (!selectedLabs.length && !activeDraft.labs.length) {
                  toast('Select at least one test');
                  return;
                }
                if (selectedLabs.length) {
                  sendLabOrder(selectedLabs, cc);
                  setSelectedLabs([]);
                }
                saveAndWaitLab(cc, customFields);
              }}
            >
              Send lab order and wait for results
            </PrimaryButton>
            <PrimaryButton
              variant="outline"
              onClick={() => {
                if (selectedLabs.length) {
                  toast('Tap Send lab order and wait, or clear the selected tests');
                  return;
                }
                continueToStage2(cc, customFields);
              }}
            >
              No investigation needed. Continue to diagnosis
            </PrimaryButton>
          </div>
        ) : (
          <>
            {hasDiagPhase && (
              <Card>
                <SectionTitle>Diagnosis</SectionTitle>
                <InputField value={dx} onChange={(e) => setDx(e.target.value)} placeholder="Enter diagnosis" />
                <FieldLabel>Diagnosis method</FieldLabel>
                <SingleChoiceChips
                  options={['Confirmed by laboratory', 'Clinical diagnosis']}
                  value={dxm}
                  onChange={setDxm}
                />
              </Card>
            )}

            {hasRxPhase && (
              <Card>
                <SectionTitle>Medication and treatment</SectionTitle>
                <MultiChoiceChips options={MEDICATIONS} values={selectedMeds} onChange={setSelectedMeds} />
                <FieldLabel>Other treatment or advice</FieldLabel>
                <InputField value={otherTx} onChange={(e) => setOtherTx(e.target.value)} placeholder="Optional" />
                <PrimaryButton
                  variant="outline"
                  compact
                  className="mt-2.5"
                  onClick={() => {
                    const res = sendPharmacyOrder(selectedMeds, otherTx, dx, cc, dxm, out, customFields);
                    if (res.needsBypass) {
                      openBypassModal('rx');
                    } else if (res.ok) {
                      setSelectedMeds([]);
                      setOtherTx('');
                    }
                  }}
                >
                  Send pharmacy order
                </PrimaryButton>
                {activeDraft.rx.length > 0 && (
                  <div className="mt-1.5 text-xs" style={{ color: 'var(--mu)' }}>
                    Ordered: {activeDraft.rx.join(', ')}
                  </div>
                )}
              </Card>
            )}

            <Card>
              <SectionTitle>Outcome</SectionTitle>
              <SingleChoiceChips
                options={ENCOUNTER_OUTCOMES[encounterType] || ENCOUNTER_OUTCOMES.OPD}
                value={out}
                onChange={setOut}
              />
            </Card>

            <PrimaryButton
              onClick={() => {
                const res = completeEncounter({
                  cc,
                  dx,
                  dxm,
                  out,
                  customFields,
                  pendingLabSelection: selectedLabs,
                  pendingRxSelection: selectedMeds,
                  pendingTxText: otherTx,
                });
                if (res.needsBypass) {
                  openBypassModal('save');
                }
              }}
            >
              Complete {encounterType} encounter
            </PrimaryButton>
          </>
        )}
      </div>
    </div>
  );
};
