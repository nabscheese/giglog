'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

const guestLinks = [
  ['/', 'Feed'], ['/discover', 'Discover'], ['/artists', 'Artists'], ['/venues', 'Venues'], ['/festivals', 'Festivals'], ['/people', 'People'],
] as const;

const memberLinks = [
  ['/dashboard', 'Dashboard'], ['/memories', 'Memories'], ['/feed', 'Feed'], ['/discover', 'Discover'], ['/artists', 'Artists'], ['/venues', 'Venues'], ['/festivals', 'Festivals'], ['/people', 'People'], ['/stats', 'Stats'], ['/wrapped', 'Wrapped'], ['/achievements', 'Badges'], ['/passport', 'Passport'],
] as const;

export function Nav() {
  const path = usePathname();
  const { user, loading, openAuth, signOut } = useAuth();
  const [profileHref, setProfileHref] = useState('/profile');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) { setProfileHref('/profile'); return; }
    void supabase.from('profiles').select('username').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (active && data?.username) setProfileHref(`/u/${encodeURIComponent(data.username)}`);
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => setMenuOpen(false), [path]);

  const links = useMemo(() => user ? [...memberLinks, [profileHref, 'Profile'] as const] : [...guestLinks], [user, profileHref]);
  function isActive(href: string, label: string) {
    if (label === 'Profile') return path === '/profile' || path === profileHref;
    if (href === '/') return path === '/';
    return path === href || path.startsWith(`${href}/`);
  }

  return <nav className={`nav mobile-nav${menuOpen ? ' menu-open' : ''}`}>
    <Link className="brand" href={user ? '/dashboard' : '/'}>GIG <span>LOG</span></Link>
    <button className="mobile-menu-button" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen((current) => !current)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
    <div className="navlinks" aria-label="Main navigation">{links.map(([href, label]) => <Link key={label} className={isActive(href, label) ? 'active' : ''} href={href}>{label}</Link>)}</div>
    <div className="nav-actions">
      {loading ? null : user ? <><Link className="btn small nav-log-button" href="/gigs/new">Log a gig</Link><button className="ghost nav-signout" type="button" onClick={() => void signOut()}>Sign out</button></> : <><button className="ghost nav-login" type="button" onClick={() => openAuth('in')}>Log in</button><button className="btn small nav-join" type="button" onClick={() => openAuth('up')}>Join</button></>}
    </div>
  </nav>;
}
