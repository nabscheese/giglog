'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, TentTree } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { Loading } from '@/components/Loading';
import { supabase } from '@/lib/supabase';

type FestivalRow = {
  festival_name: string;
  visits: number;
  average: number;
};

type SortMode = 'visits' | 'rating' | 'name';

export default function Festivals() {
  const [rows, setRows] = useState<FestivalRow[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('visits');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadFestivals() {
      setLoading(true);
      setError('');

      const { data, error: loadError } = await supabase
        .from('festival_stats')
        .select('*');

      if (loadError) {
        setError(loadError.message);
        setRows([]);
      } else {
        setRows((data || []) as FestivalRow[]);
      }

      setLoading(false);
    }

    void loadFestivals();
  }, []);

  const shown = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = rows.filter((festival) =>
      festival.festival_name.toLowerCase().includes(search),
    );

    return [...filtered].sort((a, b) => {
      if (sort === 'rating') return Number(b.average) - Number(a.average);
      if (sort === 'name') return a.festival_name.localeCompare(b.festival_name);
      return Number(b.visits) - Number(a.visits);
    });
  }, [query, rows, sort]);

  const totalVisits = rows.reduce((total, row) => total + Number(row.visits || 0), 0);
  const weightedAverage = totalVisits
    ? rows.reduce(
        (total, row) => total + Number(row.average || 0) * Number(row.visits || 0),
        0,
      ) / totalVisits
    : 0;

  return (
    <>
      <Nav />
      <main className="shell">
        <section className="hero">
          <div>
            <div className="eyebrow">// wristbands, mud and impossible clashes</div>
            <h1>
              FESTIVAL <span className="accent">RATINGS</span>
            </h1>
          </div>
        </section>

        <section className="festival-summary" aria-label="Festival summary">
          <div><strong>{rows.length}</strong><span>Festivals</span></div>
          <div><strong>{totalVisits}</strong><span>Logged sets</span></div>
          <div><strong>{weightedAverage ? weightedAverage.toFixed(1) : '—'}</strong><span>Average rating</span></div>
        </section>

        <section className="festival-toolbar">
          <label className="festival-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search festivals…"
              aria-label="Search festivals"
            />
          </label>

          <label className="festival-sort">
            <SlidersHorizontal size={15} />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              aria-label="Sort festivals"
            >
              <option value="visits">Most visited</option>
              <option value="rating">Highest rated</option>
              <option value="name">A–Z</option>
            </select>
          </label>
        </section>

        {loading ? (
          <Loading label="Finding festival memories…" />
        ) : error ? (
          <div className="empty">Could not load festivals: {error}</div>
        ) : shown.length ? (
          <div className="festival-grid">
            {shown.map((festival) => (
              <article className="festival-card" key={festival.festival_name}>
                <div className="festival-card-icon"><TentTree size={24} /></div>
                <div>
                  <span className="eyebrow">// festival collection</span>
                  <h2>{festival.festival_name}</h2>
                  <div className="festival-rating">{Number(festival.average).toFixed(1)}/5</div>
                  <p className="meta">
                    {festival.visits} logged set{festival.visits === 1 ? '' : 's'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">
            {query
              ? `No festivals match “${query}”.`
              : 'Add a festival name while logging a gig and it will appear here.'}
          </div>
        )}
      </main>
    </>
  );
}
