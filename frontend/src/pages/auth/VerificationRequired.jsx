import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import ResendVerification from '../../components/ResendVerification';

export default function VerificationRequired() {
  const { user, isAuthenticated } = useAuth();
  // Already verified (e.g. clicked the link in another tab, then pressed the button) -> move on.
  if (user?.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-4">
        <div className="w-full max-w-md text-center bg-panel border border-line rounded-control p-8">
          <MailCheck className="mx-auto text-signal mb-4" size={36} />
          <h1 className="font-display text-2xl text-ink">Email verified</h1>
          <Link to="/"><Button className="mt-6">Go to dashboard</Button></Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md text-center bg-panel border border-line rounded-control p-8">
        <MailCheck className="mx-auto text-compass mb-4" size={36} />
        <h1 className="font-display text-2xl text-ink">Verify your email first</h1>
        <p className="text-sm text-ink/55 mt-2">
          {isAuthenticated
            ? <>We sent a verification link to <strong>{user?.email}</strong>. Open it, then come back and press the button below.</>
            : 'Sign in, then open the verification link we sent to your email address.'}
        </p>
        {isAuthenticated
          ? <ResendVerification className="mt-6 flex flex-col items-center" />
          : <Link to="/login"><Button className="mt-6">Back to sign in</Button></Link>}
        {isAuthenticated && <Link to="/" className="block text-sm text-compass hover:underline mt-5">Back to dashboard</Link>}
      </div>
    </div>
  );
}
