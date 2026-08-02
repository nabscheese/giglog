'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ExternalLink, Instagram, MapPin, Music2 } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { AuthGuard } from '@/components/AuthGuard';
import { FollowButton } from '@/components/FollowButton';
import { GigCard } from '@/components/GigCard';
import { Loading } from '@/components/Loading';
import { supabase } from '@/lib/supabase';
import type { Gig, Profile } from '@/lib/types';

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError('');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', decodeURIComponent(username))
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      if (!profileData) {
        setLoading(false);
        return;
      }

      const [gigsResult, followersResult, followingResult] = await Promise.all([
        supabase
          .from('gigs')
          .select(
            '*, profiles!gigs_user_id_profiles_fkey(username,display_name,avatar_url), review_likes(user_id), comments(id)',
          )
          .eq('user_id', profileData.id)
          .eq('is_public', true)
          .order('event_date', { ascending: false }),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profileData.id),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profileData.id),
      ]);

      if (gigsResult.error) setError(gigsResult.error.message);
      setGigs((gigsResult.data || []) as Gig[]);
      setCounts({
        followers: followersResult.count || 0,
        following: followingResult.count || 0,
      });
      setLoading(false);
    }

    void loadProfile();
  }, [username]);

  const stats = useMemo(() => {
    const artists = new Set(gigs.map((gig) => gig.artist_name.toLowerCase()));
    const venues = new Set(gigs.map((gig) => gig.venue_name.toLowerCase()));
    const average = gigs.length
      ? (gigs.reduce((sum, gig) => sum + gig.overall_rating, 0) / gigs.length).toFixed(1)
      : '—';

    const artistCounts = new Map<string, number>();
    const venueCounts = new Map<string, number>();
    gigs.forEach((gig) => {
      artistCounts.set(gig.artist_name, (artistCounts.get(gig.artist_name) || 0) + 1);
      venueCounts.set(gig.venue_name, (venueCounts.get(gig.venue_name) || 0) + 1);
    });

    return {
      artists: artists.size,
      venues: venues.size,
      average,
      topArtist: [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—',
      topVenue: [...venueCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—',
    };
  }, [gigs]);

  if (loading) {
    return (
      <AuthGuard>
        <Nav />
        <main className="shell"><Loading label="Opening the profile…" /></main>
      </AuthGuard>
    );
  }

  if (!profile) {
    return (
      <AuthGuard>
        <Nav />
        <main className="shell"><div className="empty">{error || 'Profile not found.'}</div></main>
      </AuthGuard>
    );
  }

  const displayName = profile.display_name || profile.username;
  const initial = displayName[0]?.toUpperCase() || '?';

  return (
    <AuthGuard>
      <Nav />
      <main className="shell public-profile-shell">
        <section
          className={`public-profile-cover${profile.cover_url ? ' has-image' : ''}`}
          style={
            profile.cover_url
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(17,17,17,.08), rgba(17,17,17,.96)), url("${profile.cover_url}")`,
                }
              : undefined
          }
        >
          <div className="public-profile-grain" />
          <div className="public-profile-identity">
            {profile.avatar_url ? (
              <img className="public-profile-avatar" src={profile.avatar_url} alt={`${displayName}'s profile`} />
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
              </div>

              {(profile.favourite_genres || []).length ? (
                <div className="public-profile-genres">
                  {(profile.favourite_genres || []).map((genre) => <span key={genre}>{genre}</span>)}
                </div>
              ) : null}

              <div className="public-profile-links">
                {profile.instagram ? (
                  <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer">
                    <Instagram size={15} /> Instagram
                  </a>
                ) : null}
                {profile.spotify_url ? (
                  <a href={profile.spotify_url} target="_blank" rel="noreferrer">
                    <Music2 size={15} /> Spotify
                  </a>
                ) : null}
                {profile.website ? (
                  <a href={profile.website} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} /> Website
                  </a>
                ) : null}
              </div>
            </div>

            <FollowButton profileId={profile.id} />
          </div>
        </section>

        <section className="public-profile-stats" aria-label="Profile statistics">
          <div><span>Gigs</span><strong>{gigs.length}</strong></div>
          <div><span>Artists</span><strong>{stats.artists}</strong></div>
          <div><span>Venues</span><strong>{stats.venues}</strong></div>
          <div><span>Average</span><strong>{stats.average}</strong></div>
          <div className="wide"><span>Top artist</span><strong>{stats.topArtist}</strong></div>
          <div className="wide"><span>Top venue</span><strong>{stats.topVenue}</strong></div>
        </section>

        <section className="public-profile-memories">
          <div className="archive-heading">
            <div>
              <span className="eyebrow">// recent memories</span>
              <h2>{gigs.length ? `${gigs.length} public ${gigs.length === 1 ? 'gig' : 'gigs'}` : 'No public gigs yet'}</h2>
            </div>
          </div>

          {gigs.length ? (
            <div className="ticket-grid">{gigs.map((gig) => <GigCard key={gig.id} gig={gig} />)}</div>
          ) : (
            <div className="empty">This archive is waiting for its first public memory.</div>
          )}
        </section>
      </main>
    </AuthGuard>
  );
}
