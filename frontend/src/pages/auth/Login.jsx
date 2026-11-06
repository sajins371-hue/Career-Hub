import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../lib/apiClient';
import { APP_NAME } from '../../config/brand';
import AuthShell from '../../components/AuthShell';
import { Button, Input } from '../../components/ui';
import { Mail, Lock, Eye, Sparkles } from 'lucide-react';

export default function Login() {
  const { login, loading } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [form,setForm]=useState({email:'',password:''}); const [error,setError]=useState('');
  async function handleSubmit(e){e.preventDefault();setError('');try{await login(form.email,form.password);navigate(location.state?.from?.pathname||'/',{replace:true});}catch(err){setError(apiErrorMessage(err,'Could not sign in with those details.'));}}
  return <AuthShell><form onSubmit={handleSubmit} className="app-panel rounded-card p-7 md:p-8 flex flex-col gap-4">
    <div><h2 className="font-display text-2xl text-ink mt-1">Sign in to continue</h2><p className="text-sm text-ink/50 mt-1">Access your learning, interviews and job journey.</p></div>
    <Field icon={Mail}><Input label="Email Address" type="email" required placeholder="john@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
    <Field icon={Lock}><Input label="Password" type="password" required placeholder="Enter your password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></Field>
    {error&&<p className="text-sm text-alert">{error}</p>}
    <div className="flex justify-end -mt-1"><Link to="/forgot-password" className="text-xs font-semibold text-compass hover:underline">Forgot password?</Link></div>
    <Button type="submit" disabled={loading} size="lg" className="w-full mt-1">{loading?'Signing in…':'Sign In'}</Button>
    <p className="text-sm text-center text-ink/50 pt-1">Don't have an account? <Link to="/register" className="text-compass font-semibold hover:underline">Register</Link></p>
  </form></AuthShell>
}
function Field({icon:Icon,children}){return <div className="relative"><span className="absolute left-3 bottom-3 z-10 text-ink/35"><Icon size={15}/></span><div className="[&_input]:pl-9">{children}</div></div>}
function Pill({icon:Icon,text}){return <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-compass/15 px-3 py-2 text-xs font-semibold">{Icon&&<Icon size={13}/>} {text}</span>}
