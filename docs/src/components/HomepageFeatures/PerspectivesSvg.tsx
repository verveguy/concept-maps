import * as React from 'react';

/**
 * Illustration showing filtered perspectives/viewports on a concept map
 */
export default function PerspectivesSvg(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Background concept map (dimmed) */}
      <g opacity="0.15">
        <circle cx="50" cy="50" r="16" fill="currentColor" />
        <circle cx="150" cy="50" r="16" fill="currentColor" />
        <circle cx="50" cy="150" r="16" fill="currentColor" />
        <circle cx="150" cy="150" r="16" fill="currentColor" />
        <circle cx="100" cy="100" r="16" fill="currentColor" />
        <circle cx="120" cy="70" r="16" fill="currentColor" />
        <circle cx="80" cy="130" r="16" fill="currentColor" />
        
        <line x1="50" y1="50" x2="100" y2="100" stroke="currentColor" strokeWidth="2.5" />
        <line x1="150" y1="50" x2="100" y2="100" stroke="currentColor" strokeWidth="2.5" />
        <line x1="50" y1="150" x2="100" y2="100" stroke="currentColor" strokeWidth="2.5" />
        <line x1="150" y1="150" x2="100" y2="100" stroke="currentColor" strokeWidth="2.5" />
        <line x1="120" y1="70" x2="100" y2="100" stroke="currentColor" strokeWidth="2.5" />
        <line x1="80" y1="130" x2="100" y2="100" stroke="currentColor" strokeWidth="2.5" />
      </g>
      
      {/* Perspective viewport/filter (highlighted section) */}
      <rect
        x="70"
        y="70"
        width="60"
        height="60"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        opacity="0.9"
        rx="6"
      />
      
      {/* Highlighted nodes within perspective */}
      <circle cx="100" cy="100" r="16" fill="currentColor" opacity="1" />
      <circle cx="120" cy="70" r="16" fill="currentColor" opacity="1" />
      <circle cx="80" cy="130" r="16" fill="currentColor" opacity="1" />
      
      {/* Highlighted connections */}
      <line x1="120" y1="70" x2="100" y2="100" stroke="currentColor" strokeWidth="3.5" opacity="1" />
      <line x1="80" y1="130" x2="100" y2="100" stroke="currentColor" strokeWidth="3.5" opacity="1" />
      
      {/* Filter icon - magnifying glass */}
      <circle cx="100" cy="100" r="28" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <circle cx="100" cy="100" r="24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
    </svg>
  );
}

