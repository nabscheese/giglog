import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const key = process.env.TICKETMASTER_API_KEY;

  if (!key) {
    return NextResponse.json(
      { error: 'Ticketmaster API key is not configured.' },
      { status: 500 },
    );
  }

  const keyword = request.nextUrl.searchParams.get('keyword')?.trim() || '';
  const city = request.nextUrl.searchParams.get('city')?.trim() || '';
  const mode = request.nextUrl.searchParams.get('mode') === 'festival' ? 'festival' : 'gig';

  if (!keyword && !city) {
    return NextResponse.json({ events: [] });
  }

  const url = new URL(
    'https://app.ticketmaster.com/discovery/v2/events.json',
  );
  url.searchParams.set('apikey', key);
  url.searchParams.set('classificationName', 'music');
  url.searchParams.set('countryCode', 'GB');
  url.searchParams.set('sort', mode === 'festival' ? 'relevance,desc' : 'date,desc');
  url.searchParams.set('size', '20');

  if (keyword) url.searchParams.set('keyword', keyword);
  if (city) url.searchParams.set('city', city);

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const body = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            body?.fault?.faultstring ||
            body?.errors?.[0]?.detail ||
            'Ticketmaster search failed.',
        },
        { status: response.status },
      );
    }

    const events = (body?._embedded?.events || []).map(
      (event: Record<string, any>) => {
        const venue = event?._embedded?.venues?.[0];
        const attractions = event?._embedded?.attractions || [];
        const attraction = attractions[0];

        const classificationValues = (event?.classifications || []).flatMap((classification: Record<string, any>) => [
          classification?.segment?.name,
          classification?.genre?.name,
          classification?.subGenre?.name,
          classification?.type?.name,
          classification?.subType?.name,
        ]).filter(Boolean).map((value: string) => value.toLowerCase());
        const eventName = String(event.name || '');
        const isFestival = eventName.toLowerCase().includes('festival') || classificationValues.some((value: string) => value.includes('festival'));

        return {
          id: event.id,
          name: event.name,
          artist: attraction?.name || event.name,
          venue: venue?.name || '',
          city: venue?.city?.name || '',
          country: venue?.country?.name || 'United Kingdom',
          countryCode: venue?.country?.countryCode || 'GB',
          date: event?.dates?.start?.localDate || '',
          time: event?.dates?.start?.localTime || null,
          ticketUrl: event.url || null,
          image:
            event?.images?.find(
              (image: Record<string, any>) =>
                image.ratio === '16_9' && Number(image.width) >= 640,
            )?.url || event?.images?.[0]?.url || null,
          festival: isFestival || mode === 'festival' ? eventName : null,
          lineup: attractions
            .map((item: Record<string, any>) => String(item?.name || '').trim())
            .filter(Boolean),
        };
      },
    );

    const filteredEvents = mode === 'festival'
      ? events.filter((event: Record<string, any>) => event.festival)
      : events;

    return NextResponse.json({ events: filteredEvents });
  } catch {
    return NextResponse.json(
      { error: 'Could not reach Ticketmaster.' },
      { status: 502 },
    );
  }
}
