'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapIcon, MapPin, RefreshCw, Route } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Range = 'month' | 'year' | 'all';
type ViewMode = 'journey' | 'venues';

type VenueGig = {
  id: string;
  artist_name: string;
  venue_name: string;
  city: string | null;
  country: string | null;
  event_date: string;
  overall_rating: number;
  latitude: number | null;
  longitude: number | null;
};

type LeafletMap = {
  remove: () => void;
  fitBounds: (bounds: unknown, options?: unknown) => void;
  setView: (coords: [number, number], zoom: number) => void;
};

declare global {
  interface Window {
    L?: any;
  }
}

const LEAFLET_SCRIPT = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_STYLES = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

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

export function VenueMap({ gigs }: { gigs: VenueGig[] }) {
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const [range, setRange] = useState<Range>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('journey');
  const [resolvedGigs, setResolvedGigs] = useState(gigs);
  const [status, setStatus] = useState('');
  const [geocoding, setGeocoding] = useState(false);

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
    () =>
      [...filtered]
        .filter((gig) => gig.latitude != null && gig.longitude != null)
        .sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [filtered],
  );

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
        // A failed venue is skipped so the rest of the journey can still render.
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
          scrollWheelZoom: false,
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

        if (viewMode === 'journey') {
          const routePoints: [number, number][] = journey.map((gig) => [
            gig.latitude!,
            gig.longitude!,
          ]);

          if (routePoints.length > 1) {
            L.polyline(routePoints, {
              color: '#ff2f45',
              weight: 4,
              opacity: 0.95,
              lineJoin: 'round',
              className: 'gig-journey-route',
            }).addTo(map);
          }

          journey.forEach((gig, index) => {
            const coords: [number, number] = [gig.latitude!, gig.longitude!];
            bounds.push(coords);
            const first = index === 0;
            const last = index === journey.length - 1;
            const markerClass = first ? 'start' : last ? 'finish' : '';
            const icon = L.divIcon({
              className: 'gig-route-marker-shell',
              html: `<span class="gig-route-marker ${markerClass}">${first ? '▶' : last ? '★' : index + 1}</span>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
              popupAnchor: [0, -16],
            });
            const popup = `
              <div class="venue-map-popup">
                <em>${first ? 'Journey starts here' : last ? 'Latest stop' : `Stop ${index + 1}`}</em>
                <strong>${escapeHtml(gig.artist_name)}</strong>
                <span>${escapeHtml(gig.venue_name)}</span>
                <small>${escapeHtml([gig.city, gig.country].filter(Boolean).join(', '))}</small>
                <b>${new Date(`${gig.event_date}T00:00:00`).toLocaleDateString('en-GB', { dateStyle: 'long' })}</b>
                <a href="/gigs/${encodeURIComponent(gig.id)}">Open memory</a>
              </div>`;
            L.marker(coords, { icon }).addTo(map).bindPopup(popup);
          });
        } else {
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
        }

        if (bounds.length > 1) map.fitBounds(bounds, { padding: [38, 38], maxZoom: 12 });
        else if (bounds.length === 1) map.setView(bounds[0], 13);
        else map.setView([54.5, -3.2], 5);
      })
      .catch(() => setStatus('Your gig journey could not be loaded.'));

    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [journey, venues, viewMode]);

  const locatedCount = venues.filter((venue) => venue.latitude != null).length;
  const cities = new Set(filtered.map((gig) => gig.city?.trim()).filter(Boolean)).size;

  return (
    <section className="panel venue-map-panel" aria-labelledby="venue-map-title">
      <div className="venue-map-heading">
        <div>
          <div className="eyebrow">// every venue, one live-music journey</div>
          <h2 id="venue-map-title"><Route size={25} /> Gig journey</h2>
          <p>Follow your gigs in date order or switch to your collection of visited venues.</p>
        </div>
        <div className="venue-map-filters" aria-label="Gig journey date range">
          {(['month', 'year', 'all'] as Range[]).map((value) => (
            <button
              key={value}
              type="button"
              className={range === value ? 'active' : ''}
              onClick={() => setRange(value)}
            >
              {value === 'all' ? 'All time' : value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="journey-view-switch" aria-label="Map style">
        <button type="button" className={viewMode === 'journey' ? 'active' : ''} onClick={() => setViewMode('journey')}>
          <Route size={15} /> Journey route
        </button>
        <button type="button" className={viewMode === 'venues' ? 'active' : ''} onClick={() => setViewMode('venues')}>
          <MapPin size={15} /> Venue pins
        </button>
      </div>

      <div className="venue-map-stats">
        <div><strong>{filtered.length}</strong><span>Gigs shown</span></div>
        <div><strong>{venues.length}</strong><span>Venues visited</span></div>
        <div><strong>{cities}</strong><span>Cities reached</span></div>
        <div><strong>{routeDistance.toLocaleString()}</strong><span>Route km</span></div>
      </div>

      <div className="journey-map-frame">
        <div className="journey-map-label"><MapIcon size={14} /> {viewMode === 'journey' ? 'Chronological route' : 'Venue collection'}</div>
        <div ref={mapNode} className="venue-map-canvas" aria-label="Map of your gig venues and journey" />
      </div>

      <div className="venue-map-footer">
        <span>{status || (locatedCount ? `${locatedCount} venue pins mapped.` : 'Venue locations will be added automatically.')}</span>
        {venues.some((venue) => venue.latitude == null) ? (
          <button className="ghost" type="button" disabled={geocoding} onClick={() => void locateMissingVenues()}>
            <RefreshCw size={14} /> {geocoding ? 'Locating…' : 'Retry missing venues'}
          </button>
        ) : null}
      </div>
    </section>
  );
}
