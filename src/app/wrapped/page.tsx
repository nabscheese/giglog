'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Camera, MapPin, Share2, Sparkles, Star, Trophy } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { AuthGuard } from '@/components/AuthGuard';
import { Loading } from '@/components/Loading';
import { supabase } from '@/lib/supabase';
import type { Gig } from '@/lib/types';

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || null;
}

export default function WrappedPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const { data } = await supabase.from('gigs').select('*').eq('user_id', user.id).order('event_date');
      setGigs((data || []) as Gig[]);
      setLoading(false);
    })();
  }, []);

  const years = useMemo(() => {
    const found = [...new Set(gigs.map((gig) => Number(gig.event_date.slice(0, 4))))].sort((a, b) => b - a);
    return found.length ? found : [currentYear];
  }, [gigs, currentYear]);

  useEffect(() => {
    if (!years.includes(year)) setYear(years[0]);
  }, [years, year]);

  const wrapped = useMemo(() => {
    const selected = gigs.filter((gig) => Number(gig.event_date.slice(0, 4)) === year);
    const sorted = [...selected].sort((a, b) => a.event_date.localeCompare(b.event_date));
    const average = selected.length ? selected.reduce((sum, gig) => sum + gig.overall_rating, 0) / selected.length : 0;
    const topArtist = mostCommon(selected.map((gig) => gig.artist_name));
    const topVenue = mostCommon(selected.map((gig) => gig.venue_name));
    const topCity = mostCommon(selected.map((gig) => gig.city || ''));
    const topMonth = mostCommon(selected.map((gig) => new Date(`${gig.event_date}T00:00:00`).toLocaleDateString('en-GB', { month: 'long' })));
    const highest = [...selected].sort((a, b) => b.overall_rating - a.overall_rating || a.event_date.localeCompare(b.event_date))[0] || null;
    const photos = selected.reduce((sum, gig) => sum + (gig.photo_urls?.length || 0), 0);
    return {
      selected,
      average,
      topArtist,
      topVenue,
      topCity,
      topMonth,
      highest,
      photos,
      artists: new Set(selected.map((gig) => gig.artist_name.toLowerCase())).size,
      venues: new Set(selected.map((gig) => gig.venue_name.toLowerCase())).size,
      cities: new Set(selected.map((gig) => gig.city?.toLowerCase()).filter(Boolean)).size,
      first: sorted[0] || null,
      last: sorted.at(-1) || null,
    };
  }, [gigs, year]);

  async function shareWrapped() {
    const text = `${year} on GigLog: ${wrapped.selected.length} gigs, ${wrapped.artists} artists, ${wrapped.average.toFixed(1)}★ average${wrapped.topArtist ? `, top artist ${wrapped.topArtist[0]}` : ''}.`;
    try {
      if (navigator.share) await navigator.share({ title: `My GigLog ${year}`, text, url: window.location.href });
      else await navigator.clipboard.writeText(text);
    } catch { /* sharing was cancelled */ }
  }

  if (loading) return <AuthGuard><Nav /><main className="shell"><Loading label="Building your Wrapped…" /></main></AuthGuard>;

  return <AuthGuard><Nav /><main className="shell wrapped-shell">
    <section className="wrapped-hero">
      <div>
        <div className="eyebrow">// your year in live music</div>
        <h1>GIGLOG <span>WRAPPED</span></h1>
        <p>The crowds, cities, photos and artists that made your year loud.</p>
      </div>
      <div className="wrapped-actions">
        <select className="input compact" value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((item) => <option key={item}>{item}</option>)}</select>
        <button className="btn" type="button" onClick={() => void shareWrapped()}><Share2 size={16} /> Share</button>
      </div>
    </section>

    {!wrapped.selected.length ? <div className="empty"><h2>No memories for {year}</h2><p>Log a gig from this year and your Wrapped will appear here.</p><Link className="btn" href="/gigs/new">Log a gig</Link></div> : <>
      <section className="wrapped-lead-card">
        <span>{year}</span>
        <strong>{wrapped.selected.length}</strong>
        <h2>{wrapped.selected.length === 1 ? 'live memory' : 'live memories'}</h2>
        <p>{wrapped.artists} artists · {wrapped.venues} venues · {wrapped.cities} cities</p>
      </section>

      <section className="wrapped-grid">
        <article className="wrapped-card acid"><Sparkles /><small>Top artist</small><h2>{wrapped.topArtist?.[0] || '—'}</h2><p>{wrapped.topArtist?.[1] || 0} appearances</p></article>
        <article className="wrapped-card pink"><MapPin /><small>Top venue</small><h2>{wrapped.topVenue?.[0] || '—'}</h2><p>{wrapped.topVenue?.[1] || 0} visits</p></article>
        <article className="wrapped-card"><Star /><small>Average rating</small><h2>{wrapped.average.toFixed(1)}★</h2><p>Across every memory</p></article>
        <article className="wrapped-card"><Camera /><small>Photos saved</small><h2>{wrapped.photos}</h2><p>Moments kept forever</p></article>
        <article className="wrapped-card"><CalendarDays /><small>Favourite month</small><h2>{wrapped.topMonth?.[0] || '—'}</h2><p>{wrapped.topMonth?.[1] || 0} gigs</p></article>
        <article className="wrapped-card"><Trophy /><small>Highest rated</small><h2>{wrapped.highest?.artist_name || '—'}</h2><p>{wrapped.highest ? `${wrapped.highest.overall_rating}/5 · ${wrapped.highest.venue_name}` : 'No ratings yet'}</p></article>
      </section>

      <section className="wrapped-bookends">
        <article><span>FIRST NIGHT</span><h3>{wrapped.first?.artist_name}</h3><p>{wrapped.first && new Date(`${wrapped.first.event_date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} · {wrapped.first?.venue_name}</p></article>
        <ArrowRight size={28} />
        <article><span>FINAL NIGHT</span><h3>{wrapped.last?.artist_name}</h3><p>{wrapped.last && new Date(`${wrapped.last.event_date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} · {wrapped.last?.venue_name}</p></article>
      </section>

      <section className="wrapped-timeline">
        <div className="wrapped-section-heading"><div><span className="eyebrow">// the full year</span><h2>Your {year} timeline</h2></div><Link className="ghost" href="/memories">Open memories</Link></div>
        {wrapped.selected.slice().sort((a, b) => a.event_date.localeCompare(b.event_date)).map((gig, index) => <Link href={`/gigs/${gig.id}`} className="wrapped-timeline-row" key={gig.id}><span>{String(index + 1).padStart(2, '0')}</span><time>{new Date(`${gig.event_date}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</time><div><strong>{gig.artist_name}</strong><small>{gig.venue_name}{gig.city ? ` · ${gig.city}` : ''}</small></div><b>{gig.overall_rating}/5</b></Link>)}
      </section>
    </>}
  </main></AuthGuard>;
}
