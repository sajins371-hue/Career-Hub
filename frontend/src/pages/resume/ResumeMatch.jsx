import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileUp, FileText, Trash2, Building2, Zap, ShieldCheck, ArrowRight, UploadCloud } from 'lucide-react';
import { resumeApi, usersApi } from '../../api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Panel, Button, Badge, Spinner, EmptyState, Divider } from '../../components/ui';

const MAX_BYTES = 5 * 1024 * 1024;

function fmtSize(b) { return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`; }

export default function ResumeMatch() {
  const { push } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInput = useRef(null);
  const [dragging, setDragging] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['resume'], queryFn: resumeApi.get });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['resume'] });
    queryClient.invalidateQueries({ queryKey: ['applications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const uploadMutation = useMutation({
    mutationFn: resumeApi.upload,
    onSuccess: (res) => {
      queryClient.setQueryData(['resume'], (old) => ({ ...(old || {}), ...res }));
      refresh();
      push(`Resume analysed — ${res.resume.parsedSkills.length} skills found, ${res.companies.length} companies matched.`, 'success');
    },
    onError: (err) => push(apiErrorMessage(err, 'Could not process that resume.'), 'error')
  });

  const removeMutation = useMutation({
    mutationFn: resumeApi.remove,
    onSuccess: () => { refresh(); push('Resume removed. Auto-apply has been turned off.', 'info'); },
    onError: (err) => push(apiErrorMessage(err), 'error')
  });

  const addSkillsMutation = useMutation({
    mutationFn: (skills) => usersApi.updateProfile({ skills }),
    onSuccess: (res) => {
      const stored = JSON.parse(localStorage.getItem('app_user') || '{}');
      localStorage.setItem('app_user', JSON.stringify({ ...stored, ...res.user }));
      push('Skills added to your profile.', 'success');
      queryClient.invalidateQueries();
    },
    onError: (err) => push(apiErrorMessage(err), 'error')
  });

  function handleFile(file) {
    if (!file) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) return push('Upload a PDF, DOCX or TXT file.', 'error');
    if (file.size > MAX_BYTES) return push('That file is over 5 MB.', 'error');
    uploadMutation.mutate(file);
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

  const resume = data?.resume;
  const companies = data?.companies || [];
  const profileSkills = new Set((user?.skills || []).map((s) => s.toLowerCase()));
  const newSkills = (resume?.parsedSkills || []).filter((s) => !profileSkills.has(s));

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="font-display text-3xl text-ink">Resume</h1>
        <p className="text-ink/55 mt-1">Upload your resume and we'll find the companies hiring for what you can already do.</p>
      </div>

      {/* Upload */}
      <Panel className="p-6">
        <input
          ref={fileInput} type="file" accept=".pdf,.docx,.txt" className="hidden"
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
        />
        {!resume ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
            className={`rounded-card border-2 border-dashed px-6 py-12 text-center transition-colors ${dragging ? 'border-compass bg-compass/5' : 'border-line'}`}
          >
            {uploadMutation.isPending ? (
              <div className="flex flex-col items-center gap-3"><Spinner size={28} /><p className="text-sm text-ink/60">Reading your resume and matching companies…</p></div>
            ) : (
              <>
                <UploadCloud size={34} className="mx-auto text-compass mb-3" />
                <p className="font-display text-lg text-ink">Drop your resume here</p>
                <p className="text-sm text-ink/50 mt-1 mb-4">PDF, DOCX or TXT · up to 5 MB</p>
                <Button onClick={() => fileInput.current?.click()}><FileUp size={16} /> Choose file</Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-11 w-11 rounded-control bg-compass/10 text-compass flex items-center justify-center shrink-0"><FileText size={20} /></span>
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{resume.fileName}</p>
                  <p className="text-xs text-ink/50">{fmtSize(resume.sizeBytes)} · uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()} disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? 'Analysing…' : 'Replace'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { if (window.confirm('Remove your resume? Auto-apply will be turned off.')) removeMutation.mutate(); }} disabled={removeMutation.isPending} aria-label="Remove resume">
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>

            <Divider />

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-ink">Skills detected</p>
                {newSkills.length > 0 && (
                  <Button variant="ghost" size="sm" disabled={addSkillsMutation.isPending}
                    onClick={() => addSkillsMutation.mutate([...new Set([...(user?.skills || []), ...newSkills])])}>
                    Add {newSkills.length} new to profile
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {resume.parsedSkills.map((s) => <Badge key={s} tone={profileSkills.has(s) ? 'neutral' : 'compass'}>{s}</Badge>)}
                {resume.parsedSkills.length === 0 && <p className="text-xs text-ink/45">No known skills found. Try a text-based PDF or DOCX, or add skills on your profile.</p>}
              </div>
              <p className="text-xs text-ink/45 mt-3">
                {resume.parsedYears > 0 ? `About ${resume.parsedYears} year${resume.parsedYears === 1 ? '' : 's'} of experience detected. ` : ''}
                Matches use your profile skills together with your resume.
              </p>
            </div>
          </div>
        )}
      </Panel>

      {resume && <AutoApplyPanel data={data} onChanged={refresh} />}

      {/* Companies */}
      {resume && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="font-display text-xl text-ink">Companies that fit your resume</h2>
              <p className="text-xs text-ink/45 mt-1">Ranked by your best-matching open role at each company</p>
            </div>
          </div>
          {companies.length === 0 ? (
            <Panel><EmptyState title="No matching companies yet" body="There are no open roles that fit your skills right now. Check back as new jobs are approved, or add more skills." action={<Link to="/profile"><Button variant="secondary">Update profile</Button></Link>} /></Panel>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {companies.map((c) => <CompanyCard key={c.companyId || c.name} company={c} />)}
            </div>
          )}
        </section>
      )}

      {data?.autoApplied?.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-ink mb-3">Recently auto-applied</h2>
          <Panel className="divide-y divide-line">
            {data.autoApplied.map((a) => (
              <div key={a._id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{a.job?.title || 'Job no longer listed'}</p>
                  <p className="text-xs text-ink/50">{a.job?.company?.name || a.job?.companyNameRaw} · {new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {typeof a.matchScore === 'number' && <Badge tone="green">{a.matchScore}%</Badge>}
                  <Badge>{a.status.replace('-', ' ')}</Badge>
                </div>
              </div>
            ))}
            <div className="px-5 py-3"><Link to="/applications" className="text-sm text-compass font-semibold inline-flex items-center gap-1">All applications <ArrowRight size={14} /></Link></div>
          </Panel>
        </section>
      )}
    </div>
  );
}

function CompanyCard({ company }) {
  const tone = company.bestScore >= 75 ? 'green' : 'neutral';
  return (
    <Panel className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-10 w-10 rounded-control bg-paper border border-line font-display font-semibold flex items-center justify-center shrink-0">
            {company.name[0].toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg text-ink truncate leading-tight">{company.name}</p>
            <p className="text-xs text-ink/50">{[company.industry, `${company.openRoles} matching role${company.openRoles === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <Badge tone={tone}>{company.bestScore}% match</Badge>
      </div>
      <div className="flex flex-col gap-1.5">
        {company.jobs.map((j) => (
          <Link key={j._id} to={`/jobs/${j._id}`} className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2 hover:border-compass transition-colors">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">{j.title}</p>
              {j.missingSkills?.length > 0 && <p className="text-xs text-ink/45 truncate">Missing: {j.missingSkills.slice(0, 3).join(', ')}</p>}
            </div>
            <span className="text-xs font-semibold text-ink/60 shrink-0">{j.score}%</span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function AutoApplyPanel({ data, onChanged }) {
  const { push } = useToast();
  const settings = data.autoApply;
  const [consent, setConsent] = useState(false);
  const [minScore, setMinScore] = useState(settings.minMatchScore);
  const [maxPerDay, setMaxPerDay] = useState(settings.maxPerDay);

  const mutation = useMutation({
    mutationFn: resumeApi.updateAutoApply,
    onSuccess: (res, vars) => {
      onChanged();
      if (vars.enabled === true) {
        setConsent(false);
        push(res.applied?.length ? `Auto-apply is on — applied to ${res.applied.length} job${res.applied.length === 1 ? '' : 's'} right away.` : 'Auto-apply is on. We\'ll apply when matching jobs appear.', 'success');
      } else if (vars.enabled === false) push('Auto-apply turned off.', 'info');
      else push('Auto-apply settings saved.', 'success');
    },
    onError: (err) => push(apiErrorMessage(err), 'error')
  });

  const runMutation = useMutation({
    mutationFn: resumeApi.runAutoApply,
    onSuccess: (res) => { onChanged(); push(res.applied?.length ? `Applied to ${res.applied.length} job${res.applied.length === 1 ? '' : 's'}.` : 'No new matching jobs to apply to right now.', res.applied?.length ? 'success' : 'info'); },
    onError: (err) => push(apiErrorMessage(err), 'error')
  });

  const dirty = minScore !== settings.minMatchScore || maxPerDay !== settings.maxPerDay;

  return (
    <Panel className="p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-control bg-milestone/10 text-milestone-dark flex items-center justify-center shrink-0"><Zap size={19} /></span>
          <div>
            <h2 className="font-display text-lg text-ink">Auto-apply</h2>
            <p className="text-sm text-ink/55 mt-0.5 max-w-xl">Let us submit applications for you to matching jobs from approved companies — only above the match score you choose, and never more than your daily limit.</p>
          </div>
        </div>
        <Badge tone={settings.enabled ? 'green' : 'neutral'}>{settings.enabled ? 'On' : 'Off'}</Badge>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Only apply at {minScore}% match or higher
          <input type="range" min="50" max="100" step="5" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="accent-[#0E6B5C]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Max {maxPerDay} application{maxPerDay === 1 ? '' : 's'} per day
          <input type="range" min="1" max="20" step="1" value={maxPerDay} onChange={(e) => setMaxPerDay(Number(e.target.value))} className="accent-[#0E6B5C]" />
        </label>
      </div>

      {!settings.enabled ? (
        <div className="rounded-card bg-paper border border-line p-4 flex flex-col gap-3">
          <label className="flex items-start gap-3 text-sm text-ink/80 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0E6B5C]" />
            <span>
              I give CareerHub permission to apply to jobs on my behalf using my profile and uploaded resume. I understand recruiters will see these as normal applications, and I can turn this off at any time.
            </span>
          </label>
          <Button className="self-start" disabled={!consent || mutation.isPending}
            onClick={() => mutation.mutate({ enabled: true, consent: true, minMatchScore: minScore, maxPerDay })}>
            <ShieldCheck size={16} /> {mutation.isPending ? 'Turning on…' : 'Turn on auto-apply'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {dirty && <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ minMatchScore: minScore, maxPerDay })}>Save changes</Button>}
          <Button size="sm" variant="secondary" disabled={runMutation.isPending} onClick={() => runMutation.mutate()}>{runMutation.isPending ? 'Applying…' : 'Apply to matches now'}</Button>
          <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate({ enabled: false })}>Turn off</Button>
          <p className="text-xs text-ink/45 ml-auto">
            {settings.consentedAt ? `Permission given ${new Date(settings.consentedAt).toLocaleDateString()}` : ''}
            {settings.lastRunAt ? ` · last run ${new Date(settings.lastRunAt).toLocaleString()}` : ''}
          </p>
        </div>
      )}
      <p className="text-xs text-ink/40 flex items-center gap-1.5"><Building2 size={12} /> Applies only to jobs posted directly on CareerHub; listings from other sites still open on their own site.</p>
    </Panel>
  );
}
