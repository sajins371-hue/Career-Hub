import { APP_NAME } from '../config/brand';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Search, FileText, GraduationCap, Mic, Compass,
  Building2, Bell, User, LogOut, Users, Award, Menu, X, ClipboardCheck, FileUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../api';

const candidateNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/courses', label: 'Learn', icon: GraduationCap },
  { to: '/assessments', label: 'Assessments', icon: Award },
  { to: '/interviews', label: 'Mock Interviews', icon: Mic },
  { to: '/resume', label: 'Resume', icon: FileUp },
  { to: '/jobs', label: 'Jobs', icon: Search },
  { to: '/applications', label: 'Applications', icon: FileText },
  { to: '/career', label: 'Career planner', icon: Compass },
  { to: '/companies', label: 'Companies', icon: Building2 }
];

const adminNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/recruiter-requests', label: 'Recruiter requests', icon: Users },
  { to: '/admin/job-approvals', label: 'Job Approvals', icon: ClipboardCheck },
  { to: '/assessments', label: 'Assessments', icon: Award },
  { to: '/companies', label: 'Companies', icon: Building2 }
];

const recruiterNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/recruiter', label: 'Hiring', icon: Users },
  { to: '/companies', label: 'Companies', icon: Building2 }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = user?.role === 'admin' ? adminNav : user?.role === 'recruiter' ? recruiterNav : candidateNav;

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 60_000,
    enabled: !!user?.emailVerified
  });
  const unreadCount = data?.notifications?.filter((n) => !n.read).length || 0;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = (user?.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen flex app-shell">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`w-[248px] shrink-0 bg-ink flex flex-col fixed md:static inset-y-0 left-0 z-50 transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-control bg-milestone text-ink font-display font-bold flex items-center justify-center">{APP_NAME[0]}</span>
            <span className="font-display text-lg text-white">{APP_NAME}</span>
          </div>
          <button className="md:hidden text-white/60" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-control px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_#D9902F]' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-5 pt-3 border-t border-white/10 flex flex-col gap-1">
          <NavLink
            to="/notifications"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-control px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_#D9902F]' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <span className="flex items-center gap-3"><Bell size={17} /> Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-milestone text-white text-[11px] leading-none rounded-full px-1.5 py-1">{unreadCount}</span>
            )}
          </NavLink>
          <NavLink
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-control px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_#D9902F]' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <User size={17} /> Profile
          </NavLink>
          <button onClick={handleLogout} className="flex items-center gap-3 rounded-control px-3.5 py-2.5 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white text-left">
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-line bg-white flex items-center gap-3 px-4 md:px-8 sticky top-0 z-30">
          <button className="md:hidden text-ink/60" onClick={() => setMobileOpen(true)}><Menu size={22} /></button>
          <div className="flex-1 max-w-md relative hidden sm:block">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
            <input
              placeholder="Search anything..."
              className="w-full rounded-control border border-line bg-paper/70 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-compass focus:bg-white transition-all"
              readOnly
            />
          </div>
          <div className="flex-1 sm:hidden" />
          <div className="flex items-center gap-4">
            <NavLink to="/notifications" className="relative text-ink/50 hover:text-ink">
              <Bell size={19} />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-milestone" />}
            </NavLink>
            <div className="h-8 w-px bg-line hidden sm:block" />
            <NavLink to="/profile" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-ink text-white flex items-center justify-center text-xs font-semibold">
                {initials}
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-medium text-ink truncate max-w-[9rem]">{user?.name}</p>
                <p className="text-xs text-ink/45 capitalize">{user?.role || 'Candidate'}</p>
              </div>
            </NavLink>
          </div>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-[1420px] w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
