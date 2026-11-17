import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const STORAGE_KEY = 'makset_caresync_state_v1';
let audioCtx: AudioContext | null = null;

export function isNativeCapacitor(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function initCapacitorShell(): Promise<void> {
  if (!isNativeCapacitor()) return;
  try {
    await StatusBar.setBackgroundColor({ color: '#0b5d34' });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    // Ignore status bar errors on unsupported platforms
  }
  try {
    await SplashScreen.hide();
  } catch {
    // Ignore splash screen errors on web
  }
}

export function subscribeBackButton(handler: () => boolean): () => void {
  if (!isNativeCapacitor()) return () => {};
  let removeFn: (() => Promise<void>) | null = null;
  CapApp.addListener('backButton', () => {
    const handled = handler();
    if (!handled) {
      CapApp.exitApp().catch(() => {});
    }
  })
    .then((handle) => {
      removeFn = () => handle.remove();
    })
    .catch(() => {});

  return () => {
    if (removeFn) {
      removeFn().catch(() => {});
    }
  };
}

export function subscribeNetworkChanges(onChange: (connected: boolean) => void): () => void {
  let removeCap: (() => Promise<void>) | null = null;
  if (isNativeCapacitor()) {
    Network.getStatus()
      .then((status) => onChange(status.connected))
      .catch(() => {});
    Network.addListener('networkStatusChange', (status) => {
      onChange(status.connected);
    })
      .then((handle) => {
        removeCap = () => handle.remove();
      })
      .catch(() => {});
  } else if (typeof navigator !== 'undefined') {
    onChange(navigator.onLine);
  }
  const handleOnline = () => onChange(true);
  const handleOffline = () => onChange(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (removeCap) removeCap().catch(() => {});
  };
}

export async function loadPersistedJson<T>(): Promise<T | null> {
  try {
    if (isNativeCapacitor()) {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      return value ? (JSON.parse(value) as T) : null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function savePersistedJson<T>(data: T): Promise<void> {
  try {
    const serialized = JSON.stringify(data);
    if (isNativeCapacitor()) {
      await Preferences.set({ key: STORAGE_KEY, value: serialized });
    } else {
      localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export async function clearPersistedJson(): Promise<void> {
  try {
    if (isNativeCapacitor()) {
      await Preferences.remove({ key: STORAGE_KEY });
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore errors
  }
}

export async function triggerHaptic(light = true): Promise<void> {
  if (!isNativeCapacitor()) return;
  try {
    await Haptics.impact({ style: light ? ImpactStyle.Light : ImpactStyle.Medium });
  } catch {
    // Ignore haptic errors
  }
}

export function playAlertBeep(muted: boolean): void {
  if (muted) return;
  let count = 0;
  const playTone = () => {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = audioCtx || (audioCtx = new Ctor());
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 900;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Ignore audio errors
    }
    count += 1;
    if (count < 2) {
      window.setTimeout(playTone, 340);
    }
  };
  playTone();
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8;'): void {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch {
    // Ignore download errors
  }
}
