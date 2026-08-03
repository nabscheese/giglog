'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Award, ExternalLink, Instagram, MapPin, Music2, Pencil } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { FollowButton } from '@/components/FollowButton';
import { GigCard } from '@/components/GigCard';
import { Loading } from '@/components/Loading';
import { LazyVenueMap } from '@/components/LazyVenueMap';
import { BulkPublishGigs } from '@/components/BulkPublishGigs';
import { supabase } from '@/lib/supabase';
import { buildAchievements } from '@/lib/achievements';
import type { Gig, Profile } from '@/lib/types';

const PAGE_SIZE = 12;

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [viewerId, setViewerId] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setProfileLoading(true);
      setError('');
      setVisibleCount(PAGE_SIZE);

      const [authResult, profileResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('profiles')
          .select('*')
          .eq('username', decodeURIComponent(username))
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const currentViewerId = authResult.data.user?.id || '';
      setViewerId(currentViewerId);

      if (profileResult.error) {
        setError(profileResult.error.message);
        setProfileLoading(false);
        return;
      }

      const profileData = profileResult.data as Profile | null;
      setProfile(profileData);
      setProfileLoading(false);

      if (!profileData) return;

      setContentLoading(true);

      let gigsQuery = supabase
        .from('gigs')
        .select('*, profiles!gigs_user_id_profiles_fkey(username,display_name,avatar_url), review_likes(user_id), comments(id)')
        .eq('user_id', profileData.id)
        .order('event_date', { ascending: false });

      if (currentViewerId !== profileData.id) gigsQuery = gigsQuery.eq('is_public', true);

      const [gigsResult, followersResult, followingResult] = await Promise.all([
        gigsQuery,
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileData.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profileData.id),
      ]);

      if (cancelled) return;

      if (gigsResult.error) setError(gigsResult.error.message);
      setGigs((gigsResult.data || []) as Gig[]);
      setCounts({ followers: followersResult.count || 0, following: followingResult.count || 0 });
      setContentLoading(false);
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const isOwner = Boolean(profile && viewerId === profile.id);
  const visibleGigs = useMemo(() => (isOwner ? gigs : gigs.filter((gig) => gig.is_public)), [gigs, isOwner]);
  const publicGigs = useMemo(() => gigs.filter((gig) => gig.is_public), [gigs]);
  const memoryGigs = useMemo(() => publicGigs.slice(0, visibleCount), [publicGigs, visibleCount]);
  const earnedBadges = useMemo(
    () => buildAchievements(visibleGigs).filter((badge) => badge.unlocked),
    [visibleGigs],
  );

  const stats = useMemo(() => {
    const artists = new Set<string>();
    const venues = new Set<string>();
    const artistCounts = new Map<string, number>();
    const venueCounts = new Map<string, number>();
    let ratingTotal = 0;

    visibleGigs.forEach((gig) => {
      artists.add(gig.artist_name.toLowerCase());
      venues.add(gig.venue_name.toLowerCase());
      ratingTotal += gig.overall_rating;
      artistCounts.set(gig.artist_name, (artistCounts.get(gig.artist_name) || 0) + 1);
      venueCounts.set(gig.venue_name, (venueCounts.get(gig.venue_name) || 0) + 1);
    });

    return {
      artists: artists.size,
      venues: venues.size,
      average: visibleGigs.length ? (ratingTotal / visibleGigs.length).toFixed(1) : '—',
      topArtist: [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—',
      topVenue: [...venueCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—',
    };
  }, [visibleGigs]);

  function markPublished(ids: string[]) {
    setGigs((current) => current.map((gig) => (ids.includes(gig.id) ? { ...gig, is_public: true } : gig)));
  }

  if (profileLoading) {
    return <><Nav /><main className="shell"><Loading label="Opening the profile…" /></main></>;
  }

  if (!profile) {
    return <><Nav /><main className="shell"><div className="empty">{error || 'Profile not found.'}</div></main></>;
  }

  const displayName = profile.display_name || profile.username;
  const initial = displayName[0]?.toUpperCase() || '?';
  const mapGigs = isOwner ? gigs : publicGigs;

  return (
    <>
      <Nav />
      <main className="shell public-profile-shell">
        <section
          className={`public-profile-cover${profile.cover_url ? ' has-image' : ''}`}
          style={profile.cover_url ? { backgroundImage: `linear-gradient(180deg, rgba(17,17,17,.08), rgba(17,17,17,.96)), url("${profile.cover_url}")` } : undefined}
        >
          <div className="public-profile-grain" />
          <div className="public-profile-identity">
            {profile.avatar_url ? (
              <img className="public-profile-avatar" src={profile.avatar_url} alt={`${displayName}'s profile`} decoding="async" fetchPriority="high" />
            ) : (
              <div className="public-profile-avatar fallback">{initial}</div>
            )}

            <div className="public-profile-copy">
              <div className="eyebrow">@{profile.username}</div>
              <h1>{displayName}</h1>
              <p>{profile.bio || 'No bio yet — just loud rooms and good memories.'}</p>
              <div className="public-profile-meta">
                <span><MapPin size={14} /> {profile.home_city || 'Somewhere loud'}</span>
                <span>{counts.followers} followers</span>
                <span>{counts.following} following</span>
                {isOwner && !contentLoading ? <span>{publicGigs.length}/{gigs.length} public</span> : null}
              </div>

              {(profile.favourite_genres || []).length ? (
                <div className="public-profile-genres">{(profile.favourite_genres || []).map((genre) => <span key={genre}>{genre}</span>)}</div>
              ) : null}

              <div className="public-profile-links">
                {profile.instagram ? <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer"><Instagram size={15} /> Instagram</a> : null}
                {profile.spotify_url ? <a href={profile.spotify_url} target="_blank" rel="noreferrer"><Music2 size={15} /> Spotify</a> : null}
                {profile.website ? <a href={profile.website} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Website</a> : null}
              </div>
            </div>

            {isOwner ? <Link className="btn" href="/profile"><Pencil size={15} /> Edit profile</Link> : <FollowButton profileId={profile.id} />}
          </div>
        </section>

        {contentLoading ? (
          <section className="profile-content-loading" aria-label="Loading profile details">
            <div className="profile-stats-skeleton">{Array.from({ length: 6 }).map((_, index) => <span key={index} />)}</div>
            <div className="profile-section-skeleton" />
          </section>
        ) : (
          <>
            <section className="public-profile-stats" aria-label="Profile statistics">
              <div><span>Gigs</span><strong>{visibleGigs.length}</strong></div>
              <div><span>Artists</span><strong>{stats.artists}</strong></div>
              <div><span>Venues</span><strong>{stats.venues}</strong></div>
              <div><span>Average</span><strong>{stats.average}</strong></div>
              <div className="wide"><span>Top artist</span><strong>{stats.topArtist}</strong></div>
              <div className="wide"><span>Top venue</span><strong>{stats.topVenue}</strong></div>
            </section>

            {earnedBadges.length ? (
              <section className="profile-badge-showcase" aria-label="Earned badges">
                <div className="profile-badge-heading">
                  <div>
                    <span className="eyebrow">// achievements unlocked</span>
                    <h2><Award size={22} /> Badge cabinet</h2>
                    <p>{earnedBadges.length} {earnedBadges.length === 1 ? 'badge' : 'badges'} earned so far.</p>
                  </div>
                  <Link className="ghost" href="/achievements">View all badges</Link>
                </div>

                <div className="profile-badge-grid">
                  {earnedBadges.slice(0, 8).map((badge) => (
                    <article className={`profile-badge-card ${badge.tier}`} key={badge.id}>
                      <span className="profile-badge-icon" aria-hidden="true">{badge.icon}</span>
                      <div>
                        <span className="profile-badge-tier">{badge.tier}</span>
                        <h3>{badge.name}</h3>
                        <p>{badge.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {mapGigs.length ? <LazyVenueMap gigs={mapGigs} /> : null}

            {isOwner ? <BulkPublishGigs userId={profile.id} gigs={gigs} onPublished={markPublished} /> : null}

            <section className="public-profile-memories">
              <div className="archive-heading">
                <div>
                  <span className="eyebrow">// recent memories</span>
                  <h2>{publicGigs.length ? `${publicGigs.length} public ${publicGigs.length === 1 ? 'gig' : 'gigs'}` : 'No public gigs yet'}</h2>
                </div>
              </div>

              {publicGigs.length ? (
                <>
                  <div className="ticket-grid">{memoryGigs.map((gig) => <GigCard key={gig.id} gig={gig} />)}</div>
                  {visibleCount < publicGigs.length ? (
                    <div className="profile-load-more">
                      <button className="ghost" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                        Load {Math.min(PAGE_SIZE, publicGigs.length - visibleCount)} more memories
                      </button>
                      <span>{memoryGigs.length} of {publicGigs.length} shown</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="empty">This archive is waiting for its first public memory.</div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
