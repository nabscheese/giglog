'use client';

import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { useAuth } from '@/components/AuthProvider';

export default function AuthPage() {
  const { user, openAuth } = useAuth();
  return <><Nav /><main className="shell"><section className="auth-landing panel"><div className="eyebrow">// welcome to giglog</div><h1>{user ? 'YOU ARE ALREADY IN.' : 'THE CROWD IS WAITING.'}</h1><p>{user ? 'Head to your dashboard or keep exploring the public feed.' : 'You can browse GigLog freely. Log in or create an account when you are ready to save memories and join the conversation.'}</p><div className="button-row">{user ? <Link className="btn" href="/dashboard">Open dashboard</Link> : <><button className="btn" onClick={() => openAuth('up', '/dashboard')}>Join GigLog</button><button className="ghost" onClick={() => openAuth('in', '/dashboard')}>Log in</button></>}</div></section></main></>;
}
