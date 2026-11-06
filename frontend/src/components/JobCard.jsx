import { Link } from 'react-router-dom';
import { MapPin, Wallet, Clock } from 'lucide-react';
import { Badge } from './ui';

function postedAgo(date) {
  if (!date) return null;
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  return days < 1 ? 'Today' : days === 1 ? 'Yesterday' : days < 30 ? `${days} days ago` : `${Math.floor(days / 30)} mo ago`;
}

export default function JobCard({ job }) {
  const company = job.company?.name || job.companyNameRaw || 'Company not listed';
  const salary = job.salary?.min
    ? `${job.salary.currency || 'USD'} ${Math.round(job.salary.min / 1000)}k–${Math.round(job.salary.max / 1000)}k${job.salary.isEstimated ? ' est.' : ''}`
    : null;
  const where = job.location?.remote ? 'Remote' : job.location?.country || 'Location not listed';
  const posted = postedAgo(job.postedAt);
  const score = job.matchScore != null ? Math.round(job.matchScore) : null;

  return (
    <Link to={`/jobs/${job._id}`} className="group flex gap-4 app-panel rounded-card p-5 hover:border-compass transition-colors">
      <span className="h-11 w-11 shrink-0 rounded-control bg-paper border border-line text-ink font-display font-semibold flex items-center justify-center">
        {company[0].toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg text-ink truncate group-hover:text-compass transition-colors">{job.title}</h3>
            <p className="text-sm text-ink/60">{company}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {job.employmentType === 'internship' && <Badge tone="gold">Internship</Badge>}
            {score != null && <Badge tone={score >= 75 ? 'green' : 'neutral'}>{score}% match</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-sm text-ink/55">
          <span className="flex items-center gap-1.5"><MapPin size={14} />{where}</span>
          {salary && <span className="flex items-center gap-1.5"><Wallet size={14} />{salary}</span>}
          {posted && <span className="flex items-center gap-1.5"><Clock size={14} />{posted}</span>}
        </div>
        {job.requiredSkills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {job.requiredSkills.slice(0, 5).map((s) => <Badge key={s}>{s}</Badge>)}
            {job.requiredSkills.length > 5 && <span className="text-xs text-ink/40 self-center">+{job.requiredSkills.length - 5} more</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
