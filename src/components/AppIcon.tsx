'use client';

interface AppIconProps {
  size?: number;
  className?: string;
}

export function AppIcon({ size = 32, className = '' }: AppIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="swipetax-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3B82F6' }} />
          <stop offset="100%" style={{ stopColor: '#10B981' }} />
        </linearGradient>
      </defs>
      {/* Background */}
      <rect width="32" height="32" rx="7" fill="url(#swipetax-bg)" />
      {/* Document lines */}
      <rect x="8" y="7" width="12" height="2" rx="1" fill="white" opacity="0.9" />
      <rect x="8" y="12" width="10" height="2" rx="1" fill="white" opacity="0.7" />
      <rect x="8" y="17" width="8" height="2" rx="1" fill="white" opacity="0.5" />
      {/* Swipe arrow */}
      <path
        d="M18 22 L24 22 M22 19 L25 22 L22 25"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Checkmark */}
      <path
        d="M6 24 L9 27 L14 20"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default AppIcon;
