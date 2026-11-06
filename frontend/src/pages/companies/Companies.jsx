import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { companiesApi } from '../../api';
import { Panel, Spinner, EmptyState, Badge, Divider } from '../../components/ui';

export default function Companies() {
  const { id } = useParams();
  return id ? <CompanyDetail id={id} /> : <CompanyDirectory />;
}

function CompanyDirectory() {
  const { data, isLoading } = useQuery({ queryKey: ['companies'], queryFn: () => companiesApi.list({}) });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Companies</h1>
        <p className="text-ink/55 mt-1">Hiring trends, culture signals, and verification status before you apply.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : data?.companies?.length ? (
        <div className="grid grid-cols-2 gap-3">
          {data.companies.map((c) => (
            <Link key={c._id} to={`/companies/${c._id}`} className="block border border-line bg-panel rounded-control px-5 py-4 hover:border-compass transition-colors">
              <div className="flex items-start justify-between">
                <h3 className="font-display text-lg text-ink">{c.name}</h3>
                {c.isVerified && <Badge tone="green">Verified</Badge>}
              </div>
              <p className="text-sm text-ink/55 mt-1">{c.industry} {c.size ? `· ${c.size} employees` : ''}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No companies listed yet" />
      )}
    </div>
  );
}

function CompanyDetail({ id }) {
  const { data, isLoading } = useQuery({ queryKey: ['companies', id, 'intelligence'], queryFn: () => companiesApi.intelligence(id) });

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!data) return <EmptyState title="Company not found" />;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="font-display text-3xl text-ink">{data.company}</h1>
          {data.isVerified && <Badge tone="green">Verified</Badge>}
        </div>
        <p className="text-ink/55">{data.activeJobCount} open role{data.activeJobCount !== 1 ? 's' : ''} right now</p>
      </div>

      {data.hiringTrend?.length > 0 && (
        <Panel className="p-5">
          <h2 className="font-display text-lg text-ink mb-4">Hiring trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.hiringTrend}>
              <CartesianGrid stroke="#E6E9F5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#0F172AAA' }} />
              <YAxis tick={{ fontSize: 12, fill: '#0F172AAA' }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="jobsPosted" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {data.turnoverSignals && (
        <Panel className="p-5">
          <h2 className="font-display text-lg text-ink mb-3">Culture signals</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <SignalStat label="Avg. tenure" value={data.turnoverSignals.avgTenureMonths ? `${data.turnoverSignals.avgTenureMonths}mo` : '—'} />
            <SignalStat label="Recent layoffs" value={data.turnoverSignals.recentLayoffs ? 'Yes' : 'None reported'} warn={data.turnoverSignals.recentLayoffs} />
            <SignalStat label="Rating" value={data.turnoverSignals.glassdoorRating ? `${data.turnoverSignals.glassdoorRating}★` : '—'} />
          </div>
        </Panel>
      )}

      {data.interviewProcess?.length > 0 && (
        <Panel className="p-5">
          <h2 className="font-display text-lg text-ink mb-3">Typical interview process</h2>
          <ol className="flex flex-col gap-3">
            {data.interviewProcess.map((stage, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-compass/10 text-compass text-xs font-medium flex items-center justify-center shrink-0">{i + 1}</span>
                <div>
                  <p className="text-sm text-ink">{stage.stageName}</p>
                  {stage.typicalDurationDays && <p className="text-xs text-ink/45">~{stage.typicalDurationDays} days</p>}
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {data.salaryDistribution?.length > 0 && (
        <Panel className="p-5">
          <h2 className="font-display text-lg text-ink mb-3">Salary ranges</h2>
          <div className="flex flex-col divide-y divide-line">
            {data.salaryDistribution.map((s, i) => (
              <div key={i} className="flex justify-between py-2 text-sm">
                <span className="text-ink/70">{s.role}</span>
                <span className="text-ink font-medium">{s.currency} {s.min?.toLocaleString()}–{s.max?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function SignalStat({ label, value, warn }) {
  return (
    <div>
      <p className={`font-display text-xl ${warn ? 'text-alert' : 'text-ink'}`}>{value}</p>
      <p className="text-xs text-ink/50 mt-0.5">{label}</p>
    </div>
  );
}
