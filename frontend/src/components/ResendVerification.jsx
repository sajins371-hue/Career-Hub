import { useEffect, useState } from 'react';
import { authApi } from '../api';
import { apiErrorMessage } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui';

/**
 * "Resend verification email" + "I've verified" buttons for a signed-in, unverified user.
 * Includes a 60s cooldown that matches the server-side limit.
 */
export default function ResendVerification({ className = '' }) {
  const { user, refreshUser } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      await authApi.resendVerification(user.email);
      setMsg({ type: 'ok', text: `If ${user.email} is not verified yet, a new link has been sent. Check your inbox and spam folder.` });
      setCooldown(60);
    } catch (err) {
      setMsg({ type: 'err', text: apiErrorMessage(err) });
    } finally { setBusy(false); }
  }

  async function checkNow() {
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      const u = await refreshUser();
      if (!u.emailVerified) setMsg({ type: 'err', text: 'Not verified yet. Open the link in the email first.' });
    } catch (err) {
      setMsg({ type: 'err', text: apiErrorMessage(err) });
    } finally { setBusy(false); }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={resend} disabled={busy || cooldown > 0}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
        </Button>
        <Button type="button" variant="secondary" onClick={checkNow} disabled={busy}>I've verified — continue</Button>
      </div>
      {msg.text && <p className={`text-sm mt-3 ${msg.type === 'ok' ? 'text-signal' : 'text-alert'}`}>{msg.text}</p>}
    </div>
  );
}
