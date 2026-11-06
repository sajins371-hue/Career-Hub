export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-base' };
  const variants = {
    primary: 'bg-compass text-white hover:bg-compass-dark',
    secondary: 'bg-white border border-line text-ink hover:border-ink/40',
    ghost: 'bg-transparent text-ink/65 hover:text-compass hover:bg-compass/5',
    danger: 'bg-alert text-white hover:opacity-90'
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

export function Input({ label, error, hint, className = '', id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-ink">{label}</label>}
      <input
        id={inputId}
        className={`app-input rounded-control border px-3.5 py-2.5 text-sm bg-panel placeholder:text-ink/35
          ${error ? 'border-alert' : 'border-line focus:border-compass'} outline-none transition-colors ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-ink/50">{hint}</p>}
      {error && <p className="text-xs text-alert">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-ink">{label}</label>}
      <textarea
        id={inputId}
        className={`app-input rounded-control border px-3.5 py-2.5 text-sm bg-panel placeholder:text-ink/35 resize-y
          ${error ? 'border-alert' : 'border-line focus:border-compass'} outline-none transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-alert">{error}</p>}
    </div>
  );
}

export function Panel({ className = '', children }) {
  return <div className={`app-panel rounded-card ${className}`}>{children}</div>;
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-ink/5 text-ink/70',
    gold: 'bg-milestone/10 text-milestone-dark',
    green: 'bg-signal/10 text-signal',
    red: 'bg-alert/10 text-alert',
    compass: 'bg-compass/10 text-compass'
  };
  return (
    <span className={`inline-flex items-center rounded-tag px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Spinner({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin text-compass" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="text-center py-16 px-6">
      <h3 className="font-display text-xl text-ink mb-1.5">{title}</h3>
      {body && <p className="text-sm text-ink/55 max-w-sm mx-auto mb-5">{body}</p>}
      {action}
    </div>
  );
}

/** A ring gauge for match/interview scores — the one "big number" moment, used deliberately
 * rather than a generic linear progress bar, since a score is the thing worth making memorable. */
export function ScoreRing({ score = 0, size = 88, label }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const color = score >= 75 ? '#16A34A' : score >= 50 ? '#E85D75' : '#DC2626';

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E6E9F5" strokeWidth="7" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="font-display" fontSize={size * 0.28} fill="#0F172A">
          {Math.round(score)}
        </text>
      </svg>
      {label && <span className="text-xs text-ink/50">{label}</span>}
    </div>
  );
}

export function Divider({ className = '' }) {
  return <div className={`h-px bg-line ${className}`} />;
}
