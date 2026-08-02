'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapIcon, MapPin, RefreshCw, Route, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Range = 'month' | 'year' | 'all';

type VenueGig = {
  id: string;
  artist_name: string;
  venue_name: string;
  city?: string | null;
  country?: string | null;
  event_date: string;
  overall_rating: number;
  latitude?: number | null;
  longitude?: number | null;
};

type LeafletMap = {
  remove: () => void;
  fitBounds: (bounds: unknown, options?: unknown) => void;
  setView: (coords: [number, number], zoom: number) => void;
};

type GraphicPoint = VenueGig & {
  x: number;
  y: number;
  index: number;
};

declare global {
  interface Window {
    L?: any;
  }
}

const LEAFLET_SCRIPT = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_STYLES = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const GRAPHIC_WIDTH = 1000;
const GRAPHIC_HEIGHT = 560;
const GRAPHIC_PADDING_X = 90;
const GRAPHIC_PADDING_Y = 70;

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);

  return new Promise<any>((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_STYLES}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_STYLES;
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = LEAFLET_SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function inRange(dateValue: string, range: Range) {
  if (range === 'all') return true;
  const now = new Date();
  const date = new Date(`${dateValue}T00:00:00`);
  if (range === 'year') return date.getFullYear() === now.getFullYear();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function venueKey(gig: VenueGig) {
  return [gig.venue_name, gig.city || '', gig.country || ''].join('|').toLowerCase();
}

function escapeHtml(value: string | null | undefined) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function distanceKm(a: [number, number], b: [number, number]) {
  const radius = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeChange = toRadians(b[0] - a[0]);
  const longitudeChange = toRadians(b[1] - a[1]);
  const latitudeA = toRadians(a[0]);
  const latitudeB = toRadians(b[0]);
  const haversine =
    Math.sin(latitudeChange / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeChange / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function makeGraphicPoints(gigs: VenueGig[]): GraphicPoint[] {
  if (!gigs.length) return [];

  const located = gigs.filter(
    (gig) => Number.isFinite(gig.latitude) && Number.isFinite(gig.longitude),
  );

  // Use true geography when at least two stops are located. Otherwise draw a
  // shareable chronological trail so the graphic never becomes an empty black box.
  if (located.length >= 2) {
    const latitudes = located.map((gig) => Number(gig.latitude));
    const longitudes = located.map((gig) => Number(gig.longitude));
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);
    const latitudeSpan = Math.max(maxLatitude - minLatitude, 0.25);
    const longitudeSpan = Math.max(maxLongitude - minLongitude, 0.25);

    return gigs.map((gig, index) => {
      const fallbackProgress = gigs.length === 1 ? 0.5 : index / (gigs.length - 1);
      const hasCoordinates = Number.isFinite(gig.latitude) && Number.isFinite(gig.longitude);
      const baseX = hasCoordinates
        ? GRAPHIC_PADDING_X +
          ((Number(gig.longitude) - minLongitude) / longitudeSpan) *
            (GRAPHIC_WIDTH - GRAPHIC_PADDING_X * 2)
        : GRAPHIC_PADDING_X + fallbackProgress * (GRAPHIC_WIDTH - GRAPHIC_PADDING_X * 2);
      const baseY = hasCoordinates
        ? GRAPHIC_PADDING_Y +
          (1 - (Number(gig.latitude) - minLatitude) / latitudeSpan) *
            (GRAPHIC_HEIGHT - GRAPHIC_PADDING_Y * 2)
        : GRAPHIC_HEIGHT / 2 + Math.sin(index * 1.45) * 135;
      const repeatOffset = index % 3 === 0 ? -6 : index % 3 === 1 ? 0 : 6;
      return { ...gig, index, x: baseX + repeatOffset, y: baseY + repeatOffset / 2 };
    });
  }

  return gigs.map((gig, index) => {
    const progress = gigs.length === 1 ? 0.5 : index / (gigs.length - 1);
    return {
      ...gig,
      index,
      x: GRAPHIC_PADDING_X + progress * (GRAPHIC_WIDTH - GRAPHIC_PADDING_X * 2),
      y: GRAPHIC_HEIGHT / 2 + Math.sin(index * 1.35) * 145 + Math.cos(index * 0.72) * 36,
    };
  });
}

function smoothPath(points: GraphicPoint[]) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midpointX = (current.x + next.x) / 2;
    const midpointY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y}, ${midpointX} ${midpointY}`;
  }
  const last = points[points.length - 1];
  path += ` T ${last.x} ${last.y}`;
  return path;
}

export function VenueMap({ gigs }: { gigs: VenueGig[] }) {
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const [range, setRange] = useState<Range>('all');
  const [resolvedGigs, setResolvedGigs] = useState(gigs);
  const [status, setStatus] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [activeStop, setActiveStop] = useState<number | null>(null);

  useEffect(() => setResolvedGigs(gigs), [gigs]);

  const filtered = useMemo(
    () => resolvedGigs.filter((gig) => inRange(gig.event_date, range)),
    [resolvedGigs, range],
  );

  const venues = useMemo(() => {
    const grouped = new Map<string, VenueGig[]>();
    filtered.forEach((gig) => {
      const key = venueKey(gig);
      grouped.set(key, [...(grouped.get(key) || []), gig]);
    });
    return [...grouped.values()].map((items) => ({
      key: venueKey(items[0]),
      venue: items[0].venue_name,
      city: items[0].city,
      country: items[0].country,
      latitude: items.find((item) => item.latitude != null)?.latitude ?? null,
      longitude: items.find((item) => item.longitude != null)?.longitude ?? null,
      gigs: items.sort((a, b) => b.event_date.localeCompare(a.event_date)),
    }));
  }, [filtered]);

  const journey = useMemo(
    () => [...filtered].sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [filtered],
  );

  const graphicPoints = useMemo(() => makeGraphicPoints(journey), [journey]);
  const graphicPath = useMemo(() => smoothPath(graphicPoints), [graphicPoints]);

  const routeDistance = useMemo(() => {
    let total = 0;
    for (let index = 1; index < journey.length; index += 1) {
      total += distanceKm(
        [journey[index - 1].latitude!, journey[index - 1].longitude!],
        [journey[index].latitude!, journey[index].longitude!],
      );
    }
    return Math.round(total);
  }, [journey]);

  async function locateMissingVenues() {
    const missing = venues.filter((venue) => venue.latitude == null || venue.longitude == null);
    if (!missing.length) return;

    setGeocoding(true);
    setStatus(`Locating ${missing.length} venue${missing.length === 1 ? '' : 's'}…`);

    const updates = new Map<string, { latitude: number; longitude: number }>();

    for (const venue of missing) {
      try {
        const params = new URLSearchParams({
          venue: venue.venue,
          city: venue.city || '',
          country: venue.country || '',
        });
        const response = await fetch(`/api/geocode?${params.toString()}`, { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok || !body.found) continue;

        updates.set(venue.key, { latitude: body.latitude, longitude: body.longitude });
        const ids = venue.gigs.map((gig) => gig.id);
        await supabase
          .from('gigs')
          .update({ latitude: body.latitude, longitude: body.longitude })
          .in('id', ids);
      } catch {
        // Skip failed venues so the rest of the graphic still renders.
      }
    }

    if (updates.size) {
      setResolvedGigs((current) =>
        current.map((gig) => {
          const coordinates = updates.get(venueKey(gig));
          return coordinates ? { ...gig, ...coordinates } : gig;
        }),
      );
    }

    setStatus(
      updates.size
        ? `${updates.size} venue${updates.size === 1 ? '' : 's'} added to your journey.`
        : 'No new venue locations could be found.',
    );
    setGeocoding(false);
  }

  useEffect(() => {
    void locateMissingVenues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, gigs.length]);

  useEffect(() => {
    if (!mapNode.current) return;

    let cancelled = false;
    void loadLeaflet()
      .then((L) => {
        if (cancelled || !mapNode.current) return;
        mapInstance.current?.remove();

        const map = L.map(mapNode.current, {
          scrollWheelZoom: true,
          touchZoom: true,
          dragging: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          zoomControl: true,
          preferCanvas: false,
        });
        mapInstance.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
          className: 'gig-journey-tiles',
        }).addTo(map);

        const bounds: [number, number][] = [];
        venues
          .filter((venue) => venue.latitude != null && venue.longitude != null)
          .forEach((venue) => {
            const coords: [number, number] = [venue.latitude!, venue.longitude!];
            bounds.push(coords);
            const artists = [...new Set(venue.gigs.map((gig) => gig.artist_name))];
            const latest = venue.gigs[0];
            const icon = L.divIcon({
              className: 'gig-venue-pin-shell',
              html: `<span class="gig-venue-pin"><i>${venue.gigs.length}</i></span>`,
              iconSize: [38, 46],
              iconAnchor: [19, 44],
              popupAnchor: [0, -40],
            });
            const popup = `
              <div class="venue-map-popup">
                <em>Venue collected</em>
                <strong>${escapeHtml(venue.venue)}</strong>
                <span>${escapeHtml([venue.city, venue.country].filter(Boolean).join(', '))}</span>
                <b>${venue.gigs.length} ${venue.gigs.length === 1 ? 'gig' : 'gigs'}</b>
                <small>${escapeHtml(artists.slice(0, 6).join(' · '))}</small>
                <a href="/gigs/${encodeURIComponent(latest.id)}">Open latest memory</a>
              </div>`;
            L.marker(coords, { icon }).addTo(map).bindPopup(popup);
          });

        if (bounds.length > 1) map.fitBounds(bounds, { padding: [38, 38], maxZoom: 12 });
        else if (bounds.length === 1) map.setView(bounds[0], 13);
        else map.setView([54.5, -3.2], 5);
      })
      .catch(() => setStatus('Your venue map could not be loaded.'));

    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [venues]);

  const locatedCount = venues.filter((venue) => venue.latitude != null).length;
  const cities = new Set(filtered.map((gig) => gig.city?.trim()).filter(Boolean)).size;
  const selectedStop = activeStop == null ? null : graphicPoints[activeStop] || null;

  return (
    <section className="panel venue-map-panel" aria-labelledby="venue-map-title">
      <div className="venue-map-heading">
        <div>
          <div className="eyebrow">// every venue, one live-music journey</div>
          <h2 id="venue-map-title"><Route size={25} /> Gig journey</h2>
          <p>A shareable route graphic of every venue you reached, in the order you visited.</p>
        </div>
        <div className="venue-map-filters" aria-label="Gig journey date range">
          {(['month', 'year', 'all'] as Range[]).map((value) => (
            <button
              key={value}
              type="button"
              className={range === value ? 'active' : ''}
              onClick={() => {
                setRange(value);
                setActiveStop(null);
              }}
            >
              {value === 'all' ? 'All time' : value === 'year' ? 'This year' : 'This month'}
            </button>
          ))}
        </div>
      </div>

      <div className="venue-map-stats">
        <div><strong>{filtered.length}</strong><span>Gigs shown</span></div>
        <div><strong>{venues.length}</strong><span>Venues visited</span></div>
        <div><strong>{cities}</strong><span>Cities reached</span></div>
        <div><strong>{routeDistance.toLocaleString()}</strong><span>Route km</span></div>
      </div>

      <div className="gig-journey-graphic-wrap">
        <div className="gig-journey-graphic-label"><Sparkles size={14} /> Your live-music trail</div>
        {graphicPoints.length ? (
          <svg
            className="gig-journey-graphic"
            viewBox={`0 0 ${GRAPHIC_WIDTH} ${GRAPHIC_HEIGHT}`}
            role="img"
            aria-label={`Graphic route connecting ${graphicPoints.length} gigs across ${venues.length} venues`}
          >
            <defs>
              <linearGradient id="journeyGlow" x1="0" x2="1">
                <stop offset="0%" stopColor="#ff7ac8" />
                <stop offset="45%" stopColor="#ff2f92" />
                <stop offset="100%" stopColor="#ff5a72" />
              </linearGradient>
              <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <rect className="journey-graphic-bg" width={GRAPHIC_WIDTH} height={GRAPHIC_HEIGHT} rx="18" />
            <path className="journey-contour journey-contour-one" d="M -20 130 C 190 20, 360 240, 560 110 S 870 110, 1040 30" />
            <path className="journey-contour journey-contour-two" d="M -40 400 C 170 250, 340 520, 570 350 S 830 450, 1060 260" />
            <path className="journey-contour journey-contour-three" d="M 100 -20 C 250 160, 260 330, 80 590" />
            <path className="journey-route-shadow" d={graphicPath} />
            <path className="journey-route-line" d={graphicPath} />

            {graphicPoints.map((point, index) => {
              const isFirst = index === 0;
              const isLast = index === graphicPoints.length - 1;
              const isActive = activeStop === index;
              const showLabel = graphicPoints.length <= 14 || isFirst || isLast || index % Math.ceil(graphicPoints.length / 10) === 0;
              const labelAbove = index % 2 === 0;
              return (
                <g
                  key={`${point.id}-${index}`}
                  className={`journey-stop ${isActive ? 'active' : ''}`}
                  transform={`translate(${point.x} ${point.y})`}
                  onClick={() => setActiveStop(isActive ? null : index)}
                  role="button"
                  aria-label={`${point.artist_name} at ${point.venue_name}`}
                >
                  <circle className="journey-stop-ring" r={isFirst || isLast ? 16 : 12} />
                  <circle className="journey-stop-dot" r={isFirst || isLast ? 8 : 6} />
                  <text className="journey-stop-number" y="3">{isFirst ? 'S' : isLast ? '★' : index + 1}</text>
                  {showLabel ? (
                    <g className="journey-stop-label" transform={`translate(0 ${labelAbove ? -31 : 38})`}>
                      <rect x="-78" y="-17" width="156" height="34" rx="5" />
                      <text y="-2">{point.venue_name.slice(0, 24)}</text>
                      <text className="journey-stop-city" y="11">{(point.city || point.country || '').slice(0, 28)}</text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="journey-graphic-empty">
            <Route size={34} />
            <strong>No mapped venues in this period yet</strong>
            <span>Retry missing venues below or switch to All time.</span>
          </div>
        )}

        {selectedStop ? (
          <div className="journey-stop-card">
            <span>Stop {selectedStop.index + 1}</span>
            <strong>{selectedStop.artist_name}</strong>
            <p>{selectedStop.venue_name} · {[selectedStop.city, selectedStop.country].filter(Boolean).join(', ')}</p>
            <small>{new Date(`${selectedStop.event_date}T00:00:00`).toLocaleDateString('en-GB', { dateStyle: 'long' })}</small>
            <a href={`/gigs/${selectedStop.id}`}>Open memory</a>
          </div>
        ) : null}
      </div>

      <div className="venue-map-section-heading">
        <div>
          <span className="eyebrow">// explore the real places</span>
          <h3><MapPin size={20} /> Venue map</h3>
        </div>
        <p>Drag to move, pinch or scroll to zoom, then tap a venue pin.</p>
      </div>

      <div className="journey-map-frame">
        <div className="journey-map-label"><MapIcon size={14} /> Venue collection</div>
        <div ref={mapNode} className="venue-map-canvas" aria-label="Map of your visited gig venues" />
      </div>

      <div className="venue-map-footer">
        <span>{status || (locatedCount ? `${locatedCount} venues mapped.` : 'Venue locations will be added automatically.')}</span>
        {venues.some((venue) => venue.latitude == null) ? (
          <button className="ghost" type="button" disabled={geocoding} onClick={() => void locateMissingVenues()}>
            <RefreshCw size={14} /> {geocoding ? 'Locating…' : 'Retry missing venues'}
          </button>
        ) : null}
      </div>
    </section>
  );
}
