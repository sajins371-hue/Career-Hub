import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { jobsApi } from '../../api';
import JobCard from '../../components/JobCard';
import { Panel, Input, Spinner, EmptyState, Button } from '../../components/ui';

const TYPES = [['', 'Any type'], ['full-time', 'Full-time'], ['part-time', 'Part-time'], ['internship', 'Internship'], ['contract', 'Contract']];
const EMPTY = { q: '', country: '', remote: false, employmentType: '', page: 1 };

export default function JobSearch() {
  const [filters, setFilters] = useState(EMPTY);
  const [keyword, setKeyword] = useState('');
  const set = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['jobs', 'search', filters],
    queryFn: () => jobsApi.search({ ...filters, remote: filters.remote || undefined, limit: 10 }),
    placeholderData: keepPreviousData
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || 10))) : 1;
  const dirty = JSON.stringify({ ...filters, page: 1 }) !== JSON.stringify(EMPTY);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Find work</h1>
        <p className="text-ink/55 mt-1">Roles from several boards, checked for duplicates and quality.</p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6 items-start">
        <Panel className="p-5 flex flex-col gap-5 lg:sticky lg:top-24">
          <form onSubmit={(e) => { e.preventDefault(); set({ q: keyword }); }} className="flex flex-col gap-2">
            <Input label="Keyword" placeholder="Title, skill or company" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <Button type="submit" size="sm"><Search size={15} /> Search</Button>
          </form>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium text-ink mb-1">Job type</legend>
            {TYPES.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-ink/75 cursor-pointer">
                <input type="radio" name="type" className="accent-compass" checked={filters.employmentType === value} onChange={() => set({ employmentType: value })} />
                {label}
              </label>
            ))}
          </fieldset>
          <Input label="Country" placeholder="e.g. United States" value={filters.country} onChange={(e) => set({ country: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-ink/75 cursor-pointer">
            <input type="checkbox" className="accent-compass" checked={filters.remote} onChange={(e) => set({ remote: e.target.checked })} />
            Remote only
          </label>
          {dirty && <Button variant="ghost" size="sm" onClick={() => { setFilters(EMPTY); setKeyword(''); }}>Clear filters</Button>}
        </Panel>

        <section className="flex flex-col gap-3 min-w-0">
          {isLoading ? <div className="flex justify-center py-16"><Spinner /></div>
            : data?.jobs?.length ? (
              <>
                <p className="text-sm text-ink/55">
                  <span className="font-semibold text-ink">{data.total}</span> job{data.total !== 1 ? 's' : ''} found{isFetching ? ', updating…' : ''}
                </p>
                {data.jobs.map((job) => <JobCard key={job._id} job={job} />)}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <Button variant="secondary" size="sm" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>Previous</Button>
                    <span className="text-sm text-ink/55">Page {filters.page} of {totalPages}</span>
                    <Button variant="secondary" size="sm" disabled={filters.page >= totalPages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next</Button>
                  </div>
                )}
              </>
            ) : (
              <Panel><EmptyState title="No jobs match those filters" body="Try fewer filters or a broader keyword." action={dirty && <Button variant="secondary" onClick={() => { setFilters(EMPTY); setKeyword(''); }}>Clear filters</Button>} /></Panel>
            )}
        </section>
      </div>
    </div>
  );
}
