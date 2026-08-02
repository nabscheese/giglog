'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, FileSpreadsheet, Import, Music2, Upload, X } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { Nav } from '@/components/Nav';
import { supabase } from '@/lib/supabase';

type CsvRow = Record<string, string>;

type FestivalArtist = {
  name: string;
  seen: boolean;
  setlist: string;
  setlistUrl: string;
};

type ImportGig = {
  key: string;
  selected: boolean;
  duplicate: boolean;
  artist: string;
  supportingActs: string[];
  bandsNotSeen: string[];
  festivalArtists: FestivalArtist[];
  venue: string;
  city: string;
  country: string;
  date: string;
  eventName: string;
  eventType: 'gig' | 'festival';
  sourceUrl: string;
  setlist: string;
  setlistState: 'idle' | 'loading' | 'found' | 'missing' | 'error';
};

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim().replace(/^\uFEFF/, ''));
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, (values[index] || '').trim()])),
  );
}

function parseDate(value: string): string {
  if (!value) return '';
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return value;
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function splitActs(value: string): string[] {
  return value
    .split(/\s+\/\s+/)
    .map((act) => act.trim())
    .filter(Boolean);
}

function parseLocation(value: string) {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  return {
    city: parts[0] || '',
    country: parts.at(-1) || '',
  };
}

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function looksLikeFestival(name: string) {
  return /festival|slam dunk|download|outbreak|all points east|reading|leeds/i.test(name);
}

export default function ImportPage() {
  const [gigs, setGigs] = useState<ImportGig[]>([]);
  const [filename, setFilename] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [defaultRating, setDefaultRating] = useState(3);
  const [makePublic, setMakePublic] = useState(false);
  const [imported, setImported] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });

  const selected = useMemo(() => gigs.filter((gig) => gig.selected && !gig.duplicate), [gigs]);
  const duplicates = useMemo(() => gigs.filter((gig) => gig.duplicate).length, [gigs]);

  async function readFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMessage('Reading your Concert Archives export…');
    setFilename(file.name);
    setImported(0);

    try {
      const rows = parseCsv(await file.text());
      if (!rows.length || !('Start Date' in rows[0]) || !('Bands Seen' in rows[0])) {
        throw new Error('This does not look like a Concert Archives export CSV.');
      }

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('Your session expired. Sign in again.');

      const { data: existing, error } = await supabase
        .from('gigs')
        .select('artist_name,venue_name,event_date')
        .eq('user_id', userId);
      if (error) throw error;

      const existingKeys = new Set(
        (existing || []).map((gig) =>
          `${gig.event_date}|${normalise(gig.artist_name)}|${normalise(gig.venue_name)}`,
        ),
      );

      const parsed = rows
        .map((row, index): ImportGig | null => {
          const seenActs = splitActs(row['Bands Seen'] || '');
          const notSeenActs = splitActs(row['Bands Not Seen'] || '');
          const venue = row.Venue || '';
          const date = parseDate(row['Start Date'] || '');
          const eventName = row['Concert Name'] || '';
          const eventType = looksLikeFestival(eventName) ? 'festival' : 'gig';
          const artist = eventType === 'festival'
            ? eventName || seenActs[0] || ''
            : seenActs[0] || eventName || '';
          if (!artist || !venue || !date) return null;
          const location = parseLocation(row.Location || '');
          const duplicateKey = `${date}|${normalise(artist)}|${normalise(venue)}`;
          const festivalArtists = eventType === 'festival'
            ? [
                ...seenActs.map((name) => ({ name, seen: true, setlist: '', setlistUrl: '' })),
                ...notSeenActs.map((name) => ({ name, seen: false, setlist: '', setlistUrl: '' })),
              ]
            : [];

          return {
            key: `${duplicateKey}-${index}`,
            selected: !existingKeys.has(duplicateKey),
            duplicate: existingKeys.has(duplicateKey),
            artist,
            supportingActs: eventType === 'festival' ? [] : seenActs.slice(1),
            bandsNotSeen: notSeenActs,
            festivalArtists,
            venue,
            city: location.city,
            country: location.country,
            date,
            eventName,
            eventType,
            sourceUrl: row.URL || '',
            setlist: '',
            setlistState: 'idle',
          };
        })
        .filter((gig): gig is ImportGig => Boolean(gig));

      setGigs(parsed);
      setMessage(`${parsed.length} concerts found. ${existingKeys.size ? `${parsed.filter((gig) => gig.duplicate).length} possible duplicates detected.` : ''}`);
    } catch (error) {
      setGigs([]);
      setMessage(error instanceof Error ? error.message : 'Could not read the CSV.');
    } finally {
      setBusy(false);
    }
  }

  function updateGig(key: string, patch: Partial<ImportGig>) {
    setGigs((current) => current.map((gig) => (gig.key === key ? { ...gig, ...patch } : gig)));
  }

  async function fetchSetlist(artistName: string, gig: ImportGig) {
    const params = new URLSearchParams({
      artist: artistName,
      venue: gig.venue,
      city: gig.city,
      date: gig.date,
    });

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`/api/setlistfm?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      const body = await response.json();
      return {
        found: response.ok && Boolean(body.found),
        setlist: response.ok && body.found ? body.setlist || '' : '',
        url: response.ok && body.found ? body.url || '' : '',
      };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function enrichGig(gig: ImportGig): Promise<ImportGig> {
    try {
      if (gig.eventType === 'festival') {
        const festivalArtists: FestivalArtist[] = [];
        const sections: string[] = [];

        for (const act of gig.festivalArtists) {
          if (!act.seen) {
            festivalArtists.push(act);
            continue;
          }

          const result = await fetchSetlist(act.name, gig);
          festivalArtists.push({ ...act, setlist: result.setlist, setlistUrl: result.url });
          if (result.setlist) sections.push(`${act.name}\n${result.setlist}`);
        }

        return {
          ...gig,
          festivalArtists,
          setlist: sections.join('\n\n'),
          setlistState: sections.length ? 'found' : 'missing',
        };
      }

      const result = await fetchSetlist(gig.artist, gig);
      return {
        ...gig,
        setlist: result.setlist,
        setlistState: result.found ? 'found' : 'missing',
      };
    } catch {
      return { ...gig, setlistState: 'error' };
    }
  }

  async function enrichSetlists() {
    const targets = gigs.filter((gig) => gig.selected && !gig.duplicate && gig.setlistState === 'idle');
    if (!targets.length) return;
    setBusy(true);
    setMessage(`Checking Setlist.fm for ${targets.length} selected concerts…`);

    for (const target of targets) {
      updateGig(target.key, { setlistState: 'loading' });
      try {
        if (target.eventType === 'festival') {
          const updatedArtists: FestivalArtist[] = [];
          const sections: string[] = [];
          for (const act of target.festivalArtists) {
            if (!act.seen) {
              updatedArtists.push(act);
              continue;
            }
            const result = await fetchSetlist(act.name, target);
            updatedArtists.push({ ...act, setlist: result.setlist, setlistUrl: result.url });
            if (result.setlist) sections.push(`${act.name}
${result.setlist}`);
          }
          updateGig(target.key, {
            festivalArtists: updatedArtists,
            setlist: sections.join('\n\n'),
            setlistState: sections.length ? 'found' : 'missing',
          });
        } else {
          const result = await fetchSetlist(target.artist, target);
          updateGig(target.key, {
            setlist: result.setlist,
            setlistState: result.found ? 'found' : 'missing',
          });
        }
      } catch {
        updateGig(target.key, { setlistState: 'error' });
      }
    }

    setBusy(false);
    setMessage('Setlist check complete. You can import now.');
  }

  async function importSelected() {
    const selectedSnapshot = gigs.filter((gig) => gig.selected && !gig.duplicate);
    if (!selectedSnapshot.length) return;

    setBusy(true);
    setImported(0);
    setProgress({ current: 0, total: selectedSnapshot.length, label: 'Importing concerts' });
    setMessage(`Importing ${selectedSnapshot.length} concerts…`);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('Your session expired. Sign in again.');

      const importedJobs: { gig: ImportGig; id: string }[] = [];
      const failedKeys = new Set<string>();
      const failureMessages: string[] = [];
      let importCompleted = 0;

      for (const gig of selectedSnapshot) {
        const seenFestivalActs = gig.festivalArtists
          .filter((act) => act.seen)
          .map((act) => act.name);
        const notSeenFestivalActs = gig.festivalArtists
          .filter((act) => !act.seen)
          .map((act) => act.name);
        const importedNotes = [
          gig.supportingActs.length ? `Also seen: ${gig.supportingActs.join(', ')}` : '',
          gig.eventType === 'festival' && seenFestivalActs.length
            ? `Acts seen: ${seenFestivalActs.join(', ')}`
            : '',
          gig.eventType === 'festival' && notSeenFestivalActs.length
            ? `On the lineup, not seen: ${notSeenFestivalActs.join(', ')}`
            : '',
          gig.eventType !== 'festival' && gig.bandsNotSeen.length
            ? `On the bill, not seen: ${gig.bandsNotSeen.join(', ')}`
            : '',
          gig.sourceUrl
            ? `Imported from Concert Archives: ${gig.sourceUrl}`
            : 'Imported from Concert Archives',
        ]
          .filter(Boolean)
          .join('\n\n');

        const { data: inserted, error: insertError } = await supabase
          .from('gigs')
          .insert({
            user_id: userId,
            artist_name: gig.artist,
            venue_name: gig.venue,
            festival_name: gig.eventType === 'festival' ? gig.eventName || gig.artist : null,
            festival_artists: gig.festivalArtists,
            event_date: gig.date,
            event_type: gig.eventType,
            city: gig.city || null,
            country: gig.country || null,
            ticket_url: null,
            photo_urls: [],
            is_public: makePublic,
            overall_rating: defaultRating,
            performance_rating: null,
            sound_rating: null,
            crowd_rating: null,
            venue_rating: null,
            value_rating: null,
            notes: importedNotes,
            setlist: gig.setlist || null,
          })
          .select('id')
          .single();

        if (insertError || !inserted?.id) {
          failedKeys.add(gig.key);
          failureMessages.push(
            insertError?.message || `No ID was returned for ${gig.artist} at ${gig.venue}.`,
          );
          updateGig(gig.key, { setlistState: 'error' });
        } else {
          importedJobs.push({ gig, id: inserted.id as string });
        }

        importCompleted += 1;
        setProgress({
          current: importCompleted,
          total: selectedSnapshot.length,
          label: 'Importing concerts',
        });
        setMessage(
          `Imported ${importedJobs.length}/${selectedSnapshot.length}` +
            (failedKeys.size ? ` · skipped ${failedKeys.size}` : ''),
        );
      }

      setImported(importedJobs.length);

      if (!importedJobs.length) {
        const firstFailure = failureMessages[0];
        throw new Error(
          firstFailure
            ? `None of the selected concerts could be imported. Supabase said: ${firstFailure}`
            : 'None of the selected concerts could be imported.',
        );
      }

      setProgress({ current: 0, total: importedJobs.length, label: 'Checking setlists' });
      setMessage(
        `${importedJobs.length} concerts imported. Finding setlists in the background…`,
      );

      const queue = [...importedJobs];
      let setlistsCompleted = 0;
      let setlistsFound = 0;

      async function worker() {
        while (queue.length) {
          const job = queue.shift();
          if (!job) return;

          const enriched =
            job.gig.setlistState === 'idle' ? await enrichGig(job.gig) : job.gig;

          if (enriched.setlist) setlistsFound += 1;

          const { error: updateError } = await supabase
            .from('gigs')
            .update({
              setlist: enriched.setlist || null,
              festival_artists: enriched.festivalArtists,
            })
            .eq('id', job.id);

          updateGig(job.gig.key, {
            setlist: enriched.setlist,
            festivalArtists: enriched.festivalArtists,
            setlistState: updateError ? 'error' : enriched.setlistState,
          });

          setlistsCompleted += 1;
          setProgress({
            current: setlistsCompleted,
            total: importedJobs.length,
            label: 'Checking setlists',
          });
          setMessage(
            `Concerts saved · setlists checked ${setlistsCompleted}/${importedJobs.length}`,
          );
        }
      }

      const workerCount = Math.min(3, importedJobs.length);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));

      setGigs((current) =>
        current.filter(
          (gig) => !importedJobs.some((job) => job.gig.key === gig.key),
        ),
      );
      setProgress({ current: importedJobs.length, total: importedJobs.length, label: 'Complete' });
      setMessage(
        `${importedJobs.length} concerts imported successfully · ${setlistsFound} setlists found` +
          (failedKeys.size ? ` · ${failedKeys.size} skipped` : ''),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The import failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGuard>
      <Nav />
      <main className="shell import-shell">
        <section className="import-hero">
          <div>
            <div className="eyebrow">// bring your concert history with you</div>
            <h1>IMPORT <span className="accent">MEMORIES</span></h1>
            <p>Upload your Concert Archives CSV, review what was found, skip duplicates and bring years of gigs into GigLog.</p>
          </div>
          <FileSpreadsheet size={58} aria-hidden="true" />
        </section>

        <section className="panel import-upload-panel">
          <div>
            <h2>Concert Archives</h2>
            <p>Use your exported spreadsheet in CSV format. Nothing is uploaded until you confirm the preview.</p>
          </div>
          <label className="btn import-file-button">
            <Upload size={17} /> {busy ? 'Working…' : 'Choose CSV'}
            <input type="file" accept=".csv,text/csv" hidden disabled={busy} onChange={(event) => void readFile(event.target.files?.[0] || null)} />
          </label>
          {filename ? <span className="meta">{filename}</span> : null}
        </section>

        {message ? <p className={message.includes('failed') || message.includes('Could not') || message.includes('expired') ? 'error import-message' : 'success import-message'}>{message}</p> : null}

        {progress.total > 0 ? (
          <section className="panel import-progress" aria-live="polite">
            <div className="import-progress-head">
              <strong>{progress.label}</strong>
              <span>{progress.current}/{progress.total}</span>
            </div>
            <progress value={progress.current} max={progress.total} />
          </section>
        ) : null}

        {gigs.length ? (
          <>
            <section className="import-summary-grid">
              <div><strong>{gigs.length}</strong><span>Detected</span></div>
              <div><strong>{selected.length}</strong><span>Ready</span></div>
              <div><strong>{duplicates}</strong><span>Duplicates</span></div>
              <div><strong>{gigs.filter((gig) => gig.setlistState === 'found').length}</strong><span>Setlists found</span></div>
            </section>

            <section className="panel import-options">
              <div className="field">
                <label htmlFor="import-rating">Temporary rating</label>
                <select id="import-rating" className="input" value={defaultRating} onChange={(event) => setDefaultRating(Number(event.target.value))}>
                  <option value="3">3 stars — neutral</option>
                  <option value="4">4 stars</option>
                  <option value="5">5 stars</option>
                  <option value="2">2 stars</option>
                  <option value="1">1 star</option>
                </select>
                <small className="meta">Your database currently requires a rating. You can edit each imported memory later.</small>
              </div>
              <label className="toggle"><input type="checkbox" checked={makePublic} onChange={(event) => setMakePublic(event.target.checked)} /> Make imported memories public immediately</label>
              <div className="button-row">
                <button className="ghost" type="button" disabled={busy || !selected.length} onClick={() => void enrichSetlists()}><Music2 size={16} /> Preview setlists</button>
                <button className="btn" type="button" disabled={busy || !selected.length} onClick={() => void importSelected()}><Import size={16} /> Import {selected.length} concerts + setlists</button>
              </div>
            </section>

            <section className="import-list" aria-label="Concert import preview">
              {gigs.map((gig) => (
                <article className={`import-row ${gig.duplicate ? 'duplicate' : ''}`} key={gig.key}>
                  <label className="import-select">
                    <input type="checkbox" checked={gig.selected} disabled={gig.duplicate} onChange={(event) => updateGig(gig.key, { selected: event.target.checked })} />
                    {gig.duplicate ? <X size={17} /> : <Check size={17} />}
                  </label>
                  <div className="import-date">
                    <strong>{new Date(`${gig.date}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</strong>
                    <span>{gig.date.slice(0, 4)}</span>
                  </div>
                  <div className="import-main">
                    <div className="import-title-row">
                      <h3>{gig.artist}</h3>
                      <span className="pill">{gig.eventType}</span>
                      {gig.duplicate ? <span className="import-warning">Already in GigLog</span> : null}
                    </div>
                    <p>{gig.venue}{gig.city ? ` · ${gig.city}` : ''}{gig.country ? ` · ${gig.country}` : ''}</p>
                    {gig.supportingActs.length ? <small>Also seen: {gig.supportingActs.join(', ')}</small> : null}
                    {gig.eventType === 'festival' && gig.festivalArtists.length ? (
                      <div className="festival-import-lineup">
                        <strong>Who did you see?</strong>
                        <div>
                          {gig.festivalArtists.map((act, index) => (
                            <label key={`${gig.key}-${act.name}-${index}`}>
                              <input
                                type="checkbox"
                                checked={act.seen}
                                onChange={(event) =>
                                  updateGig(gig.key, {
                                    festivalArtists: gig.festivalArtists.map((item) =>
                                      item.name === act.name ? { ...item, seen: event.target.checked } : item,
                                    ),
                                    setlistState: 'idle',
                                  })
                                }
                              />
                              {act.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {gig.eventName && gig.eventName !== gig.artist ? <small>{gig.eventName}</small> : null}
                  </div>
                  <div className={`import-setlist-state ${gig.setlistState}`}>
                    {gig.setlistState === 'loading' ? 'Checking…' : gig.setlistState === 'found' ? 'Setlist found' : gig.setlistState === 'missing' ? 'No setlist' : gig.setlistState === 'error' ? 'Check failed' : 'Not checked'}
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : null}

        {imported ? (
          <section className="panel import-complete">
            <Check size={34} />
            <div><h2>{imported} memories imported</h2><p>Your concert history is now in GigLog. Open the archive to add ratings, photos and notes.</p></div>
            <Link className="btn" href="/">View archive</Link>
          </section>
        ) : null}
      </main>
    </AuthGuard>
  );
}
