import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api';
import { apiErrorMessage } from '../../lib/apiClient';
import { Button, Input } from '../../components/ui';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');

  const userId = params.get('id');
  const token = params.get('token');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!userId || !token) { setError('This reset link is invalid or incomplete.'); return; }
    setStatus('submitting');
    try {
      await authApi.resetPassword({ userId, token, newPassword });
      setStatus('done');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const details = err?.response?.data?.details;
      setError(details?.map((d) => d.message).join(' ') || apiErrorMessage(err, 'That reset link is invalid or expired.'));
      setStatus('idle');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl text-ink mb-1">Choose a new password</h1>
        <p className="text-sm text-ink/55 mb-6">Make it at least 8 characters, with an uppercase letter, a lowercase letter, and a number.</p>

        {status === 'done' ? (
          <div className="bg-signal/5 border border-signal/30 rounded-control p-6 text-sm text-signal">
            Password updated. Redirecting you to sign in…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-panel border border-line rounded-control p-6">
            <Input
              label="New password" type="password" required
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            />
            {error && <p className="text-sm text-alert">{error}</p>}
            <Button type="submit" disabled={status === 'submitting'} className="w-full">
              {status === 'submitting' ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}
        <p className="text-sm text-center text-ink/55 mt-4">
          <Link to="/login" className="text-compass hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
