'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { AuthGuard } from '@/components/AuthGuard';
import { Stars } from '@/components/Stars';
import { PhotoUploader } from '@/components/PhotoUploader';
import { supabase } from '@/lib/supabase';

const fields = [
  'overall',
  'performance',
  'sound',
  'crowd',
  'venue',
  'value',
] as const;

type RatingField = (typeof fields)[number];

function NewGigForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Record<RatingField, number>>({
    overall: 0,
    performance: 0,
    sound: 0,
    crowd: 0,
    venue: 0,
    value: 0,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data, error: userError } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        return;
      }

      setUserId(data.user?.id ?? '');
    }

    void loadUser();
  }, []);

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

    if (!ratings.overall) {
      setError('Choose an overall rating.');
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('gigs')
      .insert({
        user_id: userId,
        artist_name: String(formData.get('artist') ?? '').trim(),
        venue_name: String(formData.get('venue') ?? '').trim(),
        festival_name:
          String(formData.get('festival') ?? '').trim() || null,
        event_date: String(formData.get('date') ?? ''),
        event_type: String(formData.get('event_type') ?? 'gig'),
        city: String(formData.get('city') ?? '').trim() || null,
        country: String(formData.get('country') ?? '').trim() || null,
        ticket_url:
          String(formData.get('ticket_url') ?? '').trim() || null,
        photo_urls: photos,
        is_public: formData.get('is_public') === 'on',
        overall_rating: ratings.overall,
        performance_rating: ratings.performance || null,
        sound_rating: ratings.sound || null,
        crowd_rating: ratings.crowd || null,
        venue_rating: ratings.venue || null,
        value_rating: ratings.value || null,
        notes: String(formData.get('notes') ?? '').trim() || null,
        setlist: String(formData.get('setlist') ?? '').trim() || null,
      })
      .select('id')
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (!data?.id) {
      setError('The gig was saved, but no gig ID was returned.');
      return;
    }

    router.push(`/gigs/${data.id}`);
  }

  return (
    <AuthGuard>
      <Nav />

      <main className="shell narrow">
        <section className="hero">
          <div>
            <div className="eyebrow">// stamp a new memory</div>
            <h1>
              LOG A <span className="accent">GIG</span>
            </h1>
          </div>
        </section>

        <form className="panel" onSubmit={submit}>
          <div className="formgrid">
            <div className="field">
              <label htmlFor="artist">Artist / act</label>
              <input
                id="artist"
                className="input"
                name="artist"
                defaultValue={searchParams.get('artist') ?? ''}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="venue">Venue</label>
              <input
                id="venue"
                className="input"
                name="venue"
                defaultValue={searchParams.get('venue') ?? ''}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="festival">Festival (optional)</label>
              <input
                id="festival"
                className="input"
                name="festival"
              />
            </div>

            <div className="field">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                className="input"
                type="date"
                name="date"
                defaultValue={
                  searchParams.get('date') ??
                  new Date().toISOString().slice(0, 10)
                }
                required
              />
            </div>

            <div className="field">
              <label htmlFor="event_type">Type</label>
              <select
                id="event_type"
                className="input"
                name="event_type"
              >
                <option value="gig">Gig</option>
                <option value="festival">Festival</option>
                <option value="club-night">Club night</option>
                <option value="comedy">Comedy</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="city">City</label>
              <input
                id="city"
                className="input"
                name="city"
                defaultValue={searchParams.get('city') ?? ''}
              />
            </div>

            <div className="field">
              <label htmlFor="country">Country</label>
              <input
                id="country"
                className="input"
                name="country"
                defaultValue="United Kingdom"
              />
            </div>

            <div className="field">
              <label htmlFor="ticket_url">Ticket link</label>
              <input
                id="ticket_url"
                className="input"
                name="ticket_url"
                type="url"
                defaultValue={searchParams.get('ticketUrl') ?? ''}
              />
            </div>

            {fields.map((field) => (
              <div className="field" key={field}>
                <label>{field} rating</label>

                <Stars
                  value={ratings[field]}
                  onChange={(value) => {
                    setRatings((current) => ({
                      ...current,
                      [field]: value,
                    }));
                  }}
                />
              </div>
            ))}
          </div>

          <PhotoUploader
            userId={userId}
            urls={photos}
            onChange={setPhotos}
          />

          <div className="field">
            <label htmlFor="setlist">Setlist</label>
            <textarea
              id="setlist"
              className="textarea"
              name="setlist"
              placeholder="One song per line"
            />
          </div>

          <div className="field">
            <label htmlFor="notes">Review / notes</label>
            <textarea
              id="notes"
              className="textarea"
              name="notes"
              placeholder="Highlights, surprises, disasters…"
            />
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              name="is_public"
              defaultChecked
            />
            Show this gig publicly
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button
            className="btn"
            type="submit"
            disabled={saving}
          >
            {saving ? 'Stamping…' : 'Stamp it'}
          </button>
        </form>
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