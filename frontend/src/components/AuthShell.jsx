import { APP_NAME } from '../config/brand';

const steps = [
  ['Learn', 'Close skill gaps with courses'],
  ['Practice', 'Mock interviews with feedback'],
  ['Prove', 'Assessments reviewed by people'],
  ['Get hired', 'Roles matched to your skills']
];

export default function AuthShell({ children }) {
  const mark = <span className="h-9 w-9 rounded-control bg-milestone text-ink font-display font-bold text-lg flex items-center justify-center">{APP_NAME[0]}</span>;
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-paper">
      <div className="hidden lg:flex bg-ink text-white p-12 flex-col justify-between">
        <div className="flex items-center gap-3">{mark}<span className="font-display text-xl">{APP_NAME}</span></div>
        <div>
          <h1 className="font-display text-5xl max-w-md">Every step toward the offer, in one place.</h1>
          <p className="text-white/60 mt-5 max-w-sm">Build job-ready skills, prove them, and get matched with roles that fit.</p>
        </div>
        <ol className="grid grid-cols-4 items-end gap-3">
          {steps.map(([title, body], i) => (
            <li key={title} className="flex flex-col justify-end rounded-t-card bg-white/[.07] border-t-2 border-milestone p-4" style={{ height: 120 + i * 44 }}>
              <span className="text-milestone text-sm font-semibold">{i + 1}</span>
              <span className="font-display text-lg mt-1">{title}</span>
              <span className="text-xs text-white/55 mt-1 leading-snug">{body}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex items-center justify-center px-4 py-10 md:px-10">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex items-center gap-3 mb-8">{mark}<span className="font-display text-xl">{APP_NAME}</span></div>
          {children}
        </div>
      </div>
    </div>
  );
}
