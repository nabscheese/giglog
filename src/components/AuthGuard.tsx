'use client';

import { LockKeyhole } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { useAuth } from '@/components/AuthProvider';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, openAuth } = useAuth();
  if (loading) return <main className="center"><div className="loader">checking your wristband…</div></main>;
  if (!user) {
    return <>
      <Nav />
      <main className="shell"><section className="private-gate panel"><LockKeyhole size={30} /><div><div className="eyebrow">// members area</div><h1>YOUR WRISTBAND, PLEASE</h1><p>Log in or join GigLog to open this part of the venue.</p><div className="button-row"><button className="btn" onClick={() => openAuth('up')}>Join GigLog</button><button className="ghost" onClick={() => openAuth('in')}>Log in</button></div></div></section></main>
    </>;
  }
  return <>{children}</>;
}
