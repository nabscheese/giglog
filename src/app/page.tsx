'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Camera, Heart, MessageCircle, Sparkles, Ticket, Users } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { GigCard } from '@/components/GigCard';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { Gig } from '@/lib/types';

export default function PublicHome() {
  const { user, openAuth } = useAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('gigs')
        .select('*, profiles!gigs_user_id_profiles_fkey(username,display_name,avatar_url), review_likes(user_id), comments(id)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(24);
      setGigs((data || []) as Gig[]);
      setLoading(false);
    }
    void load();
  }, []);

  const stats = useMemo(() => ({
    memories: gigs.length,
    fans: new Set(gigs.map((gig) => gig.user_id)).size,
    photos: gigs.reduce((total, gig) => total + (gig.photo_urls?.length || 0), 0),
  }), [gigs]);

  return <>
    <Nav />
    <main className="public-home">
      <section className="public-hero shell">
        <div className="public-hero-copy">
          <div className="eyebrow">// the social diary for live music</div>
          <h1>REMEMBER EVERY GIG.<br /><span className="accent">DISCOVER YOUR NEXT.</span></h1>
          <p>Log the shows that changed you, collect photos and setlists, follow other fans and turn your concert history into something worth revisiting.</p>
          <div className="public-hero-actions">
            {user ? <Link className="btn" href="/dashboard">Open your dashboard <ArrowRight size={17} /></Link> : <><button className="btn" onClick={() => openAuth('up')}>Join GigLog free <ArrowRight size={17} /></button><button className="ghost" onClick={() => openAuth('in')}>Log in</button></>}
          </div>
          <div className="public-proof"><span><Ticket size={15} /> {stats.memories} recent memories</span><span><Users size={15} /> {stats.fans} fans sharing</span><span><Camera size={15} /> {stats.photos} photos</span></div>
        </div>
        <div className="public-hero-poster" aria-hidden="true"><span>LIVE</span><strong>MUSIC<br />LIVES<br />HERE</strong><small>GIGLOG / EST. NOW</small></div>
      </section>

      <section className="public-feed shell">
        <div className="public-section-heading"><div><span className="eyebrow">// latest from the crowd</span><h2>PUBLIC FEED</h2></div><Link className="ghost" href="/feed">See the full feed <ArrowRight size={15} /></Link></div>
        {loading ? <Loading label="Opening the venue doors…" /> : gigs.length ? <div className="ticket-grid">{gigs.slice(0, 8).map((gig) => <GigCard key={gig.id} gig={gig} />)}</div> : <EmptyState title="The room is quiet" body="Public memories will appear here as fans start sharing." />}
      </section>

      <section className="public-feature-strip shell">
        <article><Sparkles size={23} /><h3>Build your memories</h3><p>Ratings, photos, setlists, stories and every tiny detail you never want to forget.</p></article>
        <article><Heart size={23} /><h3>Find your crowd</h3><p>Follow fans with great taste, like reviews and discover shows through people you trust.</p></article>
        <article><MessageCircle size={23} /><h3>Talk about the night</h3><p>Keep the post-gig conversation going long after the house lights come up.</p></article>
      </section>

      {!user ? <section className="public-cta shell"><div><div className="eyebrow">// your first stamp is waiting</div><h2>YOUR LIVE-MUSIC LIFE DESERVES A HOME.</h2></div><button className="btn" onClick={() => openAuth('up')}>Create your free profile</button></section> : null}
    </main>
  </>;
}
