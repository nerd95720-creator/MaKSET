export type Role = 'nurse' | 'lab' | 'pharm' | 'asst' | 'admin';
export type Position = 'nurse' | 'lab' | 'pharm' | 'oc' | 'asst' | 'creator';

export type ScreenId =
  | 'splash'
  | 'login'
  | 'home'
  | 'search'
  | 'register'
  | 'verify'
  | 'profile'
  | 'hist'
  | 'shr'
  | 'encs'
  | 'sel'
  | 'opd'
  | 'gen'
  | 'imm'
  | 'tasks'
  | 'tdet'
  | 'notif'
  | 'ref'
  | 'note'
  | 'refs'
  | 'rfo'
  | 'reports'
  | 'dash'
  | 'surv'
  | 'cs'
  | 'stf'
  | 'adm'
  | 'more';

export type ProfileTab = 'Summary' | 'History' | 'Services';
export type DashboardLevelKey = 'PHC' | 'Hospital' | 'LGA' | 'State' | 'FMOH' | 'NCDC';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Patient {
  n: string;
  s: string;
  a: string;
  id: string;
  al: string;
  bg: string;
  nin?: string;
  idv?: 'Verified' | 'Not verified';
  pin?: string;
  phone?: string;
  lga?: string;
  address?: string;
  dob?: string;
}

export interface Encounter {
  uid: string;
  pi: number;
  t: string;
  time: string;
  by: string;
  cc: string;
  labs: string[];
  res: string[];
  dx: string;
  dxm: string;
  rx: string[];
  rxs: string;
  out: string;
  notes: string;
  sync: boolean;
  status?: '' | 'open';
  stage?: 1 | 2;
  bypass?: string;
  x?: Record<string, string>;
}

export interface LabTask {
  id: string;
  p: string;
  t: string;
  items?: string[];
  encounterUid?: string;
}

export interface PharmacyTask {
  id: string;
  p: string;
  t: string;
  items?: string[];
  encounterUid?: string;
}

export interface NotificationItem {
  id: string;
  encounterUid?: string;
  pi: number;
  k: 'lab' | 'ph' | 'ref';
  p: string;
  txt: string;
  read: boolean;
}

export interface Referral {
  id: string;
  pi: number;
  p: string;
  from: string;
  to: string;
  reason: string;
  ur: 'Emergency' | 'Urgent' | 'Routine';
  tx: string;
  sum: string[];
  st: 'Queued' | 'Delivered' | 'Accepted' | 'Completed';
  time: string;
  fb: string;
  w: string;
}

export interface StaffMember {
  id: string;
  n: string;
  e: string;
  role: 'oc' | 'asst' | 'nurse' | 'lab' | 'pharm';
  fac: string;
  facilities?: string[];
  st: 'Active' | 'Suspended' | 'Terminated' | 'Blocked';
}

export interface FacilityInfo {
  name: string;
  type: 'PHC' | 'Hospital';
  lga: string;
}

export interface VerifyState {
  pi: number;
  conn: 'USB cable' | 'Bluetooth';
  fin: 'Right thumb' | 'Left thumb' | 'Right index' | 'Left index';
  sim: 'Match' | 'No match';
  ph: 'idle' | 'scanning' | 'fail';
  msg: string;
}

export interface CareSyncState {
  off: boolean;
  pending: number;
  synced: number;
  lastSyncedLabel: string;
  cur: number;
  stack: ScreenId[];
  tab: ProfileTab;
  q: string;
  g: string;
  taskKind: 'lab' | 'ph';
  taskIndex: number;
  refIndex: number;
  lastReferralId: string | null;
  pts: Patient[];
  E: Encounter[];
  draftEncounter: Encounter | null;
  lab: LabTask[];
  ph: PharmacyTask[];
  nt: NotificationItem[];
  ref: Referral[];
  sh: string[];
  aud: string[];
  role: Role;
  pos: Position;
  agr: boolean;
  nm: string;
  sid: string;
  fac: string;
  registeredFacilities: string[];
  facilities: FacilityInfo[];
  af: string;
  lv: DashboardLevelKey;
  stf: StaffMember[];
  mute: boolean;
  ninEnabled: boolean;
  ver: Record<number, boolean>;
  brk: Record<number, string>;
  vs: VerifyState;
  pendingRoute: { screen: ScreenId; reset?: boolean } | null;
  theme: ThemePreference;
  highContrast: boolean;
  language: 'English' | 'Hausa' | 'Yoruba' | 'Igbo';
}
