'use client';
import { useState } from 'react'; import { supabase } from '@/lib/supabase';
export function PhotoUploader({userId,urls,onChange}:{userId:string;urls:string[];onChange:(urls:string[])=>void}){
 const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 async function upload(files:FileList|null){if(!files?.length)return;setBusy(true);setError('');const next=[...urls];for(const file of Array.from(files)){if(file.size>8*1024*1024){setError('Each image must be under 8 MB.');continue}const ext=file.name.split('.').pop()||'jpg';const path=`${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from('gig-photos').upload(path,file,{upsert:false});if(error){setError(error.message);continue}const {data}=supabase.storage.from('gig-photos').getPublicUrl(path);next.push(data.publicUrl)}onChange(next);setBusy(false)}
 return <div className="field"><label>Photos</label><input className="input" type="file" accept="image/*" multiple onChange={e=>upload(e.target.files)} disabled={busy}/>{busy&&<span className="meta">Uploading…</span>}{error&&<span className="error">{error}</span>}{urls.length>0&&<div className="photo-preview">{urls.map((url,i)=><div key={url}><img src={url} alt="Gig memory"/><button type="button" onClick={()=>onChange(urls.filter((_,x)=>x!==i))}>remove</button></div>)}</div>}</div>
}
