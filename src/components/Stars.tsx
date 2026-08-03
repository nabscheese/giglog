'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

type StarsProps = {
  value: number;
  onChange?: (value: number) => void;
  label?: string;
  compact?: boolean;
  showValue?: boolean;
};

export function Stars({
  value,
  onChange,
  label,
  compact = false,
  showValue = false,
}: StarsProps) {
  const [preview, setPreview] = useState<number | null>(null);
  const displayedValue = preview ?? value;
  const interactive = Boolean(onChange);

  return (
    <div
      className={`stars${compact ? ' compact' : ''}`}
      aria-label={label || `${value} out of 5`}
      onMouseLeave={() => setPreview(null)}
    >
      <div className="star-buttons" role={interactive ? 'radiogroup' : undefined}>
        {[1, 2, 3, 4, 5].map((rating) => {
          const active = rating <= displayedValue;

          return (
            <button
              key={rating}
              type="button"
              className={active ? 'star active' : 'star'}
              onMouseEnter={() => interactive && setPreview(rating)}
              onFocus={() => interactive && setPreview(rating)}
              onBlur={() => setPreview(null)}
              onClick={() => onChange?.(rating)}
              disabled={!interactive}
              role={interactive ? 'radio' : undefined}
              aria-checked={interactive ? value === rating : undefined}
              aria-label={`${rating} out of 5`}
              title={`${rating} out of 5`}
            >
              <Star
                size={compact ? 19 : 22}
                fill={active ? 'currentColor' : 'none'}
              />
            </button>
          );
        })}
      </div>

      {showValue ? (
        <span className="star-value" aria-hidden="true">
          {value ? `${value}/5` : 'Not rated'}
        </span>
      ) : null}
    </div>
  );
}
