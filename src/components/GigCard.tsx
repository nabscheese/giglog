import Link from 'next/link';
import { CalendarDays, Heart, MapPin, MessageCircle } from 'lucide-react';
import { Stars } from './Stars';
import type { Gig } from '@/lib/types';

function ticketTone(gig: Gig) {
  if (gig.event_type === 'festival' || gig.festival_name) return 'festival';
  if (gig.overall_rating === 5) return 'five-star';
  if ((gig.photo_urls?.length || 0) > 0) return 'photo';
  return 'classic';
}

export function GigCard({ gig }: { gig: Gig }) {
  const date = new Date(`${gig.event_date}T00:00:00`);
  const tone = ticketTone(gig);
  const location = [gig.venue_name, gig.city].filter(Boolean).join(', ');
  const photo = gig.photo_urls?.[0];

  return (
    <Link href={`/gigs/${gig.id}`} className={`memory-ticket ${tone}`}>
      <div className="ticket-rail" aria-hidden="true">
        <span className="ticket-month">
          {date.toLocaleString('en-GB', { month: 'short' }).toUpperCase()}
        </span>
        <strong>{date.getDate()}</strong>
        <span>{date.getFullYear()}</span>
        <div className="ticket-score">{gig.overall_rating}<small>/5</small></div>
      </div>

      <article className="ticket-main">
        <div className="ticket-topline">
          <span className="ticket-type">{gig.event_type || 'gig'}</span>
          <span className="ticket-number">GL-{gig.id.slice(0, 6).toUpperCase()}</span>
        </div>

        {photo ? (
          <div className="ticket-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" loading="lazy" decoding="async" />
            <span>MEMORY CAPTURED</span>
          </div>
        ) : null}

        <div className="ticket-copy">
          <h3>{gig.artist_name}</h3>
          {gig.festival_name ? <p className="festival-name">{gig.festival_name}</p> : null}

          <div className="ticket-location">
            <MapPin size={14} />
            <span>{location || 'Venue not added'}</span>
          </div>

          <div className="ticket-date-mobile">
            <CalendarDays size={14} />
            {date.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>

          <div className="ticket-ratings">
            <span>PERF <b>{gig.performance_rating || gig.overall_rating}/5</b></span>
            <span>SOUND <b>{gig.sound_rating || gig.overall_rating}/5</b></span>
            <span>CROWD <b>{gig.crowd_rating || gig.overall_rating}/5</b></span>
          </div>

          {gig.notes ? <p className="ticket-review clamp">“{gig.notes}”</p> : null}
        </div>

        <footer className="ticket-footer">
          <Stars value={gig.overall_rating} />
          <span className="ticket-social">
            <Heart size={14} /> {gig.review_likes?.length || 0}
            <MessageCircle size={14} /> {gig.comments?.length || 0}
          </span>
          <span className="ticket-owner">
            by {gig.profiles?.display_name || gig.profiles?.username || 'fan'}
          </span>
        </footer>
      </article>
    </Link>
  );
}
