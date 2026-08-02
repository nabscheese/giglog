'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function AuthGuard({children}:{children:React.ReactNode}){
 const [ready,setReady]=useState(false); const router=useRouter();
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(!data.session) router.replace('/auth'); else setReady(true)});},[router]);
 if(!ready) return <main className="center"><div className="loader">checking your wristband…</div></main>;
 return <>{children}</>;
}
