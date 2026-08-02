'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, MapPin, Stamp, Ticket } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { Loading } from '@/components/Loading';
import { Nav } from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import type { Gig } from '@/lib/types';

function countryFlag(country?: string | null) {
  const map: Record<string, string> = {
    'united kingdom': '🇬🇧', england: '🏴', scotland: '🏴', wales: '🏴',
    'northern ireland': '🇬🇧', ireland: '🇮🇪', france: '🇫🇷', germany: '🇩🇪',
    netherlands: '🇳🇱', spain: '🇪🇸', italy: '🇮🇹', belgium: '🇧🇪', usa: '🇺🇸',
  };
  return map[(country || '').trim().toLowerCase()] || '🎵';
}

export default function PassportPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('all');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('gigs')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: false });
      setGigs((data || []) as Gig[]);
      setLoading(false);
    }
    void load();
  }, []);

  const years = useMemo(() => [...new Set(gigs.map((gig) => gig.event_date.slice(0, 4)))], [gigs]);
  const shown = year === 'all' ? gigs : gigs.filter((gig) => gig.event_date.startsWith(year));
  const places = new Set(shown.map((gig) => `${gig.city || 'Unknown'},${gig.country || ''}`)).size;

  if (loading) {
    return <AuthGuard><Nav /><main className="shell"><Loading label="Stamping your passport…" /></main></AuthGuard>;
  }

  return (
    <AuthGuard>
      <Nav />
      <main className="shell passport-shell">
        <section className="passport-hero">
          <div>
            <div className="eyebrow">// every venue leaves a mark</div>
            <h1>CONCERT <span className="accent">PASSPORT</span></h1>
            <p>Your live-music life, stamped one memory at a time.</p>
          </div>
          <div className="passport-summary">
            <BookOpen size={25} />
            <strong>{shown.length}</strong>
            <span>stamps across {places} places</span>
          </div>
        </section>

        <div className="passport-toolbar">
          <label>
            YEAR
            <select value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="all">All years</option>
              {years.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <Link className="ghost" href="/gigs/new"><Ticket size={15} /> Add another stamp</Link>
        </div>

        {shown.length ? (
          <section className="passport-book">
            {shown.map((gig, index) => {
              const date = new Date(`${gig.event_date}T00:00:00`);
              return (
                <Link key={gig.id} href={`/gigs/${gig.id}`} className={`passport-stamp stamp-${index % 4}`}>
                  <div className="passport-stamp-top">
                    <span className="passport-flag">{countryFlag(gig.country)}</span>
                    <Stamp size={24} />
                  </div>
                  <div className="passport-place"><MapPin size={14} /> {gig.city || gig.venue_name}</div>
                  <h2>{gig.artist_name}</h2>
                  <p>{gig.venue_name}{gig.festival_name ? ` · ${gig.festival_name}` : ''}</p>
                  <div className="passport-rating">{'★'.repeat(gig.overall_rating)}{'☆'.repeat(Math.max(0, 5 - gig.overall_rating))}</div>
                  <div className="passport-date">
                    <strong>{date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}</strong>
                    <span>{date.getFullYear()}</span>
                  </div>
                </Link>
              );
            })}
          </section>
        ) : (
          <div className="empty"><h2>Your passport is blank</h2><p>Log a gig to earn your first stamp.</p><Link className="btn" href="/gigs/new">Log a gig</Link></div>
        )}
      </main>
    </AuthGuard>
  );
}
