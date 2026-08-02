'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, LockKeyhole, Sparkles, Trophy } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { Loading } from '@/components/Loading';
import { Nav } from '@/components/Nav';
import { buildAchievements, nextLockedAchievement } from '@/lib/achievements';
import { supabase } from '@/lib/supabase';
import type { Gig } from '@/lib/types';

export default function AchievementsPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

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

  const achievements = useMemo(() => buildAchievements(gigs), [gigs]);
  const unlocked = achievements.filter((item) => item.unlocked);
  const next = nextLockedAchievement(achievements);
  const shown = achievements.filter((item) => {
    if (filter === 'unlocked') return item.unlocked;
    if (filter === 'locked') return !item.unlocked;
    return true;
  });

  if (loading) {
    return <AuthGuard><Nav /><main className="shell"><Loading label="Checking your trophy case…" /></main></AuthGuard>;
  }

  return (
    <AuthGuard>
      <Nav />
      <main className="shell achievements-shell">
        <section className="achievements-hero">
          <div>
            <div className="eyebrow">// proof you were there</div>
            <h1>YOUR <span className="accent">BADGES</span></h1>
            <p>Every gig adds another story. Every badge proves how far your live-music life has travelled.</p>
          </div>
          <div className="achievement-score">
            <Trophy size={28} />
            <strong>{unlocked.length}</strong>
            <span>of {achievements.length} unlocked</span>
          </div>
        </section>

        <section className="achievement-overview">
          <div className="achievement-progress-card">
            <span>COLLECTION COMPLETE</span>
            <strong>{Math.round((unlocked.length / achievements.length) * 100)}%</strong>
            <div className="achievement-big-progress"><i style={{ width: `${(unlocked.length / achievements.length) * 100}%` }} /></div>
          </div>
          <div className="achievement-next-card">
            <Sparkles size={20} />
            <div>
              <span>NEXT CLOSEST</span>
              <strong>{next?.name || 'All done'}</strong>
              <small>{next ? `${next.progress} / ${next.target} — ${next.description}` : 'You unlocked everything.'}</small>
            </div>
          </div>
        </section>

        <div className="achievement-toolbar">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'unlocked' ? 'active' : ''} onClick={() => setFilter('unlocked')}>Unlocked</button>
          <button className={filter === 'locked' ? 'active' : ''} onClick={() => setFilter('locked')}>Locked</button>
        </div>

        <section className="badge-grid">
          {shown.map((badge) => {
            const percent = Math.round((badge.progress / badge.target) * 100);
            return (
              <article key={badge.id} className={`badge-card ${badge.tier} ${badge.unlocked ? 'unlocked' : 'locked'}`}>
                <div className="badge-icon">{badge.unlocked || !badge.hidden ? badge.icon : <LockKeyhole size={28} />}</div>
                <div className="badge-copy">
                  <div className="badge-title-row">
                    <span>{badge.tier}</span>
                    {badge.unlocked ? <Award size={16} /> : <LockKeyhole size={15} />}
                  </div>
                  <h2>{badge.hidden && !badge.unlocked ? 'Hidden achievement' : badge.name}</h2>
                  <p>{badge.hidden && !badge.unlocked ? 'Keep logging memories to reveal this badge.' : badge.description}</p>
                  {!badge.hidden || badge.unlocked ? (
                    <>
                      <div className="badge-progress"><i style={{ width: `${percent}%` }} /></div>
                      <small>{badge.progress} / {badge.target}</small>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </AuthGuard>
  );
}
