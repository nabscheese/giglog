import { NextRequest, NextResponse } from 'next/server';

function toSetlistDate(date: string) {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}-${month}-${year}` : '';
}

function toIsoDate(date: string) {
  const [day, month, year] = date.split('-');
  return year && month && day ? `${year}-${month}-${day}` : '';
}

function songsFromSetlist(setlist: any) {
  const songs: string[] = [];

  for (const set of setlist?.sets?.set || []) {
    if (set.encore) songs.push('Encore');

    for (const song of set.song || []) {
      if (!song.name) continue;
      const note = song.info ? ` (${song.info})` : '';
      songs.push(`${song.name}${note}`);
    }
  }

  return songs;
}

async function requestSetlists(
  key: string,
  filters: { artist: string; venue?: string; city?: string; date?: string },
) {
  const url = new URL('https://api.setlist.fm/rest/1.0/search/setlists');
  url.searchParams.set('artistName', filters.artist);
  if (filters.date) url.searchParams.set('date', toSetlistDate(filters.date));
  if (filters.venue) url.searchParams.set('venueName', filters.venue);
  if (filters.city) url.searchParams.set('cityName', filters.city);

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'X-Api-Key': key,
    },
  });

  if (response.status === 404) return [];
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.message || 'Setlist.fm search failed.');
  }
  return Array.isArray(body?.setlist) ? body.setlist : [];
}

export async function GET(request: NextRequest) {
  const key = process.env.SETLISTFM_API_KEY;

  if (!key) {
    return NextResponse.json(
      { error: 'Setlist.fm API key is not configured.' },
      { status: 500 },
    );
  }

  const artist = request.nextUrl.searchParams.get('artist')?.trim() || '';
  const venue = request.nextUrl.searchParams.get('venue')?.trim() || '';
  const city = request.nextUrl.searchParams.get('city')?.trim() || '';
  const date = request.nextUrl.searchParams.get('date')?.trim() || '';
  const mode = request.nextUrl.searchParams.get('mode') || 'match';

  if (!artist) {
    return NextResponse.json({ error: 'Artist is required.' }, { status: 400 });
  }
  if (mode !== 'search' && !date) {
    return NextResponse.json(
      { error: 'Artist and date are required.' },
      { status: 400 },
    );
  }

  try {
    if (mode === 'search') {
      const matches = await requestSetlists(key, { artist, city });
      const events = matches.slice(0, 20).map((match: any) => {
        const songs = songsFromSetlist(match);
        const cityData = match?.venue?.city;
        return {
          id: `setlistfm-${match.id}`,
          source: 'setlistfm',
          sourceId: match.id,
          name: `${match?.artist?.name || artist} at ${match?.venue?.name || 'Unknown venue'}`,
          artist: match?.artist?.name || artist,
          venue: match?.venue?.name || '',
          city: cityData?.name || '',
          country: cityData?.country?.name || '',
          countryCode: cityData?.country?.code || '',
          date: toIsoDate(match?.eventDate || ''),
          time: null,
          ticketUrl: null,
          image: null,
          festival: match?.tour?.name || null,
          setlist: songs.join('\n'),
          songs,
          setlistUrl: match?.url || null,
        };
      });
      return NextResponse.json({ events, total: events.length });
    }

    // Concert Archives venue names often differ slightly from Setlist.fm.
    // Try progressively looser matching while keeping artist + exact date.
    const attempts = [
      { artist, date, venue, city },
      { artist, date, city },
      { artist, date },
    ];

    let matches: any[] = [];
    for (const filters of attempts) {
      matches = await requestSetlists(key, filters);
      if (matches.length) break;
    }

    const bestMatch = matches[0];
    if (!bestMatch) {
      return NextResponse.json({ found: false, songs: [] });
    }

    const songs = songsFromSetlist(bestMatch);
    return NextResponse.json({
      found: songs.length > 0,
      songs,
      setlist: songs.join('\n'),
      url: bestMatch.url || null,
      artist: bestMatch?.artist?.name || artist,
      venue: bestMatch?.venue?.name || venue,
      date: bestMatch?.eventDate || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not reach Setlist.fm.' },
      { status: 502 },
    );
  }
}
