import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api';
import { apiErrorMessage } from '../../lib/apiClient';
import { Button, Input } from '../../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStatus('sending');
    try {
      await authApi.forgotPassword(email);
      setStatus('sent');
    } catch (err) {
      setError(apiErrorMessage(err));
      setStatus('idle');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl text-ink mb-1">Reset your password</h1>
        <p className="text-sm text-ink/55 mb-6">We'll email you a link if an account exists for that address.</p>

        {status === 'sent' ? (
          <div className="bg-panel border border-line rounded-control p-6 text-sm text-ink/70">
            If that email is registered, a reset link is on its way. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-panel border border-line rounded-control p-6">
            <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <p className="text-sm text-alert">{error}</p>}
            <Button type="submit" disabled={status === 'sending'} className="w-full">
              {status === 'sending' ? 'Sending…' : 'Send reset link'}
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
