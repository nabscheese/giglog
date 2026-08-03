'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthMode = 'in' | 'up';
type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  openAuth: (mode?: AuthMode, returnTo?: string) => void;
  closeAuth: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('in');
  const [returnTo, setReturnTo] = useState('/dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const openAuth = useCallback((nextMode: AuthMode = 'in', nextReturnTo?: string) => {
    setMode(nextMode);
    setReturnTo(nextReturnTo || pathname || '/dashboard');
    setMessage('');
    setDrawerOpen(true);
  }, [pathname]);

  const closeAuth = useCallback(() => {
    setDrawerOpen(false);
    setMessage('');
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const result = mode === 'up'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === 'up' && !result.data.session) {
      setMessage('Check your email to confirm your account.');
      return;
    }
    setDrawerOpen(false);
    router.push(returnTo || '/dashboard');
    router.refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user || null,
    loading,
    openAuth,
    closeAuth,
    signOut,
  }), [session, loading, openAuth, closeAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <div className={`auth-drawer-backdrop${drawerOpen ? ' open' : ''}`} onMouseDown={closeAuth} aria-hidden={!drawerOpen}>
        <aside className="auth-drawer" onMouseDown={(event) => event.stopPropagation()} aria-label={mode === 'in' ? 'Log in' : 'Join GigLog'}>
          <button className="auth-drawer-close" type="button" onClick={closeAuth} aria-label="Close login panel"><X size={22} /></button>
          <div className="eyebrow">// your life in live music</div>
          <h2>{mode === 'in' ? 'WELCOME BACK' : 'JOIN THE CROWD'}</h2>
          <p>{mode === 'in' ? 'Log in to add memories, follow fans and join the conversation.' : 'Create a free account and start building your live-music history.'}</p>
          <form onSubmit={submit}>
            <div className="field"><label htmlFor="drawer-email">Email</label><input id="drawer-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <div className="field"><label htmlFor="drawer-password">Password</label><input id="drawer-password" className="input" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
            {message ? <p className={message.startsWith('Check') ? 'success' : 'error'}>{message}</p> : null}
            <button className="btn auth-drawer-submit" disabled={submitting}>{submitting ? 'One sec…' : mode === 'in' ? 'Log in' : 'Create account'}</button>
          </form>
          <button className="auth-mode-switch" type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMessage(''); }}>
            {mode === 'in' ? 'New here? Join GigLog' : 'Already have an account? Log in'}
          </button>
        </aside>
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
