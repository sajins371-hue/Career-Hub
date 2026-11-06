import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { usersApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiClient';
import { Panel, Input, Button, Badge, Divider } from '../../components/ui';

export default function Profile() {
  const { user } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();

  const [headline, setHeadline] = useState(user?.headline || '');
  const [skills, setSkills] = useState(user?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState(user?.yearsOfExperience || 0);
  const [targetRoles, setTargetRoles] = useState(user?.careerGoals?.targetRoles || []);
  const [targetRoleInput, setTargetRoleInput] = useState('');
  const [city, setCity] = useState(user?.location?.city || '');
  const [country, setCountry] = useState(user?.location?.country || '');

  const saveMutation = useMutation({
    mutationFn: (data) => usersApi.updateProfile(data),
    onSuccess: (data) => {
      const stored = JSON.parse(localStorage.getItem('app_user') || '{}');
      localStorage.setItem('app_user', JSON.stringify({ ...stored, ...data.user }));
      push('Profile updated.', 'success');
      queryClient.invalidateQueries();
    },
    onError: (err) => push(apiErrorMessage(err, 'Could not save your profile.'), 'error')
  });

  function addSkill(e) {
    e.preventDefault();
    const value = skillInput.trim().toLowerCase();
    if (value && !skills.includes(value)) setSkills([...skills, value]);
    setSkillInput('');
  }

  function addTargetRole(e) {
    e.preventDefault();
    const value = targetRoleInput.trim();
    if (value && !targetRoles.includes(value)) setTargetRoles([...targetRoles, value]);
    setTargetRoleInput('');
  }

  function handleSave() {
    saveMutation.mutate({
      headline,
      skills,
      yearsOfExperience: Number(yearsOfExperience),
      careerGoals: { ...(user?.careerGoals || {}), targetRoles },
      location: { city, country }
    });
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Your profile</h1>
        <p className="text-ink/55 mt-1">This is what powers your matches, skill gaps, and interview questions.</p>
      </div>

      <Panel className="p-6 flex flex-col gap-5">
        <Input label="Headline" placeholder="e.g. Backend engineer who likes distributed systems" value={headline} onChange={(e) => setHeadline(e.target.value)} />

        <div className="grid grid-cols-2 gap-4">
          <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>

        <Input
          label="Years of experience" type="number" min="0" value={yearsOfExperience}
          onChange={(e) => setYearsOfExperience(e.target.value)}
        />

        <Divider />

        <div>
          <p className="text-sm font-medium text-ink mb-2">Skills</p>
          <form onSubmit={addSkill} className="flex gap-2 mb-3">
            <Input placeholder="Add a skill" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} className="flex-1" />
            <Button type="submit" variant="secondary" size="sm"><Plus size={15} /></Button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <Badge key={s}>
                <span className="flex items-center gap-1">
                  {s}
                  <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
                    <X size={11} />
                  </button>
                </span>
              </Badge>
            ))}
            {skills.length === 0 && <p className="text-xs text-ink/40">No skills added yet.</p>}
          </div>
        </div>

        <Divider />

        <div>
          <p className="text-sm font-medium text-ink mb-2">Target roles</p>
          <p className="text-xs text-ink/50 mb-2">Used for career planning and to weight job matches toward what you're aiming for.</p>
          <form onSubmit={addTargetRole} className="flex gap-2 mb-3">
            <Input placeholder="e.g. Senior Backend Engineer" value={targetRoleInput} onChange={(e) => setTargetRoleInput(e.target.value)} className="flex-1" />
            <Button type="submit" variant="secondary" size="sm"><Plus size={15} /></Button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {targetRoles.map((r) => (
              <Badge key={r} tone="gold">
                <span className="flex items-center gap-1">
                  {r}
                  <button type="button" onClick={() => setTargetRoles(targetRoles.filter((x) => x !== r))} aria-label={`Remove ${r}`}>
                    <X size={11} />
                  </button>
                </span>
              </Badge>
            ))}
            {targetRoles.length === 0 && <p className="text-xs text-ink/40">No target roles yet.</p>}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saveMutation.isPending} className="self-start mt-2">
          {saveMutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </Panel>
    </div>
  );
}
