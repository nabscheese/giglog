'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthPage(){
 const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [mode,setMode]=useState<'in'|'up'>('in'); const [msg,setMsg]=useState(''); const router=useRouter();
 async function submit(e:React.FormEvent){e.preventDefault();setMsg('');
   const result=mode==='up'?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});
   if(result.error){setMsg(result.error.message);return} if(mode==='up'&&!result.data.session){setMsg('Check your email to confirm your account.');return} router.push('/');
 }
 return <main className="authwrap"><section className="authcard">
   <div className="eyebrow">// your life in live music</div><h1>GIG <span className="accent">LOG</span></h1>
   <p>{mode==='in'?'Sign in to your archive.':'Make an account and start stamping tickets.'}</p>
   <form onSubmit={submit}><input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/><input className="input" type="password" minLength={6} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/>
   {msg&&<p className={msg.startsWith('Check')?'success':'error'}>{msg}</p>}<button className="btn" style={{width:'100%'}}>{mode==='in'?'Sign in':'Create account'}</button></form>
   <button className="ghost" style={{width:'100%',color:'#111',borderColor:'#0004',marginTop:10}} onClick={()=>{setMode(mode==='in'?'up':'in');setMsg('')}}>{mode==='in'?'Need an account? Sign up':'Already registered? Sign in'}</button>
 </section></main>
}
