'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { AuthGuard } from '@/components/AuthGuard';
import { Stars } from '@/components/Stars';
import { PhotoUploader } from '@/components/PhotoUploader';
import { supabase } from '@/lib/supabase';

type GigSearchEvent = {
  id: string;
  name: string;
  artist: string;
  venue: string;
  city: string;
  country: string;
  countryCode: string;
  date: string;
  time: string | null;
  ticketUrl: string | null;
  image: string | null;
  festival: string | null;
  lineup?: string[];
  source?: 'setlistfm' | 'ticketmaster' | 'giglog';
  sourceId?: string;
  setlist?: string;
  songs?: string[];
  setlistUrl?: string | null;
  tags?: string[];
  topTracks?: { name: string; url: string | null }[];
  lastfmUrl?: string | null;
};

type SearchMode = 'gig' | 'festival';

const popularFestivals: GigSearchEvent[] = [
  { id: 'catalogue-glastonbury', name: 'Glastonbury Festival', artist: 'Glastonbury Festival', venue: 'Worthy Farm', city: 'Pilton', country: 'United Kingdom', countryCode: 'GB', date: '', time: null, ticketUrl: null, image: null, festival: 'Glastonbury Festival', source: 'giglog' },
  { id: 'catalogue-download', name: 'Download Festival', artist: 'Download Festival', venue: 'Donington Park', city: 'Derby', country: 'United Kingdom', countryCode: 'GB', date: '', time: null, ticketUrl: null, image: null, festival: 'Download Festival', source: 'giglog' },
  { id: 'catalogue-slam-dunk', name: 'Slam Dunk Festival', artist: 'Slam Dunk Festival', venue: '', city: '', country: 'United Kingdom', countryCode: 'GB', date: '', time: null, ticketUrl: null, image: null, festival: 'Slam Dunk Festival', source: 'giglog' },
  { id: 'catalogue-reading', name: 'Reading Festival', artist: 'Reading Festival', venue: 'Richfield Avenue', city: 'Reading', country: 'United Kingdom', countryCode: 'GB', date: '', time: null, ticketUrl: null, image: null, festival: 'Reading Festival', source: 'giglog' },
  { id: 'catalogue-leeds', name: 'Leeds Festival', artist: 'Leeds Festival', venue: 'Bramham Park', city: 'Leeds', country: 'United Kingdom', countryCode: 'GB', date: '', time: null, ticketUrl: null, image: null, festival: 'Leeds Festival', source: 'giglog' },
  { id: 'catalogue-trnsmt', name: 'TRNSMT Festival', artist: 'TRNSMT Festival', venue: 'Glasgow Green', city: 'Glasgow', country: 'United Kingdom', countryCode: 'GB', date: '', time: null, ticketUrl: null, image: null, festival: 'TRNSMT Festival', source: 'giglog' },
  { id: 'catalogue-latitude', name: 'Latitude Festival', artist: 'Latitude Festival', venue: 'Henham Park', city: 'Southwold', country: 'United Kingdom', countryCode: 'GB', date: '', time: null, ticketUrl: null, image: null, festival: 'Latitude Festival', source: 'giglog' },
  { id: 'catalogue-creamfields', name: 'Creamfields', artist: 'Creamfields', venue: 'Daresbury Estate', city: 'Warrington', country: 'United Kingdom', countryCode: 'GB', date: '', time: null, ticketUrl: null, image: null, festival: 'Creamfields', source: 'giglog' },
];

type FestivalArtist = {
  name: string;
  seen: boolean;
  setlist: string;
  setlistUrl: string;
};

type Ratings = {
  overall: number;
  performance: number;
  crowd: number;
  venue: number;
};

const emptyRatings: Ratings = {
  overall: 0,
  performance: 0,
  crowd: 0,
  venue: 0,
};

function NewGigForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Ratings>(emptyRatings);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [searchMode, setSearchMode] = useState<SearchMode>('gig');
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get('artist') || '',
  );
  const [searchCity, setSearchCity] = useState(
    searchParams.get('city') || '',
  );
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [events, setEvents] = useState<GigSearchEvent[]>([]);
  const [selectedEvent, setSelectedEvent] =
    useState<GigSearchEvent | null>(null);

  const [artist, setArtist] = useState(
    searchParams.get('artist') || '',
  );
  const [venue, setVenue] = useState(
    searchParams.get('venue') || '',
  );
  const [date, setDate] = useState(
    searchParams.get('date') || new Date().toISOString().slice(0, 10),
  );
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [country, setCountry] = useState('United Kingdom');
  const [festival, setFestival] = useState('');
  const [festivalArtists, setFestivalArtists] = useState<FestivalArtist[]>([]);
  const [lineupInput, setLineupInput] = useState('');
  const [lineupLoading, setLineupLoading] = useState(false);
  const [lineupMessage, setLineupMessage] = useState('');
  const [lineupSearch, setLineupSearch] = useState('');
  const [ticketUrl, setTicketUrl] = useState(
    searchParams.get('ticketUrl') || '',
  );

  const [setlist, setSetlist] = useState('');
  const [setlistUrl, setSetlistUrl] = useState('');
  const [setlistState, setSetlistState] = useState<
    'idle' | 'loading' | 'found' | 'missing' | 'error'
  >('idle');
  const [setlistMessage, setSetlistMessage] = useState('');
  const [showSetlistEditor, setShowSetlistEditor] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || '');
    });
  }, []);

  const canSearch = useMemo(
    () => searchTerm.trim().length >= 2,
    [searchTerm],
  );

  async function searchGigs() {
    if (!canSearch) return;

    setSearching(true);
    setSearchError('');
    setEvents([]);

    try {
      if (searchMode === 'festival') {
        const query = searchTerm.trim();
        const ticketmasterParams = new URLSearchParams({
          keyword: query,
          mode: 'festival',
        });
        if (searchCity.trim()) ticketmasterParams.set('city', searchCity.trim());

        const [ticketmasterResponse, existingFestivals] = await Promise.all([
          fetch(`/api/ticketmaster?${ticketmasterParams.toString()}`, { cache: 'no-store' }),
          supabase
            .from('gigs')
            .select('festival_name,venue_name,city,country,event_date,ticket_url,photo_urls,festival_artists')
            .not('festival_name', 'is', null)
            .ilike('festival_name', `%${query}%`)
            .limit(15),
        ]);

        const ticketmasterBody = await ticketmasterResponse.json();
        const ticketmasterEvents = ticketmasterResponse.ok && Array.isArray(ticketmasterBody.events)
          ? ticketmasterBody.events.map((event: GigSearchEvent) => ({ ...event, source: 'ticketmaster' as const }))
          : [];

        const databaseEvents: GigSearchEvent[] = (existingFestivals.data || []).map((gig, index) => ({
          id: `giglog-${index}-${gig.festival_name}`,
          name: gig.festival_name || '',
          artist: gig.festival_name || '',
          venue: gig.venue_name || '',
          city: gig.city || '',
          country: gig.country || 'United Kingdom',
          countryCode: 'GB',
          date: gig.event_date || '',
          time: null,
          ticketUrl: gig.ticket_url || null,
          image: gig.photo_urls?.[0] || null,
          festival: gig.festival_name || null,
          lineup: Array.isArray(gig.festival_artists)
            ? gig.festival_artists
                .map((act: unknown) => typeof act === 'string' ? act : (act as { name?: string })?.name || '')
                .filter(Boolean)
            : [],
          source: 'giglog' as const,
        }));

        const catalogueMatches = popularFestivals.filter((event) =>
          event.name.toLowerCase().includes(query.toLowerCase()),
        );

        const combined = [...catalogueMatches, ...databaseEvents, ...ticketmasterEvents];
        const seen = new Set<string>();
        const results = combined.filter((event) => {
          const key = `${event.name.toLowerCase()}|${event.date}|${event.venue.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setEvents(results);
        if (!results.length) {
          setSearchError(ticketmasterBody.error || 'No matching festivals found. You can still add it manually.');
        } else {
          setSearchError(`${results.length} festival ${results.length === 1 ? 'match' : 'matches'} found.`);
        }
        return;
      }

      const setlistParams = new URLSearchParams({ mode: 'search', artist: searchTerm.trim() });
      if (searchCity.trim()) setlistParams.set('city', searchCity.trim());
      const ticketmasterParams = new URLSearchParams({ keyword: searchTerm.trim(), mode: 'gig' });
      if (searchCity.trim()) ticketmasterParams.set('city', searchCity.trim());

      const [setlistResponse, ticketmasterResponse] = await Promise.all([
        fetch(`/api/setlistfm?${setlistParams.toString()}`, { cache: 'no-store' }),
        fetch(`/api/ticketmaster?${ticketmasterParams.toString()}`, { cache: 'no-store' }),
      ]);
      const [setlistBody, ticketmasterBody] = await Promise.all([setlistResponse.json(), ticketmasterResponse.json()]);
      const setlistEvents = setlistResponse.ok && Array.isArray(setlistBody.events) ? setlistBody.events : [];
      const ticketmasterEvents = ticketmasterResponse.ok && Array.isArray(ticketmasterBody.events)
        ? ticketmasterBody.events.map((event: GigSearchEvent) => ({ ...event, source: 'ticketmaster' as const })) : [];
      const rawResults = [...setlistEvents, ...ticketmasterEvents];
      const artists = [...new Set(rawResults.map((event) => event.artist).filter(Boolean))].slice(0, 10);
      const artistDetails = await Promise.all(artists.map(async (artistName) => {
        try {
          const response = await fetch(`/api/lastfm?artist=${encodeURIComponent(artistName)}`, { cache: 'no-store' });
          if (!response.ok) return [artistName, null] as const;
          return [artistName, await response.json()] as const;
        } catch { return [artistName, null] as const; }
      }));
      const detailsByArtist = new Map(artistDetails);
      const results = rawResults.map((event) => {
        const details = detailsByArtist.get(event.artist);
        return { ...event, image: event.image || details?.image || null, tags: details?.tags || [], topTracks: details?.topTracks || [], lastfmUrl: details?.url || null };
      });
      setEvents(results);
      if (!results.length) {
        setSearchError((!setlistResponse.ok ? setlistBody.error : '') || (!ticketmasterResponse.ok ? ticketmasterBody.error : '') || 'No matching gigs found. Try removing the city or add the details manually.');
      } else {
        setSearchError(`${results.length} found — ${setlistEvents.length} past ${setlistEvents.length === 1 ? 'gig' : 'gigs'} and ${ticketmasterEvents.length} upcoming ${ticketmasterEvents.length === 1 ? 'listing' : 'listings'}.`);
      }
    } catch (searchFailure) {
      setSearchError(searchFailure instanceof Error ? searchFailure.message : 'Could not search.');
    } finally {
      setSearching(false);
    }
  }

  async function findSetlist(event: GigSearchEvent) {
    setSetlistState('loading');
    setSetlistMessage('Looking for the setlist…');
    setSetlist('');
    setSetlistUrl('');

    const params = new URLSearchParams({
      artist: event.artist,
      venue: event.venue,
      city: event.city,
      date: event.date,
    });

    try {
      const response = await fetch(`/api/setlistfm?${params}`);
      const body = await response.json();

      if (!response.ok) {
        setSetlistState('error');
        setSetlistMessage(
          body.error || 'The setlist could not be checked.',
        );
        setShowSetlistEditor(true);
        return;
      }

      if (!body.found) {
        setSetlistState('missing');
        setSetlistMessage(
          'No setlist has been posted yet. You can add it manually or try again later.',
        );
        setShowSetlistEditor(true);
        return;
      }

      setSetlist(body.setlist || '');
      setSetlistUrl(body.url || '');
      setSetlistState('found');
      setSetlistMessage(
        `${body.songs?.length || 0} songs found automatically.`,
      );
    } catch {
      setSetlistState('error');
      setSetlistMessage('The setlist could not be checked.');
      setShowSetlistEditor(true);
    }
  }

  async function chooseEvent(event: GigSearchEvent) {
    setSelectedEvent(event);
    setArtist(event.festival ? '' : event.artist);
    setVenue(event.venue);
    setDate(event.date);
    setCity(event.city);
    setCountry(event.country || 'United Kingdom');
    setFestival(event.festival || '');
    const initialFestivalArtists = (event.lineup || []).map((name) => ({
      name,
      seen: false,
      setlist: '',
      setlistUrl: '',
    }));
    setFestivalArtists(initialFestivalArtists);
    setLineupInput(initialFestivalArtists.map((act) => act.name).join(', '));
    setLineupSearch('');
    setLineupMessage(event.festival && initialFestivalArtists.length
      ? `${initialFestivalArtists.length} lineup artists found. Tick the artists you saw.`
      : '');
    setTicketUrl(event.ticketUrl || '');
    setEvents([]);
    setShowManual(false);

    if (event.festival) {
      await loadFestivalLineup(event);
      setSetlistState('idle');
      setSetlistMessage('Choose the artists you saw, then find their setlists.');
      return;
    }

    if (event.source === 'setlistfm') {
      const automaticSetlist = event.setlist || '';
      setSetlist(automaticSetlist);
      setSetlistUrl(event.setlistUrl || '');
      setSetlistState(automaticSetlist ? 'found' : 'missing');
      setSetlistMessage(
        automaticSetlist
          ? `${event.songs?.length || 0} songs found automatically.`
          : 'This gig was found, but no songs have been added to its setlist yet.',
      );
      setShowSetlistEditor(!automaticSetlist);
      return;
    }

    void findSetlist(event);
  }

  function normaliseArtistNames(values: unknown[]): string[] {
    const names = values
      .map((value) => typeof value === 'string' ? value : (value as { name?: string })?.name || '')
      .map((name) => name.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    return names.filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function loadFestivalLineup(event: GigSearchEvent) {
    if (!event.festival) return;
    setLineupLoading(true);
    setLineupMessage('Finding the festival lineup…');

    const eventArtists = normaliseArtistNames(event.lineup || []);
    let previousArtists: string[] = [];

    try {
      let query = supabase
        .from('gigs')
        .select('festival_artists,event_date')
        .ilike('festival_name', event.festival)
        .not('festival_artists', 'is', null)
        .limit(25);

      if (event.date) {
        const year = Number(event.date.slice(0, 4));
        if (Number.isFinite(year)) {
          query = query
            .gte('event_date', `${year}-01-01`)
            .lte('event_date', `${year}-12-31`);
        }
      }

      const { data } = await query;
      previousArtists = normaliseArtistNames(
        (data || []).flatMap((row) => Array.isArray(row.festival_artists) ? row.festival_artists : []),
      );
    } catch {
      previousArtists = [];
    }

    const names = normaliseArtistNames([...eventArtists, ...previousArtists]);
    const artists = names.map((name) => ({
      name,
      seen: false,
      setlist: '',
      setlistUrl: '',
    }));

    setFestivalArtists(artists);
    setLineupInput(names.join(', '));
    setLineupLoading(false);
    setLineupMessage(names.length
      ? `${names.length} lineup artists found. Tick the artists you actually saw.`
      : 'A full lineup was not available automatically. Add any missing artists below.');
  }

  function setAllFestivalArtists(seen: boolean) {
    setFestivalArtists((current) => current.map((act) => ({ ...act, seen })));
  }

  function addFestivalArtist() {
    const name = lineupSearch.trim();
    if (!name) return;
    setFestivalArtists((current) => {
      if (current.some((act) => act.name.toLowerCase() === name.toLowerCase())) return current;
      const next = [...current, { name, seen: true, setlist: '', setlistUrl: '' }];
      setLineupInput(next.map((act) => act.name).join(', '));
      return next;
    });
    setLineupSearch('');
  }

  function updateFestivalLineup(value: string) {
    setLineupInput(value);
    const names = value.split(',').map((name) => name.trim()).filter(Boolean);
    setFestivalArtists((current) => names.map((name) => {
      const existing = current.find((act) => act.name.toLowerCase() === name.toLowerCase());
      return existing || { name, seen: true, setlist: '', setlistUrl: '' };
    }));
  }

  async function findFestivalSetlists() {
    const seenActs = festivalArtists.filter((act) => act.seen);
    if (!seenActs.length) {
      setSetlistState('missing');
      setSetlistMessage('Choose at least one artist you saw.');
      return;
    }
    setSetlistState('loading');
    setSetlistMessage(`Looking for ${seenActs.length} festival setlists…`);
    const updated: FestivalArtist[] = [];
    const sections: string[] = [];
    for (const act of festivalArtists) {
      if (!act.seen) {
        updated.push(act);
        continue;
      }
      const params = new URLSearchParams({ artist: act.name, venue, city, date });
      try {
        const response = await fetch(`/api/setlistfm?${params.toString()}`, { cache: 'no-store' });
        const body = await response.json();
        const setlistValue = response.ok && body.found ? body.setlist || '' : '';
        const setlistUrlValue = response.ok && body.found ? body.url || '' : '';
        updated.push({ ...act, setlist: setlistValue, setlistUrl: setlistUrlValue });
        if (setlistValue) sections.push(`${act.name}
${setlistValue}`);
      } catch {
        updated.push(act);
      }
    }
    setFestivalArtists(updated);
    setSetlist(sections.join('\n\n'));
    setSetlistState(sections.length ? 'found' : 'missing');
    setSetlistMessage(sections.length
      ? `${sections.length} artist setlists found automatically.`
      : 'No setlists have been posted for the selected artists yet.');
    setShowSetlistEditor(!sections.length);
  }

  async function refreshSetlist() {
    if (festival.trim()) {
      await findFestivalSetlists();
      return;
    }

    const event: GigSearchEvent = selectedEvent || {
      id: 'manual',
      name: artist,
      artist,
      venue,
      city,
      country,
      countryCode: '',
      date,
      time: null,
      ticketUrl: ticketUrl || null,
      image: null,
      festival: festival || null,
    };

    if (!artist || !date) {
      setSetlistState('error');
      setSetlistMessage('Add an artist and date first.');
      return;
    }

    await findSetlist(event);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const formData = new FormData(event.currentTarget);

    if (!userId) {
      setError('Your session expired. Sign in again.');
      setSaving(false);
      return;
    }

    if ((!artist.trim() && !festival.trim()) || !venue.trim() || !date) {
      setError('Add the artist, venue and date.');
      setSaving(false);
      return;
    }

    if (!ratings.overall) {
      setError('Choose an overall rating.');
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('gigs')
      .insert({
        user_id: userId,
        artist_name: festival.trim() || artist.trim(),
        venue_name: venue.trim(),
        festival_name: festival.trim() || null,
        festival_artists: festival.trim() ? festivalArtists : [],
        event_date: date,
        event_type: festival.trim() ? 'festival' : 'gig',
        city: city.trim() || null,
        country: country.trim() || null,
        ticket_url: ticketUrl || null,
        photo_urls: photos,
        is_public: formData.get('is_public') === 'on',
        overall_rating: ratings.overall,
        performance_rating: ratings.performance || null,
        sound_rating: null,
        crowd_rating: ratings.crowd || null,
        venue_rating: ratings.venue || null,
        value_rating: null,
        notes: String(formData.get('notes') || '').trim() || null,
        setlist: setlist.trim() || null,
      })
      .select('id')
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/gigs/${data.id}`);
  }

  return (
    <AuthGuard>
      <Nav />

      <main className="shell narrow simple-log-shell">
        <section className="simple-log-hero">
          <div>
            <div className="eyebrow">// find it, rate it, remember it</div>
            <h1>
              LOG A <span className="accent">GIG</span>
            </h1>
            <p>
              Search past gigs from Setlist.fm and upcoming listings from Ticketmaster. Choose one and GigLog fills in the details and setlist.
            </p>
          </div>
        </section>

        {!selectedEvent ? (
          <section className="panel event-finder-panel">
            <div className="simple-step-label">1 · Find your gig</div>

            <div className="log-search-mode" role="tablist" aria-label="What are you logging?">
              <button type="button" className={searchMode === 'gig' ? 'active' : ''} onClick={() => { setSearchMode('gig'); setEvents([]); setSearchError(''); }}>Gig / artist</button>
              <button type="button" className={searchMode === 'festival' ? 'active' : ''} onClick={() => { setSearchMode('festival'); setEvents([]); setSearchError(''); }}>Festival</button>
            </div>

            <div className="event-search-form">
              <div className="field">
                <label htmlFor="event-search">{searchMode === 'festival' ? 'Festival name' : 'Artist or event'}</label>
                <input
                  id="event-search"
                  className="input"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchGigs(); } }}
                  placeholder={searchMode === 'festival' ? 'e.g. Glastonbury, Download or Slam Dunk' : 'e.g. Paramore'}
                  autoFocus
                />
              </div>

              <div className="field">
                <label htmlFor="event-city">City (optional)</label>
                <input
                  id="event-city"
                  className="input"
                  value={searchCity}
                  onChange={(event) => setSearchCity(event.target.value)}
                  placeholder="e.g. Manchester"
                />
              </div>

              <button
                className="btn"
                type="button"
                disabled={!canSearch || searching}
                onClick={() => void searchGigs()}
              >
                {searching ? 'Searching…' : searchMode === 'festival' ? 'Search festivals' : 'Search gigs'}
              </button>
            </div>

            {searchError ? (
              <p className={events.length ? 'success' : 'error'}>
                {searchError}
              </p>
            ) : null}

            {events.length ? (
              <div className="event-picker-list">
                {events.map((event) => (
                  <button
                    className="event-picker-result"
                    type="button"
                    key={event.id}
                    onClick={() => void chooseEvent(event)}
                  >
                    {event.image ? (
                      <img src={event.image} alt="" />
                    ) : (
                      <div className="event-picker-image-fallback">LIVE</div>
                    )}
                    <span>
                      <strong>{event.name}</strong>
                      <em className={`event-source ${event.source || 'ticketmaster'}`}>
                        {event.source === 'setlistfm' ? 'Past gig · Setlist.fm' : event.source === 'giglog' ? 'Festival · GigLog' : event.festival ? 'Festival · Ticketmaster' : 'Upcoming · Ticketmaster'}
                      </em>
                      <small>
                        {event.venue || 'Venue TBC'}
                        {event.city ? ` · ${event.city}` : ''}
                      </small>
                      <small>
                        {event.date
                          ? new Date(`${event.date}T00:00:00`).toLocaleDateString(
                              'en-GB',
                              { dateStyle: 'long' },
                            )
                          : 'Date TBC'}
                      </small>
                      {event.tags?.length ? (
                        <span className="event-genre-tags">
                          {event.tags.slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}
                        </span>
                      ) : null}
                    </span>
                    <b>Select</b>
                  </button>
                ))}
              </div>
            ) : null}

            <button
              className="manual-entry-toggle"
              type="button"
              onClick={() => setShowManual((current) => !current)}
            >
              {showManual
                ? 'Hide manual entry'
                : "Can't find it? Add the details manually"}
            </button>
          </section>
        ) : null}

        {(selectedEvent || showManual) ? (
          <form className="simple-log-form" onSubmit={submit}>
            <section className="panel selected-event-panel">
              <div className="simple-step-label">1 · Gig details</div>

              {selectedEvent ? (
                <div className="selected-event-summary">
                  {selectedEvent.image ? (
                    <img src={selectedEvent.image} alt="" />
                  ) : null}
                  <div>
                    <span>
                        Selected from {selectedEvent.source === 'setlistfm' ? 'Setlist.fm' : 'Ticketmaster'}
                      </span>
                    <h2>{selectedEvent.name}</h2>
                    <p>
                      {venue || 'Venue TBC'}{city ? ` · ${city}` : ''} ·{' '}
                      {date
                        ? new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { dateStyle: 'long' })
                        : 'Choose the festival date'}
                    </p>
                  </div>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => {
                      setSelectedEvent(null);
                      setSetlist('');
                      setSetlistState('idle');
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : null}

              {selectedEvent?.tags?.length || selectedEvent?.topTracks?.length ? (
                <div className="selected-artist-enrichment">
                  {selectedEvent.tags?.length ? (
                    <div className="event-genre-tags">
                      {selectedEvent.tags.slice(0, 5).map((tag) => <i key={tag}>{tag}</i>)}
                    </div>
                  ) : null}
                  {selectedEvent.topTracks?.length ? (
                    <div>
                      <span className="meta">Popular tracks on Last.fm</span>
                      <p>{selectedEvent.topTracks.map((track) => track.name).join(' · ')}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="simple-details-grid">
                <div className="field">
                  <label htmlFor="artist">Artist</label>
                  <input
                    id="artist"
                    className="input"
                    value={artist}
                    onChange={(event) => setArtist(event.target.value)}
                    required={!festival.trim()}
                    placeholder={festival ? 'Optional for festivals' : undefined}
                  />
                </div>
                <div className="field">
                  <label htmlFor="venue">Venue</label>
                  <input
                    id="venue"
                    className="input"
                    value={venue}
                    onChange={(event) => setVenue(event.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="date">Date</label>
                  <input
                    id="date"
                    className="input"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    className="input"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                  />
                </div>
              </div>

              <div className="festival-builder">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(festival)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setFestival(selectedEvent?.festival || `${artist} festival`);
                        if (!festivalArtists.length && artist) updateFestivalLineup(artist);
                      } else {
                        setFestival('');
                        setFestivalArtists([]);
                        setLineupInput('');
                      }
                    }}
                  />
                  This was a festival
                </label>

                {festival ? (
                  <>
                    <div className="field">
                      <label htmlFor="festival-name">Festival name</label>
                      <input id="festival-name" className="input" value={festival} onChange={(event) => setFestival(event.target.value)} />
                    </div>
                    <div className="festival-lineup-builder">
                      <div className="festival-lineup-heading">
                        <div>
                          <strong>Who did you see?</strong>
                          <small className="meta">The lineup is filled automatically when available. Untick anyone you missed.</small>
                        </div>
                        <span className="festival-seen-count">
                          {festivalArtists.filter((act) => act.seen).length}/{festivalArtists.length} selected
                        </span>
                      </div>

                      {lineupLoading ? (
                        <div className="festival-lineup-loading"><span className="spinner" /> Finding lineup…</div>
                      ) : null}
                      {lineupMessage ? <p className="meta festival-lineup-message">{lineupMessage}</p> : null}

                      <div className="festival-lineup-actions">
                        <button type="button" className="ghost small" onClick={() => setAllFestivalArtists(true)}>Select all</button>
                        <button type="button" className="ghost small" onClick={() => setAllFestivalArtists(false)}>Clear all</button>
                        <div className="festival-add-artist">
                          <input
                            className="input"
                            value={lineupSearch}
                            onChange={(event) => setLineupSearch(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                addFestivalArtist();
                              }
                            }}
                            placeholder="Add a missing artist"
                          />
                          <button type="button" className="ghost small" onClick={addFestivalArtist}>Add</button>
                        </div>
                      </div>

                      {festivalArtists.length ? (
                        <div className="festival-seen-picker">
                          {festivalArtists
                            .filter((act) => !lineupSearch.trim() || act.name.toLowerCase().includes(lineupSearch.trim().toLowerCase()))
                            .map((act) => (
                              <label key={act.name} className={act.seen ? 'selected' : ''}>
                                <input
                                  type="checkbox"
                                  checked={act.seen}
                                  onChange={(event) => setFestivalArtists((current) => current.map((item) => item.name === act.name ? { ...item, seen: event.target.checked } : item))}
                                />
                                <span>{act.name}</span>
                                {act.setlist ? <em>Setlist found</em> : null}
                              </label>
                            ))}
                        </div>
                      ) : (
                        <div className="empty festival-lineup-empty">No lineup found yet. Add artists above.</div>
                      )}

                      <details className="festival-manual-lineup">
                        <summary>Edit the full lineup as text</summary>
                        <div className="field">
                          <input
                            id="festival-lineup"
                            className="input"
                            value={lineupInput}
                            onChange={(event) => updateFestivalLineup(event.target.value)}
                            placeholder="Neck Deep, Hot Mulligan, The Wonder Years"
                          />
                        </div>
                      </details>
                    </div>
                  </>
                ) : null}
              </div>
            </section>

            <section className="panel simple-ratings-panel">
              <div className="simple-step-label">2 · How was it?</div>
              <div className="simple-rating-grid">
                {(
                  [
                    ['overall', 'Overall'],
                    ['performance', 'Performance'],
                    ['crowd', 'Crowd'],
                    ['venue', 'Venue'],
                  ] as const
                ).map(([key, label]) => (
                  <div className="simple-rating" key={key}>
                    <div>
                      <strong>{label}</strong>
                      <small>
                        {key === 'overall'
                          ? 'Your final score'
                          : `Rate the ${label.toLowerCase()}`}
                      </small>
                    </div>
                    <Stars
                      value={ratings[key]}
                      compact
                      showValue
                      label={`${label} rating`}
                      onChange={(value) =>
                        setRatings((current) => ({
                          ...current,
                          [key]: value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="panel automatic-setlist-panel">
              <div className="setlist-heading-row">
                <div>
                  <div className="simple-step-label">3 · Setlist</div>
                  <h2>{festival ? 'Automatic festival setlists' : 'Automatic setlist'}</h2>
                </div>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => void refreshSetlist()}
                  disabled={setlistState === 'loading'}
                >
                  {setlistState === 'loading' ? 'Checking…' : 'Check again'}
                </button>
              </div>

              <div className={`setlist-status ${setlistState}`}>
                {setlistState === 'loading' ? <span className="spinner" /> : null}
                <span>
                  {setlistMessage ||
                    'GigLog will check Setlist.fm when you choose an event.'}
                </span>
                {setlistUrl ? (
                  <a href={setlistUrl} target="_blank" rel="noreferrer">
                    View source
                  </a>
                ) : null}
              </div>

              {setlist && !showSetlistEditor ? (
                <div className="setlist-preview-box">
                  <ol>
                    {setlist
                      .split('\n')
                      .filter(Boolean)
                      .map((song, index) => (
                        <li key={`${song}-${index}`}>{song}</li>
                      ))}
                  </ol>
                  <button
                    type="button"
                    className="manual-entry-toggle"
                    onClick={() => setShowSetlistEditor(true)}
                  >
                    Edit setlist
                  </button>
                </div>
              ) : null}

              {showSetlistEditor ? (
                <textarea
                  className="textarea setlist-editor"
                  value={setlist}
                  onChange={(event) => setSetlist(event.target.value)}
                  placeholder="One song per line"
                />
              ) : null}
            </section>

            <section className="panel simple-memory-panel">
              <div className="simple-step-label">4 · Your memory</div>
              <PhotoUploader
                userId={userId}
                urls={photos}
                onChange={setPhotos}
              />

              <div className="field">
                <label htmlFor="notes">Review or favourite moment</label>
                <textarea
                  id="notes"
                  className="textarea"
                  name="notes"
                  placeholder="What made this gig memorable?"
                />
              </div>

              <label className="toggle">
                <input type="checkbox" name="is_public" defaultChecked />
                Show this memory publicly
              </label>

              {error ? <p className="error">{error}</p> : null}

              <button className="btn simple-save-button" disabled={saving}>
                {saving ? 'Saving memory…' : 'Save gig'}
              </button>
            </section>
          </form>
        ) : null}
      </main>
    </AuthGuard>
  );
}

export default function NewGigPage() {
  return (
    <Suspense
      fallback={
        <main className="shell narrow">
          <div className="panel">Loading gig form…</div>
        </main>
      }
    >
      <NewGigForm />
    </Suspense>
  );
}
