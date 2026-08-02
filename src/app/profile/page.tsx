'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, ImagePlus, Save, UserRound } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { AuthGuard } from '@/components/AuthGuard';
import { Loading } from '@/components/Loading';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage(userError?.message || 'You need to sign in again.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
      }

      setProfile(
        data || {
          id: user.id,
          username: user.email?.split('@')[0] || 'fan',
          display_name: user.email?.split('@')[0] || '',
          favourite_genres: [],
        },
      );

      setLoading(false);
    }

    void loadProfile();
  }, []);

  async function uploadImage(
    file: File | null,
    type: 'avatar' | 'cover',
  ) {
    if (!file || !profile.id) return;

    const setUploading =
      type === 'avatar' ? setUploadingAvatar : setUploadingCover;

    setUploading(true);
    setMessage('');

    const extension = file.name.split('.').pop() || 'jpg';
    const path = `${profile.id}/${type}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      setMessage(error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    setProfile((current) => ({
      ...current,
      [type === 'avatar' ? 'avatar_url' : 'cover_url']:
        data.publicUrl,
    }));

    setUploading(false);
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(userError?.message || 'You need to sign in again.');
      setSaving(false);
      return;
    }

    const username = profile.username
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

    if (!username) {
      setMessage('Choose a username.');
      setSaving(false);
      return;
    }

    const cleanProfile = {
      id: user.id,
      username,
      display_name: profile.display_name?.trim() || null,
      bio: profile.bio?.trim() || null,
      home_city: profile.home_city?.trim() || null,
      avatar_url: profile.avatar_url || null,
      cover_url: profile.cover_url || null,
      website: profile.website?.trim() || null,
      instagram: profile.instagram
        ?.trim()
        .replace(/^@/, '') || null,
      spotify_url: profile.spotify_url?.trim() || null,
      favourite_genres: profile.favourite_genres || [],
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(cleanProfile, { onConflict: 'id' });

    setMessage(error ? error.message : 'Profile saved.');
    setSaving(false);
  }

  if (loading) {
    return (
      <AuthGuard>
        <Nav />
        <main className="shell">
          <Loading label="Loading your profile…" />
        </main>
      </AuthGuard>
    );
  }

  const initial = (
    profile.display_name ||
    profile.username ||
    '?'
  )[0]?.toUpperCase();

  return (
    <AuthGuard>
      <Nav />

      <main className="shell profile-settings-shell">
        <section className="profile-settings-hero">
          <div>
            <div className="eyebrow">// build your gig identity</div>
            <h1>
              PROFILE <span className="accent">2.0</span>
            </h1>
            <p>
              Make your GigLog profile feel like your own corner of the
              venue.
            </p>
          </div>

          {profile.username ? (
            <Link
              className="ghost"
              href={`/u/${profile.username}`}
            >
              View public profile
              <ExternalLink size={15} />
            </Link>
          ) : null}
        </section>

        <form className="profile-settings-grid" onSubmit={saveProfile}>
          <section className="panel profile-visual-editor">
            <div
              className="profile-cover-preview"
              style={
                profile.cover_url
                  ? {
                      backgroundImage: `linear-gradient(180deg, transparent, #111c), url("${profile.cover_url}")`,
                    }
                  : undefined
              }
            >
              <label className="profile-upload-button">
                <ImagePlus size={16} />
                {uploadingCover ? 'Uploading…' : 'Change cover'}

                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={uploadingCover}
                  onChange={(event) =>
                    void uploadImage(
                      event.target.files?.[0] || null,
                      'cover',
                    )
                  }
                />
              </label>
            </div>

            <div className="profile-avatar-editor">
              {profile.avatar_url ? (
                <img
                  className="profile-avatar-xl"
                  src={profile.avatar_url}
                  alt="Your profile"
                />
              ) : (
                <div className="profile-avatar-xl fallback">
                  {initial}
                </div>
              )}

              <div>
                <strong>
                  {profile.display_name ||
                    profile.username ||
                    'Gig fan'}
                </strong>

                <label className="ghost profile-avatar-upload">
                  <UserRound size={15} />
                  {uploadingAvatar ? 'Uploading…' : 'Change avatar'}

                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={uploadingAvatar}
                    onChange={(event) =>
                      void uploadImage(
                        event.target.files?.[0] || null,
                        'avatar',
                      )
                    }
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="panel profile-details-editor">
            <h2>Your details</h2>

            <div className="formgrid">
              <div className="field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  className="input"
                  value={profile.username || ''}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="displayName">Display name</label>
                <input
                  id="displayName"
                  className="input"
                  value={profile.display_name || ''}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      display_name: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="homeCity">Home city</label>
                <input
                  id="homeCity"
                  className="input"
                  value={profile.home_city || ''}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      home_city: event.target.value,
                    }))
                  }
                  placeholder="Manchester"
                />
              </div>

              <div className="field">
                <label htmlFor="instagram">Instagram</label>
                <input
                  id="instagram"
                  className="input"
                  value={profile.instagram || ''}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      instagram: event.target.value,
                    }))
                  }
                  placeholder="@username"
                />
              </div>

              <div className="field">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  className="input"
                  type="url"
                  value={profile.website || ''}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      website: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="field">
                <label htmlFor="spotify">Spotify profile or playlist</label>
                <input
                  id="spotify"
                  className="input"
                  type="url"
                  value={profile.spotify_url || ''}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      spotify_url: event.target.value,
                    }))
                  }
                  placeholder="https://open.spotify.com/..."
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="genres">Favourite genres</label>
              <input
                id="genres"
                className="input"
                value={(profile.favourite_genres || []).join(', ')}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    favourite_genres: event.target.value
                      .split(',')
                      .map((genre) => genre.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="Pop punk, rock, emo…"
              />

              <div className="profile-genre-preview">
                {(profile.favourite_genres || []).map((genre) => (
                  <span key={genre}>{genre}</span>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="bio">
                Bio ({profile.bio?.length || 0}/300)
              </label>
              <textarea
                id="bio"
                className="textarea"
                value={profile.bio || ''}
                maxLength={300}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bio: event.target.value,
                  }))
                }
                placeholder="Tell people what you love about live music…"
              />
            </div>

            {message ? (
              <p
                className={
                  message === 'Profile saved.' ? 'success' : 'error'
                }
              >
                {message}
              </p>
            ) : null}

            <button
              className="btn"
              type="submit"
              disabled={
                saving || uploadingAvatar || uploadingCover
              }
            >
              <Save size={16} />
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </section>
        </form>
      </main>
    </AuthGuard>
  );
}