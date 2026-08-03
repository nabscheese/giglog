'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { Stars } from '@/components/Stars';
import { LikeButton } from '@/components/LikeButton';
import { PhotoUploader } from '@/components/PhotoUploader';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { Comment, Gig } from '@/lib/types';

const ratingFields = ['overall', 'performance', 'sound', 'crowd', 'venue', 'value'] as const;

export default function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, openAuth } = useAuth();
  const [gig, setGig] = useState<Gig | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    const [{ data: gigData, error: gigError }, { data: commentData }] = await Promise.all([
      supabase.from('gigs').select('*, profiles!gigs_user_id_profiles_fkey(username,display_name,avatar_url)').eq('id', id).single(),
      supabase.from('comments').select('*, profiles(username,display_name)').eq('gig_id', id).order('created_at'),
    ]);
    if (gigError) setError(gigError.message);
    else {
      setGig(gigData as Gig);
      setPhotos(gigData.photo_urls || []);
      setRatings({
        overall: gigData.overall_rating,
        performance: gigData.performance_rating || 0,
        sound: gigData.sound_rating || 0,
        crowd: gigData.crowd_rating || 0,
        venue: gigData.venue_rating || 0,
        value: gigData.value_rating || 0,
      });
    }
    setComments((commentData || []) as Comment[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [id]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gig || !user) return;
    const formData = new FormData(event.currentTarget);
    const { error: updateError } = await supabase.from('gigs').update({
      artist_name: formData.get('artist'), venue_name: formData.get('venue'), festival_name: formData.get('festival') || null,
      event_date: formData.get('date'), event_type: formData.get('event_type'), city: formData.get('city') || null,
      country: formData.get('country') || null, ticket_url: formData.get('ticket_url') || null, photo_urls: photos,
      is_public: formData.get('is_public') === 'on', overall_rating: ratings.overall,
      performance_rating: ratings.performance || null, sound_rating: ratings.sound || null,
      crowd_rating: ratings.crowd || null, venue_rating: ratings.venue || null, value_rating: ratings.value || null,
      setlist: formData.get('setlist') || null, notes: formData.get('notes') || null, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (updateError) { setError(updateError.message); return; }
    setEditing(false);
    await load();
  }

  async function remove() {
    if (!confirm('Delete this gig permanently?')) return;
    const { error: deleteError } = await supabase.from('gigs').delete().eq('id', id);
    if (deleteError) setError(deleteError.message);
    else router.push('/memories');
  }

  async function addComment(event: React.FormEvent) {
    event.preventDefault();
    if (!user) { openAuth('in'); return; }
    if (!comment.trim()) return;
    const { error: commentError } = await supabase.from('comments').insert({ gig_id: id, user_id: user.id, body: comment.trim() });
    if (!commentError) { setComment(''); await load(); }
  }

  if (loading) return <><Nav /><main className="shell"><Loading label="Finding the ticket…" /></main></>;
  if (!gig) return <><Nav /><main className="shell"><div className="empty">{error || 'Gig not found.'}</div></main></>;

  const own = gig.user_id === user?.id;

  return <><Nav /><main className="shell narrow">
    <section className="hero"><div><div className="eyebrow">// {new Date(`${gig.event_date}T00:00:00`).toLocaleDateString('en-GB', { dateStyle: 'long' })}</div><h1>{gig.artist_name}</h1><p className="hero-copy">{gig.venue_name}{gig.city ? `, ${gig.city}` : ''}{gig.festival_name ? ` · ${gig.festival_name}` : ''}</p></div>{own ? <div className="button-row"><button className="ghost" onClick={() => setEditing(!editing)}><Pencil size={16} /> {editing ? 'Cancel' : 'Edit'}</button><button className="danger" onClick={() => void remove()}><Trash2 size={16} /> Delete</button></div> : null}</section>

    {editing ? <form className="panel" onSubmit={save}><div className="formgrid">
      <div className="field"><label>Artist</label><input className="input" name="artist" defaultValue={gig.artist_name} required /></div>
      <div className="field"><label>Venue</label><input className="input" name="venue" defaultValue={gig.venue_name} required /></div>
      <div className="field"><label>Festival</label><input className="input" name="festival" defaultValue={gig.festival_name || ''} /></div>
      <div className="field"><label>Date</label><input className="input" type="date" name="date" defaultValue={gig.event_date} required /></div>
      <div className="field"><label>Type</label><select className="input" name="event_type" defaultValue={gig.event_type || 'gig'}><option value="gig">Gig</option><option value="festival">Festival</option><option value="club-night">Club night</option><option value="comedy">Comedy</option><option value="other">Other</option></select></div>
      <div className="field"><label>City</label><input className="input" name="city" defaultValue={gig.city || ''} /></div>
      <div className="field"><label>Country</label><input className="input" name="country" defaultValue={gig.country || ''} /></div>
      <div className="field"><label>Ticket URL</label><input className="input" type="url" name="ticket_url" defaultValue={gig.ticket_url || ''} /></div>
      {ratingFields.map((field) => <div className="field" key={field}><label>{field} rating</label><Stars value={ratings[field] || 0} onChange={(value) => setRatings({ ...ratings, [field]: value })} /></div>)}
    </div><PhotoUploader userId={user?.id || ''} urls={photos} onChange={setPhotos} /><div className="field"><label>Setlist</label><textarea className="textarea" name="setlist" defaultValue={gig.setlist || ''} /></div><div className="field"><label>Review</label><textarea className="textarea" name="notes" defaultValue={gig.notes || ''} /></div><label className="toggle"><input type="checkbox" name="is_public" defaultChecked={gig.is_public !== false} /> Public</label>{error ? <p className="error">{error}</p> : null}<button className="btn">Save changes</button></form> : <>
      <article className="panel detail"><div className="detail-grid"><div><span className="pill">{gig.event_type || 'gig'}</span><Stars value={gig.overall_rating} /><p className="note review-text">{gig.notes || 'No review added.'}</p>{gig.ticket_url ? <a className="ghost dark inline" href={gig.ticket_url} target="_blank" rel="noreferrer">Ticket page <ExternalLink size={14} /></a> : null}<p className="meta">Logged by <Link href={`/u/${gig.profiles?.username}`}>{gig.profiles?.display_name || gig.profiles?.username || 'fan'}</Link></p></div><div className="rating-list">{[['Performance', gig.performance_rating], ['Sound', gig.sound_rating], ['Crowd', gig.crowd_rating], ['Venue', gig.venue_rating], ['Value', gig.value_rating]].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{value || gig.overall_rating}/5</strong></div>)}</div></div>{gig.photo_urls?.length ? <div className="photo-gallery">{gig.photo_urls.map((url) => <img key={url} src={url} alt="Gig memory" />)}</div> : null}{gig.setlist ? <><h3>{gig.event_type === 'festival' ? 'Festival setlists' : 'Setlist'}</h3><pre className="setlist">{gig.setlist}</pre></> : null}<LikeButton gigId={gig.id} /></article>
      <section className="panel comments"><h2>Comments <span className="accent">({comments.length})</span></h2>{comments.map((item) => <div className="comment" key={item.id}><strong>{item.profiles?.display_name || item.profiles?.username || 'Fan'}</strong><span className="meta">{new Date(item.created_at).toLocaleString('en-GB')}</span><p>{item.body}</p></div>)}{user ? <form className="comment-form" onSubmit={addComment}><input className="input" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment…" /><button className="btn small">Post</button></form> : <button className="ghost" onClick={() => openAuth('in')}>Log in to comment</button>}</section>
    </>}
  </main></>;
}
