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
  source?: 'setlistfm' | 'ticketmaster';
  sourceId?: string;
  setlist?: string;
  songs?: string[];
  setlistUrl?: string | null;
  tags?: string[];
  topTracks?: { name: string; url: string | null }[];
  lastfmUrl?: string | null;
};

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

    const setlistParams = new URLSearchParams({
      mode: 'search',
      artist: searchTerm.trim(),
    });
    if (searchCity.trim()) setlistParams.set('city', searchCity.trim());

    const ticketmasterParams = new URLSearchParams({
      keyword: searchTerm.trim(),
    });
    if (searchCity.trim()) {
      ticketmasterParams.set('city', searchCity.trim());
    }

    try {
      const [setlistResponse, ticketmasterResponse] = await Promise.all([
        fetch(`/api/setlistfm?${setlistParams.toString()}`, {
          cache: 'no-store',
        }),
        fetch(`/api/ticketmaster?${ticketmasterParams.toString()}`, {
          cache: 'no-store',
        }),
      ]);

      const [setlistBody, ticketmasterBody] = await Promise.all([
        setlistResponse.json(),
        ticketmasterResponse.json(),
      ]);

      const setlistEvents = setlistResponse.ok && Array.isArray(setlistBody.events)
        ? setlistBody.events
        : [];

      const ticketmasterEvents =
        ticketmasterResponse.ok && Array.isArray(ticketmasterBody.events)
          ? ticketmasterBody.events.map((event: GigSearchEvent) => ({
              ...event,
              source: 'ticketmaster' as const,
            }))
          : [];

      const rawResults = [...setlistEvents, ...ticketmasterEvents];
      const artists = [...new Set(rawResults.map((event) => event.artist).filter(Boolean))].slice(0, 10);
      const artistDetails = await Promise.all(
        artists.map(async (artistName) => {
          try {
            const response = await fetch(`/api/lastfm?artist=${encodeURIComponent(artistName)}`, {
              cache: 'no-store',
            });
            if (!response.ok) return [artistName, null] as const;
            return [artistName, await response.json()] as const;
          } catch {
            return [artistName, null] as const;
          }
        }),
      );
      const detailsByArtist = new Map(artistDetails);
      const results = rawResults.map((event) => {
        const details = detailsByArtist.get(event.artist);
        return {
          ...event,
          image: event.image || details?.image || null,
          tags: details?.tags || [],
          topTracks: details?.topTracks || [],
          lastfmUrl: details?.url || null,
        };
      });
      setEvents(results);

      if (!results.length) {
        const setlistError = !setlistResponse.ok ? setlistBody.error : '';
        const ticketmasterError = !ticketmasterResponse.ok
          ? ticketmasterBody.error
          : '';

        setSearchError(
          setlistError ||
            ticketmasterError ||
            'No matching gigs found. Try removing the city or add the details manually.',
        );
      } else {
        const pastCount = setlistEvents.length;
        const upcomingCount = ticketmasterEvents.length;
        setSearchError(
          `${results.length} found — ${pastCount} past ${
            pastCount === 1 ? 'gig' : 'gigs'
          } and ${upcomingCount} upcoming ${
            upcomingCount === 1 ? 'listing' : 'listings'
          }.`,
        );
      }
    } catch (searchFailure) {
      setSearchError(
        searchFailure instanceof Error
          ? searchFailure.message
          : 'Could not search for gigs.',
      );
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

  function chooseEvent(event: GigSearchEvent) {
    setSelectedEvent(event);
    setArtist(event.artist);
    setVenue(event.venue);
    setDate(event.date);
    setCity(event.city);
    setCountry(event.country || 'United Kingdom');
    setFestival(event.festival || '');
    const initialFestivalArtists = event.festival
      ? [{ name: event.artist, seen: true, setlist: event.setlist || '', setlistUrl: event.setlistUrl || '' }]
      : [];
    setFestivalArtists(initialFestivalArtists);
    setLineupInput(initialFestivalArtists.map((act) => act.name).join(', '));
    setTicketUrl(event.ticketUrl || '');
    setEvents([]);
    setShowManual(false);

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

            <div className="event-search-form">
              <div className="field">
                <label htmlFor="event-search">Artist or event</label>
                <input
                  id="event-search"
                  className="input"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="e.g. Paramore"
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
                {searching ? 'Searching…' : 'Search gigs'}
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
                    onClick={() => chooseEvent(event)}
                  >
                    {event.image ? (
                      <img src={event.image} alt="" />
                    ) : (
                      <div className="event-picker-image-fallback">LIVE</div>
                    )}
                    <span>
                      <strong>{event.name}</strong>
                      <em className={`event-source ${event.source || 'ticketmaster'}`}>
                        {event.source === 'setlistfm' ? 'Past gig · Setlist.fm' : 'Upcoming · Ticketmaster'}
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
                      {venue} · {city} ·{' '}
                      {new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
                        dateStyle: 'long',
                      })}
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
                    required
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
                    <div className="field">
                      <label htmlFor="festival-lineup">Festival lineup</label>
                      <input
                        id="festival-lineup"
                        className="input"
                        value={lineupInput}
                        onChange={(event) => updateFestivalLineup(event.target.value)}
                        placeholder="Neck Deep, Hot Mulligan, The Wonder Years"
                      />
                      <small className="meta">Add the lineup separated by commas, then tick only the artists you actually saw.</small>
                    </div>
                    {festivalArtists.length ? (
                      <div className="festival-seen-picker">
                        <strong>Who did you see?</strong>
                        <div>
                          {festivalArtists.map((act) => (
                            <label key={act.name}>
                              <input
                                type="checkbox"
                                checked={act.seen}
                                onChange={(event) => setFestivalArtists((current) => current.map((item) => item.name === act.name ? { ...item, seen: event.target.checked } : item))}
                              />
                              {act.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
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
