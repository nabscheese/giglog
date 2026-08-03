'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

export function FollowButton({ profileId }: { profileId: string }) {
  const { user, openAuth } = useAuth();
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) { setFollowing(false); return; }
      const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id).eq('following_id', profileId).maybeSingle();
      setFollowing(Boolean(data));
    }
    void load();
  }, [profileId, user]);

  if (user?.id === profileId) return null;

  async function toggle() {
    if (!user) { openAuth('in'); return; }
    if (following) await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profileId);
    else await supabase.from('follows').insert({ follower_id: user.id, following_id: profileId });
    setFollowing(!following);
  }

  return <button className={following ? 'ghost' : 'btn'} onClick={() => void toggle()}>{following ? 'Following' : user ? 'Follow' : 'Log in to follow'}</button>;
}
