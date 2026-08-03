'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { GigCard } from '@/components/GigCard';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { Gig } from '@/lib/types';

export default function Feed() {
  const { user, openAuth } = useAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [followingOnly, setFollowingOnly] = useState(false);
  const [following, setFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (user) {
        const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        setFollowing((follows || []).map((row) => row.following_id));
      } else {
        setFollowing([]);
        setFollowingOnly(false);
      }
      const { data } = await supabase.from('gigs').select('*, profiles!gigs_user_id_profiles_fkey(username,display_name,avatar_url), review_likes(user_id), comments(id)').eq('is_public', true).order('created_at', { ascending: false }).limit(60);
      setGigs((data || []) as Gig[]);
      setLoading(false);
    }
    void load();
  }, [user]);

  const shown = useMemo(() => followingOnly ? gigs.filter((gig) => following.includes(gig.user_id)) : gigs, [followingOnly, gigs, following]);

  return <><Nav /><main className="shell"><section className="hero"><div><div className="eyebrow">// what the crowd has been hearing</div><h1>ACTIVITY <span className="accent">FEED</span></h1><p className="hero-copy">Browse public memories without an account. Join when you want to like, comment or follow.</p></div>{user ? <label className="toggle"><input type="checkbox" checked={followingOnly} onChange={(event) => setFollowingOnly(event.target.checked)} /> Following only</label> : <button className="btn" onClick={() => openAuth('up')}>Join the crowd</button>}</section>{loading ? <Loading /> : shown.length ? <div className="ticket-grid">{shown.map((gig) => <GigCard gig={gig} key={gig.id} />)}</div> : <div className="empty"><h2>Your feed is quiet</h2><p>Follow a few fans to fill it up.</p><Link className="btn" href="/people">Find people</Link></div>}</main></>;
}
