'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { Gig } from '@/lib/types';

const VenueMap = dynamic(
  () => import('@/components/VenueMap').then((module) => module.VenueMap),
  {
    ssr: false,
    loading: () => (
      <section className="venue-map-panel lazy-journey-placeholder" aria-busy="true">
        <div className="venue-map-heading">
          <div>
            <span className="eyebrow">// your live-music trail</span>
            <h2>Loading Gig Journey…</h2>
          </div>
        </div>
        <div className="profile-section-skeleton journey" />
      </section>
    ),
  },
);

export function LazyVenueMap({ gigs }: { gigs: Gig[] }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || shouldLoad) return;

    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: window.matchMedia('(max-width: 760px)').matches
          ? '80px 0px'
          : '350px 0px',
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={rootRef} className="lazy-journey-root">
      {shouldLoad ? (
        <VenueMap gigs={gigs} />
      ) : (
        <section className="venue-map-panel lazy-journey-placeholder" aria-label="Gig Journey loading area">
          <div className="venue-map-heading">
            <div>
              <span className="eyebrow">// your live-music trail</span>
              <h2>Gig Journey</h2>
              <p>The interactive trail loads as you scroll towards it.</p>
            </div>
          </div>
          <div className="profile-section-skeleton journey" />
        </section>
      )}
    </div>
  );
}
