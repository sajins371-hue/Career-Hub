import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-paper text-center px-4">
      <h1 className="font-display text-4xl text-ink">Page not found</h1>
      <p className="text-ink/55 max-w-sm">The page you're looking for doesn't exist or may have moved.</p>
      <Link to="/"><Button className="mt-2">Back to dashboard</Button></Link>
    </div>
  );
}
