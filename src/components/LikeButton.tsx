'use client';
import { useEffect,useState } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
export function LikeButton({gigId}:{gigId:string}){
 const [userId,setUserId]=useState(''); const [liked,setLiked]=useState(false); const [count,setCount]=useState(0);
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();setUserId(user?.id||'');const {data}=await supabase.from('review_likes').select('user_id').eq('gig_id',gigId);setCount(data?.length||0);setLiked(!!user&&!!data?.some(x=>x.user_id===user.id));})()},[gigId]);
 async function toggle(){if(!userId)return;if(liked){await supabase.from('review_likes').delete().eq('gig_id',gigId).eq('user_id',userId);setLiked(false);setCount(c=>Math.max(0,c-1));}else{await supabase.from('review_likes').insert({gig_id:gigId,user_id:userId});setLiked(true);setCount(c=>c+1);}}
 return <button className={`ghost like ${liked?'liked':''}`} onClick={toggle}><Heart size={16} fill={liked?'currentColor':'none'}/>{liked?'Liked':'Like'} · {count}</button>
}
