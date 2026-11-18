import type {
  CareSyncState,
  DashboardLevelKey,
  Encounter,
  FacilityInfo,
  Patient,
  Referral,
  StaffMember,
} from '../types/caresync.ts';

export const HOME_FACILITY = 'Azare Primary Health Centre';

export const FACILITIES: FacilityInfo[] = [
  { name: HOME_FACILITY, type: 'PHC', lga: 'Katagum' },
  { name: 'Chinade PHC', type: 'PHC', lga: 'Katagum' },
  { name: 'Madara PHC', type: 'PHC', lga: 'Katagum' },
  { name: 'Misau PHC', type: 'PHC', lga: 'Misau' },
  { name: 'Azare General Hospital', type: 'Hospital', lga: 'Katagum' },
  { name: 'Bauchi General Hospital', type: 'Hospital', lga: 'Bauchi' },
];

export const ROLE_LABELS: Record<StaffMember['role'], string> = {
  nurse: 'Nurse/CHEW',
  oc: 'Officer in charge',
  asst: 'OC assistant',
  lab: 'Lab technician',
  pharm: 'Pharmacist',
};

export const LAB_TESTS = [
  'Malaria RDT',
  'Hb/PCV',
  'Urinalysis',
  'Blood glucose',
  'HIV screen',
  'Stool microscopy',
];

export const MEDICATIONS = [
  'Artemether-lumefantrine',
  'Paracetamol',
  'ORS + Zinc',
  'Amoxicillin',
  'Iron and folic acid',
];

export const NPHCDA_SCHEDULE: [string, string[]][] = [
  ['At birth', ['BCG', 'OPV0', 'Hep B0']],
  ['6 weeks', ['OPV1', 'Penta1', 'PCV1', 'Rota1']],
  ['10 weeks', ['OPV2', 'Penta2', 'PCV2', 'Rota2']],
  ['14 weeks', ['OPV3', 'Penta3', 'PCV3', 'Rota3', 'IPV1']],
  ['5 to 7 months', ['Malaria vaccine 1', 'Malaria vaccine 2', 'Malaria vaccine 3']],
  ['6 months', ['Vitamin A (1st dose)']],
  ['9 months', ['Measles 1', 'Yellow fever', 'Men A', 'IPV2']],
  ['12 months', ['Vitamin A (2nd dose)']],
  ['15 months', ['Measles 2', 'Malaria vaccine 4']],
  ['Girls 9 to 14 years', ['HPV']],
];

export const ALL_VACCINES = NPHCDA_SCHEDULE.flatMap((group) => group[1]);

export const ENCOUNTER_OUTCOMES: Record<string, string[]> = {
  OPD: ['Treated', 'Not treated', 'Admitted', 'Referred out'],
  Inpatient: ['Admitted', 'Discharged', 'Referred out', 'Died'],
  ANC: ['Routine follow-up', 'Referred', 'High-risk flagged'],
  'Labour/Delivery': ['Mother and baby well', 'Referred', 'Maternal complication'],
  PNC: ['Well', 'Referred'],
  'Family Planning': ['Method provided', 'Referred', 'Declined'],
  Immunization: ['Completed', 'Deferred'],
  'Growth and Nutrition': ['Counselled', 'Enrolled in nutrition programme', 'Referred'],
};

export const ENCOUNTER_FLAGS: Record<string, string> = {
  OPD: 'LDR',
  Inpatient: 'LDR',
  ANC: 'LR',
  'Labour/Delivery': 'DR',
  PNC: 'DR',
  'Family Planning': 'R',
  Immunization: '',
  'Growth and Nutrition': 'DR',
};

export interface DashboardLevelData {
  t: string;
  s: string;
  bt: string;
  b: [string, number][];
  k: [string, string][];
  rh: string[];
  r: string[][];
}

export const DASHBOARD_LEVELS: Record<DashboardLevelKey, DashboardLevelData> = {
  PHC: {
    t: 'Azare PHC',
    s: 'Your facility',
    bt: 'OPD attendance by week',
    b: [
      ['W1', 42],
      ['W2', 55],
      ['W3', 48],
      ['W4', 70],
    ],
    k: [
      ['OPD this month', '215'],
      ['ANC visits', '38'],
      ['Immunizations', '64'],
      ['Referrals out', '2'],
    ],
    rh: ['Top diagnoses', 'Cases'],
    r: [
      ['Malaria', '86'],
      ['Respiratory infection', '41'],
      ['Diarrhoea', '23'],
      ['Skin conditions', '19'],
    ],
  },
  Hospital: {
    t: 'Bauchi General Hospital',
    s: 'Receiving facility',
    bt: 'Referrals received by month',
    b: [
      ['Jun', 38],
      ['Jul', 44],
      ['Aug', 41],
      ['Sep', 52],
      ['Oct', 57],
    ],
    k: [
      ['Referrals received', '57'],
      ['Admissions', '112'],
      ['Feedback sent', '49'],
      ['Avg. response', '3.2 h'],
    ],
    rh: ['Referring PHC', 'Received', 'Feedback'],
    r: [
      ['Azare PHC', '14', '11'],
      ['Chinade PHC', '9', '9'],
      ['Madara PHC', '7', '5'],
    ],
  },
  LGA: {
    t: 'Katagum LGA',
    s: '12 PHCs',
    bt: 'OPD (all PHCs) by month',
    b: [
      ['Jun', 2100],
      ['Jul', 2250],
      ['Aug', 2310],
      ['Sep', 2400],
      ['Oct', 2480],
    ],
    k: [
      ['PHCs reporting', '11 of 12'],
      ['OPD, all PHCs', '2,480'],
      ['ANC 4+ coverage', '61%'],
      ['Penta3 coverage', '72%'],
    ],
    rh: ['PHC', 'OPD', 'Report'],
    r: [
      ['Azare PHC', '215', 'On time'],
      ['Chinade PHC', '198', 'On time'],
      ['Madara PHC', 'n/a', 'Late'],
    ],
  },
  State: {
    t: 'Bauchi State',
    s: '20 LGAs',
    bt: 'Reporting rate by month (%)',
    b: [
      ['Jun', 88],
      ['Jul', 90],
      ['Aug', 92],
      ['Sep', 93],
      ['Oct', 94],
    ],
    k: [
      ['LGAs reporting', '19 of 20'],
      ['OPD, state', '31,420'],
      ['Facility deliveries', '4,310'],
      ['Reporting rate', '94%'],
    ],
    rh: ['LGA', 'OPD', 'Reporting'],
    r: [
      ['Bauchi', '3,900', '97%'],
      ['Katagum', '2,480', '92%'],
      ['Misau', '1,720', '88%'],
    ],
  },
  FMOH: {
    t: 'Federal Ministry of Health',
    s: 'National routine data (NHMIS/DHIS2)',
    bt: 'Penta3 coverage by quarter (%)',
    b: [
      ['Q1', 68],
      ['Q2', 70],
      ['Q3', 72],
      ['Q4', 74],
    ],
    k: [
      ['States reporting', '36 + FCT'],
      ['OPD attendance', '4.2M'],
      ['Penta3 coverage', '74%'],
      ['Reporting rate', '91%'],
    ],
    rh: ['State', 'OPD', 'Reporting'],
    r: [
      ['Bauchi', '31,420', '94%'],
      ['Kano', '58,100', '96%'],
      ['Lagos', '47,900', '98%'],
    ],
  },
  NCDC: {
    t: 'NCDC',
    s: 'Surveillance and early warning',
    bt: 'Suspected case reports by week',
    b: [
      ['W1', 14],
      ['W2', 18],
      ['W3', 27],
      ['W4', 41],
    ],
    k: [
      ['Active signals', '3'],
      ['Reports, 7 days', '128'],
      ['LGAs on alert', '2'],
      ['Under review', '1'],
    ],
    rh: ['Signal', 'Status'],
    r: [
      ['Cholera, Katagum', 'Alert'],
      ['Measles, Misau', 'Watch'],
      ['Lassa fever', 'Normal'],
    ],
  },
};

export const IDSR_SIGNALS: [string, string, string, 'Alert' | 'Watch' | 'Normal'][] = [
  ['Suspected cholera', 'Katagum LGA', '6 cases in 3 days', 'Alert'],
  ['Measles', 'Misau LGA', '4 cases this week', 'Watch'],
  ['Lassa fever', 'Bauchi State', '0 cases', 'Normal'],
  ['Meningitis', 'Bauchi State', '1 case', 'Normal'],
  ['Acute flaccid paralysis', 'Bauchi State', '0 cases', 'Normal'],
];

const INITIAL_PATIENTS: Patient[] = [
  {
    n: 'Amina Musa',
    s: 'Female',
    a: '28 years',
    id: 'MAK-002431',
    al: 'Penicillin allergy',
    bg: 'O+',
    nin: '10203040501',
    idv: 'Verified',
    pin: '1234',
    phone: '0803 111 2431',
    lga: 'Bauchi / Katagum / Azare',
    address: 'Sabon Layi, Azare',
  },
  {
    n: 'Ibrahim Sani',
    s: 'Male',
    a: '4 years',
    id: 'MAK-002377',
    al: '',
    bg: 'A+',
    nin: '20304050612',
    idv: 'Verified',
    pin: '1234',
    phone: '0802 444 2377',
    lga: 'Bauchi / Katagum / Azare',
    address: 'Nasarawa Ward, Azare',
  },
  {
    n: 'Zainab Bello',
    s: 'Female',
    a: '31 years',
    id: 'MAK-002402',
    al: '',
    bg: 'B+',
    nin: '30405060723',
    idv: 'Verified',
    pin: '1234',
    phone: '0805 999 2402',
    lga: 'Bauchi / Katagum / Azare',
    address: 'Kofar Fada, Azare',
  },
];

const INITIAL_ENCOUNTERS: Encounter[] = [
  {
    uid: 'enc-seed-1',
    pi: 0,
    t: 'ANC',
    time: '02 Apr 2025, 09:10',
    by: 'Nurse Amina',
    cc: 'ANC visit 3, 24 weeks. BP 110/70',
    labs: ['Hb/PCV'],
    res: ['Hb/PCV: 10.8 g/dL'],
    dx: 'Normal pregnancy progress',
    dxm: 'Clinical diagnosis',
    rx: ['Iron and folic acid', 'IPTp-SP dose 2'],
    rxs: 'dispensed in full',
    out: 'Routine follow-up',
    notes: '',
    sync: true,
    x: { Visit: '3', Gestation: '24', BP: '110/70' },
  },
  {
    uid: 'enc-seed-2',
    pi: 0,
    t: 'OPD',
    time: '15 May 2025, 10:20',
    by: 'Nurse Amina',
    cc: 'Fever and headache for 3 days',
    labs: ['Malaria RDT'],
    res: ['Malaria RDT: Positive'],
    dx: 'Uncomplicated malaria',
    dxm: 'Confirmed by laboratory',
    rx: ['Artemether-lumefantrine', 'Paracetamol'],
    rxs: 'dispensed in full',
    out: 'Treated',
    notes: '',
    sync: true,
  },
  {
    uid: 'enc-seed-3',
    pi: 1,
    t: 'Immunization',
    time: '20 Mar 2022, 10:00',
    by: 'Nurse Amina',
    cc: '',
    labs: [],
    res: [],
    dx: '',
    dxm: '',
    rx: [],
    rxs: '',
    out: 'Completed',
    notes: '',
    sync: true,
    x: {
      BCG: 'Received',
      OPV0: 'Received',
      'Hep B0': 'Received',
      OPV1: 'Received',
      Penta1: 'Received',
      PCV1: 'Received',
      Rota1: 'Received',
      OPV2: 'Received',
      Penta2: 'Received',
      PCV2: 'Received',
      Rota2: 'Received',
    },
  },
];

function buildInitialStaff(): StaffMember[] {
  const base: StaffMember[] = [
    { id: 'OC-0001', n: 'Dr. Halima Yusuf', e: 'halima@azare.phc', role: 'oc', fac: HOME_FACILITY, st: 'Active' },
    { id: 'AST-0002', n: 'Ibrahim Danladi', e: 'ibrahim@azare.phc', role: 'asst', fac: HOME_FACILITY, st: 'Active' },
    { id: 'NRS-0142', n: 'Nurse Amina', e: 'amina@azare.phc', role: 'nurse', fac: HOME_FACILITY, st: 'Active' },
    { id: 'LAB-0031', n: 'Lab Technician Musa', e: 'musa@azare.phc', role: 'lab', fac: HOME_FACILITY, st: 'Active' },
    { id: 'PHM-0017', n: 'Pharmacist Hauwa', e: 'hauwa@azare.phc', role: 'pharm', fac: HOME_FACILITY, st: 'Active' },
  ];
  FACILITIES.forEach((f, i) => {
    if (f.name !== HOME_FACILITY) {
      base.push({
        id: `OC-1${i}`,
        n: `Officer in Charge, ${f.name}`,
        e: `oc${i}@mak.set`,
        role: 'oc',
        fac: f.name,
        st: 'Active',
      });
    }
  });
  return base;
}

export function buildSummaryLines(pi: number, pts: Patient[], encounters: Encounter[]): string[] {
  const p = pts[pi];
  if (!p) return [];
  const lines = [`${p.n}, ${p.s}, ${p.a}`];
  if (p.al) lines.push(`Allergy: ${p.al}`);
  encounters
    .filter((e) => e.pi === pi)
    .slice(-3)
    .reverse()
    .forEach((e) => {
      let l = `${e.time} • ${e.t}`;
      if (e.dx) l += `: ${e.dx}`;
      if (e.res.length) l += ` (Labs: ${e.res.join('; ')})`;
      if (e.rx.length) l += ` | Meds: ${e.rx.join(', ')}`;
      lines.push(l);
    });
  return lines;
}

function formatReferral(r: Omit<Referral, 'p' | 'w'>, pts: Patient[]): Referral {
  const pName = pts[r.pi]?.n || 'Unknown Patient';
  const w = r.st === 'Completed' ? `Feedback: ${r.fb}` : `${r.st} to ${r.to}`;
  return { ...r, p: pName, w };
}

export function createInitialState(): CareSyncState {
  const pts = INITIAL_PATIENTS.map((p) => ({ ...p }));
  const E = INITIAL_ENCOUNTERS.map((e) => ({ ...e, labs: [...e.labs], res: [...e.res], rx: [...e.rx], x: e.x ? { ...e.x } : undefined }));
  const refs: Referral[] = [
    formatReferral(
      {
        id: 'REF-1001',
        pi: 2,
        from: HOME_FACILITY,
        to: 'Bauchi General Hospital',
        reason: 'Severe malaria with persistent vomiting',
        ur: 'Urgent',
        tx: 'Artesunate IM, first dose',
        sum: buildSummaryLines(2, pts, E),
        st: 'Delivered',
        time: 'Today, 08:15',
        fb: '',
      },
      pts,
    ),
    formatReferral(
      {
        id: 'REF-1002',
        pi: 1,
        from: HOME_FACILITY,
        to: 'Azare General Hospital',
        reason: 'Persistent fever for review',
        ur: 'Routine',
        tx: 'Paracetamol',
        sum: buildSummaryLines(1, pts, E),
        st: 'Delivered',
        time: 'Yesterday, 15:40',
        fb: '',
      },
      pts,
    ),
  ];

  return {
    off: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    pending: 0,
    synced: 41,
    lastSyncedLabel: 'Today, 8:40 AM',
    cur: 0,
    stack: ['splash'],
    tab: 'Summary',
    q: '',
    g: 'OPD',
    taskKind: 'lab',
    taskIndex: 0,
    refIndex: 0,
    lastReferralId: null,
    pts,
    E,
    draftEncounter: null,
    lab: [
      { id: 'lab-seed-1', p: 'Amina Musa', t: 'Malaria RDT, Hb/PCV', items: ['Malaria RDT', 'Hb/PCV'] },
      { id: 'lab-seed-2', p: 'Zainab Bello', t: 'Urinalysis', items: ['Urinalysis'] },
    ],
    ph: [{ id: 'ph-seed-1', p: 'Ibrahim Sani', t: 'Artemether-lumefantrine ×1', items: ['Artemether-lumefantrine'] }],
    nt: [],
    ref: refs,
    sh: [],
    aud: [],
    role: 'nurse',
    pos: 'nurse',
    agr: false,
    nm: 'Nurse Amina',
    sid: 'NRS-0142',
    fac: HOME_FACILITY,
    registeredFacilities: [HOME_FACILITY],
    facilities: FACILITIES.map((f) => ({ ...f })),
    af: HOME_FACILITY,
    lv: 'PHC',
    stf: buildInitialStaff(),
    mute: false,
    ninEnabled: false,
    ver: {},
    brk: {},
    vs: {
      pi: 0,
      conn: 'USB cable',
      fin: 'Right thumb',
      sim: 'Match',
      ph: 'idle',
      msg: '',
    },
    pendingRoute: null,
    theme: 'system',
    highContrast: false,
    language: 'English',
  };
}
