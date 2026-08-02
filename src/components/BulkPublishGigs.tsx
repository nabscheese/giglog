'use client';

import { useMemo, useState } from 'react';
import { CheckSquare, Globe2, Square } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Gig } from '@/lib/types';

type Props = {
  userId: string;
  gigs: Gig[];
  onPublished: (ids: string[]) => void;
};

export function BulkPublishGigs({ userId, gigs, onPublished }: Props) {
  const privateGigs = useMemo(() => gigs.filter((gig) => !gig.is_public), [gigs]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const allSelected = privateGigs.length > 0 && selected.length === privateGigs.length;

  function toggleAll() {
    setSelected(allSelected ? [] : privateGigs.map((gig) => gig.id));
  }

  function toggleOne(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function publish(ids: string[]) {
    if (!ids.length || busy) return;
    const wording = ids.length === privateGigs.length ? 'all private memories' : `${ids.length} selected ${ids.length === 1 ? 'memory' : 'memories'}`;
    if (!window.confirm(`Make ${wording} public? Anyone with your profile link will be able to see them.`)) return;

    setBusy(true);
    setMessage('Publishing memories…');

    const { error } = await supabase
      .from('gigs')
      .update({ is_public: true })
      .eq('user_id', userId)
      .in('id', ids);

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    onPublished(ids);
    setSelected([]);
    setMessage(`${ids.length} ${ids.length === 1 ? 'memory is' : 'memories are'} now public.`);
    setBusy(false);
  }

  if (!privateGigs.length) {
    return (
      <section className="panel bulk-publish-panel is-complete">
        <div>
          <div className="eyebrow">// profile visibility</div>
          <h2>Everything is public</h2>
          <p>All of your logged memories are visible on your profile.</p>
        </div>
        <Globe2 size={34} aria-hidden="true" />
      </section>
    );
  }

  return (
    <section className="panel bulk-publish-panel" aria-labelledby="bulk-publish-title">
      <div className="bulk-publish-heading">
        <div>
          <div className="eyebrow">// choose what people can see</div>
          <h2 id="bulk-publish-title">Publish memories</h2>
          <p>{privateGigs.length} private {privateGigs.length === 1 ? 'gig is' : 'gigs are'} hidden from your public profile.</p>
        </div>
        <button className="ghost" type="button" onClick={toggleAll} disabled={busy}>
          {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
          {allSelected ? 'Clear selection' : 'Select all'}
        </button>
      </div>

      <div className="bulk-publish-list">
        {privateGigs.map((gig) => (
          <label className="bulk-publish-row" key={gig.id}>
            <input
              type="checkbox"
              checked={selected.includes(gig.id)}
              disabled={busy}
              onChange={() => toggleOne(gig.id)}
            />
            <span>
              <strong>{gig.artist_name}</strong>
              <small>{gig.venue_name} · {new Date(`${gig.event_date}T00:00:00`).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</small>
            </span>
            <em>Private</em>
          </label>
        ))}
      </div>

      <div className="bulk-publish-actions">
        <span aria-live="polite">{message || `${selected.length} selected`}</span>
        <div>
          <button className="ghost" type="button" disabled={busy || !selected.length} onClick={() => void publish(selected)}>
            Make selected public
          </button>
          <button className="btn" type="button" disabled={busy} onClick={() => void publish(privateGigs.map((gig) => gig.id))}>
            <Globe2 size={16} /> {busy ? 'Publishing…' : 'Make all public'}
          </button>
        </div>
      </div>
    </section>
  );
}
