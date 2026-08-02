import type { Gig } from '@/lib/types';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'hidden';

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  unlocked: boolean;
  progress: number;
  target: number;
  hidden?: boolean;
};

function countUnique(values: Array<string | null | undefined>) {
  return new Set(values.filter(Boolean).map((value) => String(value).trim().toLowerCase())).size;
}

function maxFrequency(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => {
    const key = String(value).trim().toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Math.max(0, ...counts.values());
}

function reviewCount(gigs: Gig[]) {
  return gigs.filter((gig) => Boolean(gig.notes?.trim())).length;
}

function photoCount(gigs: Gig[]) {
  return gigs.reduce((total, gig) => total + (gig.photo_urls?.length || 0), 0);
}

function festivalCount(gigs: Gig[]) {
  return gigs.filter((gig) => gig.event_type === 'festival' || Boolean(gig.festival_name)).length;
}

function hasSameDayDouble(gigs: Gig[]) {
  const counts = new Map<string, number>();
  gigs.forEach((gig) => counts.set(gig.event_date, (counts.get(gig.event_date) || 0) + 1));
  return [...counts.values()].some((count) => count >= 2);
}

function hasNewYearGig(gigs: Gig[]) {
  return gigs.some((gig) => gig.event_date.slice(5) === '01-01');
}

function hasChristmasGig(gigs: Gig[]) {
  return gigs.some((gig) => ['12-24', '12-25', '12-26'].includes(gig.event_date.slice(5)));
}

function achievement(
  id: string,
  name: string,
  description: string,
  icon: string,
  tier: AchievementTier,
  progress: number,
  target: number,
  hidden = false,
): Achievement {
  return {
    id,
    name,
    description,
    icon,
    tier,
    progress: Math.min(progress, target),
    target,
    unlocked: progress >= target,
    hidden,
  };
}

export function buildAchievements(gigs: Gig[]): Achievement[] {
  const gigTotal = gigs.length;
  const artists = countUnique(gigs.map((gig) => gig.artist_name));
  const venues = countUnique(gigs.map((gig) => gig.venue_name));
  const cities = countUnique(gigs.map((gig) => gig.city));
  const countries = countUnique(gigs.map((gig) => gig.country));
  const photos = photoCount(gigs);
  const reviews = reviewCount(gigs);
  const festivals = festivalCount(gigs);
  const superfanCount = maxFrequency(gigs.map((gig) => gig.artist_name));

  return [
    achievement('first-gig', 'First Gig', 'Log your first live-music memory.', '🎫', 'bronze', gigTotal, 1),
    achievement('roadie', 'Roadie', 'Log 10 gigs.', '🛠️', 'silver', gigTotal, 10),
    achievement('tour-manager', 'Tour Manager', 'Log 50 gigs.', '🚌', 'gold', gigTotal, 50),
    achievement('living-legend', 'Living Legend', 'Log 100 gigs.', '💎', 'diamond', gigTotal, 100),

    achievement('artist-explorer', 'Artist Explorer', 'See 10 different artists.', '🎸', 'bronze', artists, 10),
    achievement('scene-scholar', 'Scene Scholar', 'See 25 different artists.', '📚', 'silver', artists, 25),
    achievement('genre-globetrotter', 'Genre Globetrotter', 'See 50 different artists.', '🌈', 'gold', artists, 50),

    achievement('venue-hopper', 'Venue Hopper', 'Visit 5 different venues.', '🏟️', 'bronze', venues, 5),
    achievement('house-regular', 'House Regular', 'Visit 20 different venues.', '🎟️', 'silver', venues, 20),
    achievement('venue-veteran', 'Venue Veteran', 'Visit 50 different venues.', '🗝️', 'gold', venues, 50),

    achievement('city-lights', 'City Lights', 'Log gigs in 3 cities.', '🌆', 'bronze', cities, 3),
    achievement('road-trip', 'Road Trip', 'Log gigs in 10 cities.', '🚗', 'silver', cities, 10),
    achievement('international-act', 'International Act', 'Log gigs in 3 countries.', '🌍', 'gold', countries, 3),

    achievement('reviewer', 'Reviewer', 'Write 5 gig reviews.', '✍️', 'bronze', reviews, 5),
    achievement('critic', 'Critic', 'Write 25 gig reviews.', '⭐', 'silver', reviews, 25),
    achievement('columnist', 'Columnist', 'Write 100 gig reviews.', '📰', 'gold', reviews, 100),

    achievement('photo-pass', 'Photo Pass', 'Upload 10 gig photos.', '📸', 'bronze', photos, 10),
    achievement('pit-photographer', 'Pit Photographer', 'Upload 100 gig photos.', '🎞️', 'silver', photos, 100),
    achievement('archive-curator', 'Archive Curator', 'Upload 500 gig photos.', '🖼️', 'gold', photos, 500),

    achievement('festival-fan', 'Festival Fan', 'Attend 3 festivals.', '🎪', 'bronze', festivals, 3),
    achievement('festival-survivor', 'Festival Survivor', 'Attend 10 festivals.', '⛺', 'gold', festivals, 10),

    achievement('superfan', 'Superfan', 'See the same artist 5 times.', '🔥', 'silver', superfanCount, 5),
    achievement('diehard', 'Diehard', 'See the same artist 10 times.', '🤘', 'gold', superfanCount, 10),

    achievement('double-header', 'Double Header', 'Log two gigs on the same day.', '⚡', 'hidden', hasSameDayDouble(gigs) ? 1 : 0, 1, true),
    achievement('new-year-noise', 'New Year Noise', 'Attend a gig on New Year’s Day.', '🎆', 'hidden', hasNewYearGig(gigs) ? 1 : 0, 1, true),
    achievement('festive-encore', 'Festive Encore', 'Attend a gig over Christmas.', '🎄', 'hidden', hasChristmasGig(gigs) ? 1 : 0, 1, true),
  ];
}

export function nextLockedAchievement(achievements: Achievement[]) {
  return achievements
    .filter((item) => !item.unlocked && !item.hidden)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)[0] || null;
}
