import React, { useState } from 'react';
import { getMediaUrl } from '../api/client';

interface AvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  sizeClassName?: string; // e.g. "w-9 h-9", "w-10 h-10", "w-14 h-14"
  shape?: 'rounded-full' | 'rounded-xl' | 'rounded-2xl' | 'rounded-lg';
  badgeColor?: string; // Tailwind background & text color for fallback initials
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = 'M',
  className = '',
  sizeClassName = 'w-9 h-9',
  shape = 'rounded-xl',
  badgeColor = 'bg-blue-50 text-blue-700 border-blue-200',
}) => {
  const [hasError, setHasError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  if (prevSrc !== src) {
    setPrevSrc(src);
    setHasError(false);
  }

  const mediaUrl = src ? getMediaUrl(src) : '';
  const initial = (name || 'M').trim().charAt(0).toUpperCase() || 'M';

  if (mediaUrl && !hasError) {
    return (
      <img
        src={mediaUrl}
        alt=""
        onError={() => setHasError(true)}
        className={`${sizeClassName} ${shape} object-cover border border-slate-200 shadow-2xs shrink-0 ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`${sizeClassName} ${shape} font-bold text-xs flex items-center justify-center shrink-0 border shadow-2xs select-none ${badgeColor} ${className}`}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
};
