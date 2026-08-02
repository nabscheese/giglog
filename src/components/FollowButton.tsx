'use client';
import { useEffect,useState } from 'react'; import { supabase } from '@/lib/supabase';
export function FollowButton({profileId}:{profileId:string}){const [me,setMe]=useState('');const [following,setFollowing]=useState(false);
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();setMe(user?.id||'');if(user){const {data}=await supabase.from('follows').select('following_id').eq('follower_id',user.id).eq('following_id',profileId).maybeSingle();setFollowing(!!data)}})()},[profileId]);
 if(!me||me===profileId)return null; async function toggle(){if(following){await supabase.from('follows').delete().eq('follower_id',me).eq('following_id',profileId)}else{await supabase.from('follows').insert({follower_id:me,following_id:profileId})}setFollowing(!following)}
 return <button className={following?'ghost':'btn'} onClick={toggle}>{following?'Following':'Follow'}</button>}
