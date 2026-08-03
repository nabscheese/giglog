'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CalendarPlus,
  Camera,
  MapPin,
  Music2,
  Sparkles,
  Star,
  Ticket,
  Users,
} from 'lucide-react';
import { Nav } from '@/components/Nav';
import { AuthGuard } from '@/components/AuthGuard';
import { GigCard } from '@/components/GigCard';
import { Loading } from '@/components/Loading';
import { supabase } from '@/lib/supabase';
import type { Gig, Profile } from '@/lib/types';

function countTop(items: string[]) {
  const counts = new Map<string, number>();
  items.filter(Boolean).forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myGigs, setMyGigs] = useState<Gig[]>([]);
  const [feed, setFeed] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(userError?.message || 'You need to sign in again.');
        setLoading(false);
        return;
      }

      const [{ data: profileData }, { data: gigsData }, { data: followsData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase
          .from('gigs')
          .select('*, profiles!gigs_user_id_profiles_fkey(username,display_name,avatar_url), review_likes(user_id), comments(id)')
          .eq('user_id', user.id)
          .order('event_date', { ascending: false }),
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
      ]);

      setProfile((profileData || null) as Profile | null);
      setMyGigs((gigsData || []) as Gig[]);

      const followingIds = (followsData || []).map((item) => item.following_id);
      if (followingIds.length) {
        const { data: feedData } = await supabase
          .from('gigs')
          .select('*, profiles!gigs_user_id_profiles_fkey(username,display_name,avatar_url), review_likes(user_id), comments(id)')
          .in('user_id', followingIds)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(4);
        setFeed((feedData || []) as Gig[]);
      }

      setLoading(false);
    }

    void loadDashboard();
  }, []);

  const now = new Date();
  const currentYear = String(now.getFullYear());

  const thisYear = useMemo(
    () => myGigs.filter((gig) => gig.event_date.startsWith(currentYear)),
    [myGigs, currentYear],
  );

  const summary = useMemo(() => {
    const average = thisYear.length
      ? (thisYear.reduce((total, gig) => total + gig.overall_rating, 0) / thisYear.length).toFixed(1)
      : '—';

    return {
      average,
      artists: new Set(thisYear.map((gig) => gig.artist_name.toLowerCase())).size,
      venues: new Set(thisYear.map((gig) => gig.venue_name.toLowerCase())).size,
      cities: new Set(thisYear.map((gig) => gig.city).filter(Boolean)).size,
      topArtist: countTop(thisYear.map((gig) => gig.artist_name)),
      topVenue: countTop(thisYear.map((gig) => gig.venue_name)),
    };
  }, [thisYear]);

  const recent = myGigs.slice(0, 4);
  const photoCount = myGigs.reduce((total, gig) => total + (gig.photo_urls?.length || 0), 0);
  const firstName = (profile?.display_name || profile?.username || 'gig fan').split(' ')[0];
  const greeting = now.getHours() < 12 ? 'Morning' : now.getHours() < 18 ? 'Afternoon' : 'Evening';

  const profileChecks = [
    Boolean(profile?.avatar_url),
    Boolean(profile?.cover_url),
    Boolean(profile?.bio),
    Boolean(profile?.home_city),
    Boolean(profile?.favourite_genres?.length),
  ];
  const profilePercent = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100);

  if (loading) {
    return (
      <AuthGuard>
        <Nav />
        <main className="shell"><Loading label="Opening the venue…" /></main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Nav />
      <main className="shell dashboard-shell">
        <section className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <div className="eyebrow">// your live-music home</div>
            <h1>{greeting}, <span className="accent">{firstName}</span></h1>
            <p>Your memories, your people and your year in live music — all in one place.</p>
            <div className="button-row">
              <Link className="btn" href="/gigs/new"><CalendarPlus size={17} /> Log a gig</Link>
              <Link className="ghost" href="/"><Ticket size={17} /> Open archive</Link>
            </div>
          </div>

          <div className={`dashboard-profile-card${profilePercent === 100 ? ' complete' : ''}`}>
            <div className="dashboard-profile-top">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" />
              ) : (
                <div className="dashboard-avatar-fallback">{firstName[0]?.toUpperCase()}</div>
              )}
              <div>
                <span>{profilePercent === 100 ? 'PROFILE LIVE' : 'PROFILE COMPLETION'}</span>
                <strong>{profilePercent === 100 ? 'ALL SET' : `${profilePercent}%`}</strong>
              </div>
              {profilePercent === 100 ? <BadgeCheck className="dashboard-profile-check" size={32} /> : null}
            </div>
            {profilePercent === 100 ? (
              <div className="dashboard-profile-complete-line" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            ) : (
              <div className="dashboard-progress"><span style={{ width: `${profilePercent}%` }} /></div>
            )}
            <p>
              {profilePercent === 100
                ? 'Your profile is live. Share it with the crowd or give it a fresh look.'
                : 'Add a cover, bio, city and genres to finish your profile.'}
            </p>
            <Link href={profilePercent === 100 && profile?.username ? `/u/${profile.username}` : '/profile'}>
              {profilePercent === 100 ? 'View public profile' : 'Edit profile'} <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {error ? <p className="error">{error}</p> : null}

        <section className="dashboard-year" aria-label={`${currentYear} summary`}>
          <div className="dashboard-year-title">
            <span>{currentYear}</span>
            <strong>Your year so far</strong>
          </div>
          <div className="dashboard-metric highlight"><Ticket size={18} /><span>Gigs</span><strong>{thisYear.length}</strong></div>
          <div className="dashboard-metric"><Music2 size={18} /><span>Artists</span><strong>{summary.artists}</strong></div>
          <div className="dashboard-metric"><MapPin size={18} /><span>Venues</span><strong>{summary.venues}</strong></div>
          <div className="dashboard-metric"><Star size={18} /><span>Average</span><strong>{summary.average}</strong></div>
          <div className="dashboard-metric"><Camera size={18} /><span>Photos</span><strong>{photoCount}</strong></div>
        </section>

        <section className="dashboard-split">
          <article className="panel dashboard-spotlight">
            <div className="section-heading">
              <div><span className="eyebrow">// current favourites</span><h2>Your headliners</h2></div>
              <Link href="/stats">Full stats <ArrowRight size={14} /></Link>
            </div>
            <div className="dashboard-headliners">
              <div><span>TOP ARTIST</span><strong>{summary.topArtist?.[0] || 'Start logging'}</strong><small>{summary.topArtist?.[1] || 0} shows this year</small></div>
              <div><span>TOP VENUE</span><strong>{summary.topVenue?.[0] || 'Start exploring'}</strong><small>{summary.topVenue?.[1] || 0} visits this year</small></div>
              <div><span>CITIES</span><strong>{summary.cities}</strong><small>places heard loud</small></div>
            </div>
          </article>

          <article className="panel dashboard-shortcuts">
            <div className="section-heading"><div><span className="eyebrow">// quick access</span><h2>Backstage pass</h2></div></div>
            <Link href="/discover"><Sparkles size={18} /><span><strong>Discover shows</strong><small>Find something new nearby</small></span><ArrowRight size={16} /></Link>
            <Link href="/people"><Users size={18} /><span><strong>Find people</strong><small>Follow friends and gig fans</small></span><ArrowRight size={16} /></Link>
            <Link href={profilePercent === 100 && profile?.username ? `/u/${profile.username}` : '/profile'}><Camera size={18} /><span><strong>{profilePercent === 100 ? 'Share your profile' : 'Finish your profile'}</strong><small>{profilePercent === 100 ? 'See your public page' : 'Add your cover and favourites'}</small></span><ArrowRight size={16} /></Link>
          </article>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <div><span className="eyebrow">// recent memories</span><h2>Back in the crowd</h2></div>
            <Link href="/">View all <ArrowRight size={14} /></Link>
          </div>
          {recent.length ? <div className="ticket-grid">{recent.map((gig) => <GigCard key={gig.id} gig={gig} />)}</div> : <div className="empty"><h2>No memories yet</h2><p>Log your first gig to start filling the wall.</p><Link className="btn" href="/gigs/new">Log a gig</Link></div>}
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <div><span className="eyebrow">// from people you follow</span><h2>Friends in the pit</h2></div>
            <Link href="/feed">Open feed <ArrowRight size={14} /></Link>
          </div>
          {feed.length ? <div className="ticket-grid">{feed.map((gig) => <GigCard key={gig.id} gig={gig} />)}</div> : <div className="empty"><h2>Your feed is quiet</h2><p>Follow a few people and their latest memories will appear here.</p><Link className="btn" href="/people">Find people</Link></div>}
        </section>
      </main>
    </AuthGuard>
  );
}
