import { useState } from 'react';

export default function StarRating({ rating, onRate, readonly = false, size = 'md' }) {
  const [hover, setHover] = useState(0);

  return (
    <div className={`star-rating star-rating-${size}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`star-btn ${star <= (hover || rating) ? 'active' : ''}`}
          onClick={() => !readonly && onRate?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
          aria-label={`Rate ${star} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
