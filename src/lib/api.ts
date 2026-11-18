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
import { auth } from './firebase';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

let memoryIdToken: string | null = null;

export function setMemoryIdToken(token: string | null) {
  memoryIdToken = token;
}

export function getMemoryIdToken(): string | null {
  return memoryIdToken;
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
