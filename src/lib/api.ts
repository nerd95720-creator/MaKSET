import {
  Encounter,
  FacilityInfo,
  LabTask,
  NotificationItem,
  Patient,
  PharmacyTask,
  Position,
  Referral,
  StaffMember,
} from '../types/caresync';
import { isNativeCapacitor } from './capacitor';
import { auth } from './firebase';

const DEFAULT_NATIVE_API_BASE =
  'https://ais-pre-p2i2jomcid6mmczfirt2de-266915964484.europe-west2.run.app';

export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  (isNativeCapacitor() ? DEFAULT_NATIVE_API_BASE : '')
).replace(/\/$/, '');

let memoryIdToken: string | null = null;

export function setMemoryIdToken(token: string | null) {
  memoryIdToken = token;
}

export function getMemoryIdToken(): string | null {
  return memoryIdToken;
}

export async function exchangeMobileAuthCode(code: string): Promise<{
  idToken: string;
  accessToken: string;
  email: string;
}> {
  const res = await fetch(`${API_BASE}/api/auth/mobile-exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to verify sign-in code (${res.status})`);
  }
  return data as { idToken: string; accessToken: string; email: string };
}

async function resolveToken(): Promise<string | null> {
  if (auth.currentUser) {
    try {
      const fresh = await auth.currentUser.getIdToken();
      memoryIdToken = fresh;
      return fresh;
    } catch {
      return memoryIdToken;
    }
  }
  return memoryIdToken;
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await resolveToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface BootstrapResponse {
  blocked: false;
  user: {
    uid: string;
    email: string;
    staffCode: string;
    name: string;
    pos: Position;
    fac: string;
    registeredFacilities: string[];
    agr: boolean;
  };
  facilities: FacilityInfo[];
  stf: StaffMember[];
  pts: Patient[];
  E: Encounter[];
  lab: LabTask[];
  ph: PharmacyTask[];
  ref: Referral[];
  nt: NotificationItem[];
  aud: string[];
}
