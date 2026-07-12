/**
 * Eva Avatar Component
 * Displays Eva's character image
 */

import evaImage from '@/assets/eva-avatar.jpg';

interface Props {
  size?: number;
  className?: string;
}

export function EvaAvatar({ size = 32, className = '' }: Props) {
  return (
    <img
      src={evaImage}
      alt="Eva"
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}
