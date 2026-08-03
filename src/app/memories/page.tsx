'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { AuthGuard } from '@/components/AuthGuard';
import { GigCard } from '@/components/GigCard';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import type { Gig } from '@/lib/types';

type SortMode = 'newest' | 'oldest' | 'highest';

export default function MemoriesPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [query, setQuery] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [minimumRating, setMinimumRating] = useState(0);
  const [eventType, setEventType] = useState('all');
  const [sort, setSort] = useState<SortMode>('newest');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    async function loadArchive() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id || '');

      const { data } = await supabase
        .from('gigs')
        .select('*, profiles!gigs_user_id_profiles_fkey(username,display_name,avatar_url), review_likes(user_id), comments(id)')
        .order('event_date', { ascending: false });

      setGigs((data || []) as Gig[]);
      setLoading(false);
    }

    void loadArchive();
  }, []);

  const myGigs = useMemo(() => gigs.filter((gig) => gig.user_id === userId), [gigs, userId]);

  const shown = useMemo(() => {
    const filtered = gigs.filter((gig) => {
      const haystack = [
        gig.artist_name,
        gig.venue_name,
        gig.festival_name || '',
        gig.city || '',
        gig.country || '',
      ]
        .join(' ')
        .toLowerCase();

      return (
        haystack.includes(query.trim().toLowerCase()) &&
        (!mineOnly || gig.user_id === userId) &&
        (!minimumRating || gig.overall_rating >= minimumRating) &&
        (eventType === 'all' || gig.event_type === eventType)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'highest') return b.overall_rating - a.overall_rating;
      if (sort === 'oldest') return a.event_date.localeCompare(b.event_date);
      return b.event_date.localeCompare(a.event_date);
    });
  }, [gigs, query, mineOnly, minimumRating, eventType, sort, userId]);

  const average = myGigs.length
    ? (myGigs.reduce((total, gig) => total + gig.overall_rating, 0) / myGigs.length).toFixed(1)
    : '—';

  const topArtist = useMemo(() => {
    const counts = new Map<string, number>();
    myGigs.forEach((gig) => counts.set(gig.artist_name, (counts.get(gig.artist_name) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Start logging';
  }, [myGigs]);

  return (
    <AuthGuard>
      <Nav />
      <main className="shell archive-shell">
        <section className="archive-hero">
          <div>
            <div className="eyebrow">// your live-music memory box</div>
            <h1>
              YOUR <span className="accent">MEMORIES</span>
            </h1>
            <p>Every crowd, chorus and questionable venue pint — kept as a memory you can revisit.</p>
          </div>
          <Link className="btn archive-cta" href="/gigs/new">
            <CalendarPlus size={18} /> Log a gig
          </Link>
        </section>

        <section className="archive-dashboard" aria-label="Your archive summary">
          <div className="archive-stat featured">
            <span>GIGS LOGGED</span>
            <strong>{myGigs.length}</strong>
            <small>Your personal live-music history</small>
          </div>
          <div className="archive-stat">
            <span>ARTISTS</span>
            <strong>{new Set(myGigs.map((gig) => gig.artist_name.toLowerCase())).size}</strong>
          </div>
          <div className="archive-stat">
            <span>VENUES</span>
            <strong>{new Set(myGigs.map((gig) => gig.venue_name.toLowerCase())).size}</strong>
          </div>
          <div className="archive-stat">
            <span>AVERAGE</span>
            <strong>{average}</strong>
          </div>
          <div className="archive-stat top-artist">
            <span>TOP ARTIST</span>
            <strong>{topArtist}</strong>
          </div>
        </section>

        <section className="archive-controls">
          <div className="archive-search">
            <Search size={17} />
            <input
              aria-label="Search archive"
              placeholder="Search artist, venue, city or festival…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="archive-filter-row">
            <span className="filter-label"><SlidersHorizontal size={15} /> FILTER</span>
            <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
              <option value="all">All types</option>
              <option value="gig">Gigs</option>
              <option value="festival">Festivals</option>
              <option value="club-night">Club nights</option>
              <option value="comedy">Comedy</option>
              <option value="other">Other</option>
            </select>
            <select value={minimumRating} onChange={(event) => setMinimumRating(Number(event.target.value))}>
              <option value="0">Any rating</option>
              <option value="5">5 stars</option>
              <option value="4">4+ stars</option>
              <option value="3">3+ stars</option>
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest rated</option>
            </select>
            <label className="archive-toggle">
              <input type="checkbox" checked={mineOnly} onChange={(event) => setMineOnly(event.target.checked)} />
              Mine only
            </label>
          </div>
        </section>

        <div className="archive-heading">
          <div>
            <span className="eyebrow">// ticket collection</span>
            <h2>{shown.length} {shown.length === 1 ? 'memory' : 'memories'}</h2>
          </div>
          <span><Sparkles size={15} /> Tap a ticket to open the full memory</span>
        </div>

        {loading ? (
          <Loading />
        ) : shown.length ? (
          <div className="ticket-grid">
            {shown.map((gig) => <GigCard key={gig.id} gig={gig} />)}
          </div>
        ) : (
          <EmptyState
            title="No stubs found"
            body={query || mineOnly || minimumRating || eventType !== 'all'
              ? 'Try changing your filters.'
              : 'Your archive is waiting for its first memory.'}
            href={!query && !mineOnly && !minimumRating && eventType === 'all' ? '/gigs/new' : undefined}
            label="Log your first gig"
          />
        )}
      </main>
    </AuthGuard>
  );
}
