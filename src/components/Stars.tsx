'use client';
import { Star } from 'lucide-react';

export function Stars({ value, onChange, label }: { value: number; onChange?: (n:number)=>void; label?: string }) {
  return <div className="stars" aria-label={label || `${value} out of 5`}>
    {[1,2,3,4,5].map(n => (
      <button key={n} type="button" className={n <= value ? 'star active' : 'star'} onClick={() => onChange?.(n)} disabled={!onChange} aria-label={`${n} stars`}>
        <Star size={22} fill={n <= value ? 'currentColor' : 'none'} />
      </button>
    ))}
  </div>;
}
