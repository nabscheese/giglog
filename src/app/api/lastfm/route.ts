import { NextRequest, NextResponse } from 'next/server';

type LastFmImage = { '#text'?: string; size?: string };

const PLACEHOLDER_FRAGMENTS = [
  '2a96cbd8b46e442fc41c2b86b821562f',
  'c6f59c1e5e7240a4c0d427abd71f3dbb',
];

function bestImage(images: LastFmImage[] | undefined) {
  if (!Array.isArray(images)) return null;
  const order = ['mega', 'extralarge', 'large', 'medium', 'small'];
  for (const size of order) {
    const value = images.find((image) => image.size === size)?.['#text']?.trim();
    if (value && !PLACEHOLDER_FRAGMENTS.some((part) => value.includes(part))) {
      return value.replace(/^http:/, 'https:');
    }
  }
  return null;
}

function plainText(value: string | undefined) {
  return (value || '')
    .replace(/<a[^>]*>.*?<\/a>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function callLastFm(
  method: string,
  artist: string,
  key: string,
  extra: Record<string, string> = {},
) {
  const url = new URL('https://ws.audioscrobbler.com/2.0/');
  url.searchParams.set('method', method);
  url.searchParams.set('artist', artist);
  url.searchParams.set('api_key', key);
  url.searchParams.set('format', 'json');
  url.searchParams.set('autocorrect', '1');
  Object.entries(extra).forEach(([name, value]) => url.searchParams.set(name, value));

  const response = await fetch(url, {
    next: { revalidate: 86400 },
    headers: { 'User-Agent': 'GigLog/1.0 (artist enrichment)' },
  });
  const body = await response.json();
  if (!response.ok || body?.error) {
    throw new Error(body?.message || 'Last.fm request failed.');
  }
  return body;
}

export async function GET(request: NextRequest) {
  const key = process.env.LASTFM_API_KEY;
  const artist = request.nextUrl.searchParams.get('artist')?.trim() || '';

  if (!key) {
    return NextResponse.json(
      { error: 'Last.fm API key is not configured.' },
      { status: 500 },
    );
  }
  if (!artist) {
    return NextResponse.json({ error: 'Artist is required.' }, { status: 400 });
  }

  try {
    const [infoBody, albumsBody, tracksBody] = await Promise.all([
      callLastFm('artist.getInfo', artist, key, { lang: 'en' }),
      callLastFm('artist.getTopAlbums', artist, key, { limit: '5' }),
      callLastFm('artist.getTopTracks', artist, key, { limit: '5' }),
    ]);

    const info = infoBody?.artist || {};
    const albums = Array.isArray(albumsBody?.topalbums?.album)
      ? albumsBody.topalbums.album
      : [];
    const tracks = Array.isArray(tracksBody?.toptracks?.track)
      ? tracksBody.toptracks.track
      : [];

    const albumWithImage = albums.find((album: any) => bestImage(album?.image));
    const image = bestImage(info?.image) || bestImage(albumWithImage?.image) || null;
    const tags = Array.isArray(info?.tags?.tag)
      ? info.tags.tag.slice(0, 5).map((tag: any) => tag?.name).filter(Boolean)
      : [];

    return NextResponse.json({
      artist: info?.name || artist,
      image,
      tags,
      summary: plainText(info?.bio?.summary),
      url: info?.url || null,
      topTracks: tracks
        .slice(0, 5)
        .map((track: any) => ({ name: track?.name || '', url: track?.url || null }))
        .filter((track: any) => track.name),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not reach Last.fm.' },
      { status: 502 },
    );
  }
}
