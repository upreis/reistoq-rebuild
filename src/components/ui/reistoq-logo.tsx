import React from "react";

interface ReistoqLogoProps {
  className?: string;
  size?: number;
}

export function ReistoqLogo({ className, size = 24 }: ReistoqLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Crown */}
      <path
        d="M50 10L35 30H65L50 10Z"
        fill="currentColor"
        className="text-accent"
      />
      <circle cx="35" cy="25" r="4" fill="currentColor" className="text-accent" />
      <circle cx="50" cy="15" r="4" fill="currentColor" className="text-accent" />
      <circle cx="65" cy="25" r="4" fill="currentColor" className="text-accent" />
      
      {/* Box */}
      <path
        d="M30 45L50 35L70 45V75L50 85L30 75V45Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-primary"
      />
      <path
        d="M30 45L50 55L70 45"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-primary"
      />
      <path
        d="M50 55V85"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-primary"
      />
      
      {/* Box faces */}
      <path
        d="M30 45L50 55L50 35L30 45Z"
        fill="currentColor"
        className="text-card opacity-90"
      />
      <path
        d="M50 55L70 45L50 35L50 55Z"
        fill="currentColor"
        className="text-card opacity-60"
      />
    </svg>
  );
}