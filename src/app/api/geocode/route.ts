import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const venue = request.nextUrl.searchParams.get('venue')?.trim() || '';
  const city = request.nextUrl.searchParams.get('city')?.trim() || '';
  const country = request.nextUrl.searchParams.get('country')?.trim() || '';

  if (!venue) {
    return NextResponse.json({ error: 'Venue is required.' }, { status: 400 });
  }

  const queries = [
    [venue, city, country].filter(Boolean).join(', '),
    [venue, city].filter(Boolean).join(', '),
    [city, country].filter(Boolean).join(', '),
  ].filter(Boolean);

  for (const query of queries) {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GigLog/1.0 (venue-map)',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });

    if (!response.ok) continue;
    const results = await response.json();
    const result = Array.isArray(results) ? results[0] : null;
    if (!result) continue;

    return NextResponse.json({
      found: true,
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      displayName: result.display_name,
    });
  }

  return NextResponse.json({ found: false });
}
