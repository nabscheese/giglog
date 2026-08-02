'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

  useEffect(() => {
    let active = true;

    async function resolvePublicProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      if (active && data?.username) {
        setProfileHref(`/u/${encodeURIComponent(data.username)}`);
      }
    }

    void resolvePublicProfile();

    return () => {
      active = false;
    };
  }, []);

  const links = useMemo(
    () => [...baseLinks, [profileHref, 'Profile'] as const],
    [profileHref],
  );

  function isActive(href: string, label: string) {
    if (label === 'Profile') {
      return path === '/profile' || path === profileHref;
    }

    if (href === '/') return path === '/';
    return path === href || path.startsWith(`${href}/`);
  }

  return (
    <nav className="nav">
      <Link className="brand" href="/dashboard">
        GIG <span>LOG</span>
      </Link>

      <div className="navlinks">
        {links.map(([href, label]) => (
          <Link
            key={label}
            className={isActive(href, label) ? 'active' : ''}
            href={href}
          >
            {label}
          </Link>
        ))}
      </div>

      <button
        className="ghost"
        onClick={async () => {
          await supabase.auth.signOut();
          router.push('/auth');
        }}
      >
        Sign out
      </button>
    </nav>
  );
}
