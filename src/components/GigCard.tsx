import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';
import { Stars } from './Stars';
import type { Gig } from '@/lib/types';
export function GigCard({gig}:{gig:Gig}){
 const d=new Date(gig.event_date+'T00:00:00');
 return <Link href={`/gigs/${gig.id}`} className="card ticket">
  <div className="stub"><span>{d.toLocaleString('en-GB',{month:'short'}).toUpperCase()}</span><strong>{d.getDate()}</strong><span>{d.getFullYear()}</span><div className="rating">{gig.overall_rating}/5</div></div>
  <div className="ticketbody">
   <div className="ticket-head"><div><h3>{gig.artist_name}</h3><div className="meta">{gig.venue_name}{gig.city?`, ${gig.city}`:''}{gig.festival_name?` · ${gig.festival_name}`:''}</div></div><span className="pill">{gig.event_type||'gig'}</span></div>
   <div className="stats"><span>PERFORMANCE <b>{gig.performance_rating||gig.overall_rating}/5</b></span><span>SOUND <b>{gig.sound_rating||gig.overall_rating}/5</b></span><span>CROWD <b>{gig.crowd_rating||gig.overall_rating}/5</b></span></div>
   {gig.notes&&<p className="note clamp">{gig.notes}</p>}
   <div className="card-footer"><Stars value={gig.overall_rating}/><span className="social-count"><Heart size={14}/>{gig.review_likes?.length||0}<MessageCircle size={14}/>{gig.comments?.length||0}</span></div>
   <div className="meta">logged by {gig.profiles?.display_name||gig.profiles?.username||'fan'}</div>
  </div>
 </Link>
}
