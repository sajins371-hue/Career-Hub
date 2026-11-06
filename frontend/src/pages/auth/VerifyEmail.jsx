import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../lib/apiClient';
import { Button } from '../../components/ui';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying | done | error
  const [error, setError] = useState('');
  const { refreshUser, isAuthenticated } = useAuth();

  const started = useRef(false); // React StrictMode runs effects twice in dev; only verify once

  const userId = params.get('id');
  const token = params.get('token');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!userId || !token) {
      setStatus('error');
      setError('This verification link is invalid or incomplete.');
      return;
    }
    authApi.verifyEmail({ userId, token })
      .then(async () => { if (isAuthenticated) await refreshUser().catch(() => {}); setStatus('done'); })
      .catch((err) => {
        setStatus('error');
        setError(apiErrorMessage(err, 'That verification link is invalid or expired.'));
      });
  }, [userId, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm text-center">
        {status === 'verifying' && <p className="text-sm text-ink/55">Verifying your email…</p>}

        {status === 'done' && (
          <div className="bg-signal/5 border border-signal/30 rounded-control p-6">
            <h1 className="font-display text-xl text-ink mb-1">Email verified</h1>
            <p className="text-sm text-signal">Your address is confirmed. You're all set.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-alert/5 border border-alert/30 rounded-control p-6">
            <h1 className="font-display text-xl text-ink mb-1">Couldn't verify that link</h1>
            <p className="text-sm text-alert">{error}</p>
            <p className="text-xs text-ink/50 mt-3">Sign in and use “Resend verification email” to get a fresh link.</p>
          </div>
        )}

        <div className="mt-6">
          <Link to={isAuthenticated ? '/' : '/login'}><Button variant="secondary">{isAuthenticated ? 'Go to dashboard' : 'Go to sign in'}</Button></Link>
        </div>
      </div>
    </div>
  );
}
