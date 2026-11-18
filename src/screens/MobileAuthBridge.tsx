import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { CheckCircle2, Copy, ExternalLink, LogIn } from 'lucide-react';
import { API_BASE } from '../lib/api';
import { auth, googleAuthProvider } from '../lib/firebase';

export const MobileAuthBridge: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const oauthCred = GoogleAuthProvider.credentialFromResult(result);
      const idToken = oauthCred?.idToken || '';
      const accessToken = oauthCred?.accessToken || '';
      if (!idToken && !accessToken) {
        throw new Error('Google sign-in did not return an OAuth credential.');
      }

      const firebaseToken = await result.user.getIdToken();
      const res = await fetch(`${API_BASE}/api/auth/mobile-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ idToken, accessToken }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.code) {
        throw new Error(payload.error || 'Failed to generate MaKSET sign-in code.');
      }

      setCode(payload.code);
      setEmail(result.user.email || null);

      const deepLink = `com.makset.caresync://auth?code=${encodeURIComponent(payload.code)}`;
      window.location.href = deepLink;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to complete Google sign-in.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const deepLinkHref = code ? `com.makset.caresync://auth?code=${encodeURIComponent(code)}` : '#';

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10"
      style={{ backgroundColor: 'var(--bg, #ffffff)', color: 'var(--ink, #14221b)' }}
    >
      <div className="mb-6 text-center">
        <img
          src="/assets/nphcda-logo.png"
          alt="NPHCDA Logo"
          className="mx-auto mb-3 block w-32 rounded-2xl bg-white p-1.5 shadow-sm"
        />
        <h1 className="text-2xl font-bold" style={{ color: '#0b5d34' }}>
          MaKSET Mobile Sign-In
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Sign in with your Google staff account to return to the MaKSET Android app.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {!code ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleGoogleSignIn()}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          style={{ backgroundColor: '#0b5d34' }}
        >
          <LogIn className="h-4 w-4" />
          {loading ? 'Signing in with Google…' : 'Continue with Google'}
        </button>
      ) : (
        <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-700" />
          <div>
            <div className="text-sm font-bold text-emerald-950">Google sign-in verified</div>
            {email && <div className="text-xs text-emerald-800">{email}</div>}
          </div>

          <a
            href={deepLinkHref}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
            style={{ backgroundColor: '#0b5d34' }}
          >
            <ExternalLink className="h-4 w-4" />
            Return to MaKSET App
          </a>

          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <div className="text-[11px] font-medium text-neutral-500">
              If Chrome does not switch automatically, copy this one-time code and paste it in MaKSET:
            </div>
            <div className="mt-2 flex items-center justify-center gap-2">
              <code className="rounded-lg bg-neutral-100 px-3 py-1.5 text-base font-bold tracking-widest text-neutral-900">
                {code}
              </code>
              <button
                type="button"
                onClick={() => void handleCopyCode()}
                className="flex min-h-[36px] items-center gap-1 rounded-lg border border-neutral-300 px-2.5 text-xs font-semibold text-neutral-700"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
