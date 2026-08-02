'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const baseLinks = [
  ['/dashboard', 'Dashboard'],
  ['/', 'Archive'],
  ['/feed', 'Feed'],
  ['/discover', 'Discover'],
  ['/artists', 'Artists'],
  ['/venues', 'Venues'],
  ['/festivals', 'Festivals'],
  ['/people', 'People'],
  ['/stats', 'Stats'],
  ['/achievements', 'Badges'],
  ['/passport', 'Passport'],
] as const;

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const [profileHref, setProfileHref] = useState('/profile');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function resolvePublicProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle();
      if (active && data?.username) setProfileHref(`/u/${encodeURIComponent(data.username)}`);
    }
    void resolvePublicProfile();
    return () => { active = false; };
  }, []);

  useEffect(() => setMenuOpen(false), [path]);

  const links = useMemo(() => [...baseLinks, [profileHref, 'Profile'] as const], [profileHref]);

  function isActive(href: string, label: string) {
    if (label === 'Profile') return path === '/profile' || path === profileHref;
    if (href === '/') return path === '/';
    return path === href || path.startsWith(`${href}/`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/auth');
  }

  return (
    <nav className={`nav mobile-nav${menuOpen ? ' menu-open' : ''}`}>
      <Link className="brand" href="/dashboard">GIG <span>LOG</span></Link>

      <button
        className="mobile-menu-button"
        type="button"
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <div className="navlinks" aria-label="Main navigation">
        {links.map(([href, label]) => (
          <Link key={label} className={isActive(href, label) ? 'active' : ''} href={href}>{label}</Link>
        ))}
      </div>

      <div className="nav-actions">
        <Link className="btn small nav-log-button" href="/gigs/new">Log a gig</Link>
        <button className="ghost nav-signout" type="button" onClick={() => void signOut()}>Sign out</button>
      </div>
    </nav>
  );
}
