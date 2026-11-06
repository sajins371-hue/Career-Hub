import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Number-first tile: the figure is the content, the icon is only a quiet cue.
export function StatCard({ label, value, to, icon: Icon }) {
  return (
    <Link to={to} className="group app-panel rounded-card p-5 hover:border-compass transition-colors">
      <div className="flex items-center justify-between text-ink/40 group-hover:text-compass transition-colors">
        <Icon size={18} />
        <ChevronRight size={16} />
      </div>
      <p className="font-display text-4xl text-ink mt-5 tabular-nums">{value}</p>
      <p className="text-sm text-ink/55 mt-1">{label}</p>
    </Link>
  );
}

export function Action({ to, icon: Icon, title }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-control border border-line bg-white px-3.5 py-3 hover:border-compass transition-colors">
      <Icon size={17} className="text-compass" />
      <span className="text-sm font-medium text-ink flex-1">{title}</span>
      <ChevronRight size={15} className="text-ink/30" />
    </Link>
  );
}
