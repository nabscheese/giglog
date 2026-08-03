'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

export function LikeButton({ gigId }: { gigId: string }) {
  const { user, openAuth } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('review_likes').select('user_id').eq('gig_id', gigId);
      setCount(data?.length || 0);
      setLiked(Boolean(user && data?.some((row) => row.user_id === user.id)));
    }
    void load();
  }, [gigId, user]);

  async function toggle() {
    if (!user) { openAuth('in'); return; }
    if (liked) {
      await supabase.from('review_likes').delete().eq('gig_id', gigId).eq('user_id', user.id);
      setLiked(false); setCount((current) => Math.max(0, current - 1));
    } else {
      await supabase.from('review_likes').insert({ gig_id: gigId, user_id: user.id });
      setLiked(true); setCount((current) => current + 1);
    }
  }

  return <button className={`ghost like ${liked ? 'liked' : ''}`} onClick={() => void toggle()}><Heart size={16} fill={liked ? 'currentColor' : 'none'} />{liked ? 'Liked' : 'Like'} · {count}</button>;
}
