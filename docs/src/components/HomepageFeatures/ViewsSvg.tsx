import * as React from 'react';

/**
 * Illustration showing visual graph and text views side by side
 */
export default function ViewsSvg(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Visual graph view (left side) */}
      <g opacity="0.9">
        <circle cx="50" cy="50" r="13" fill="currentColor" />
        <circle cx="50" cy="100" r="13" fill="currentColor" />
        <circle cx="50" cy="150" r="13" fill="currentColor" />
        <line x1="50" y1="50" x2="50" y2="100" stroke="currentColor" strokeWidth="2.5" />
        <line x1="50" y1="100" x2="50" y2="150" stroke="currentColor" strokeWidth="2.5" />
        
        {/* Node labels */}
        <text x="50" y="50" fontSize="8" fill="currentColor" opacity="0.6" textAnchor="middle" dy="20">A</text>
        <text x="50" y="100" fontSize="8" fill="currentColor" opacity="0.6" textAnchor="middle" dy="20">B</text>
        <text x="50" y="150" fontSize="8" fill="currentColor" opacity="0.6" textAnchor="middle" dy="20">C</text>
      </g>
      
      {/* Divider */}
      <line x1="100" y1="40" x2="100" y2="160" stroke="currentColor" strokeWidth="2" opacity="0.3" strokeDasharray="4 4" />
      
      {/* Text view (right side) */}
      <g opacity="0.9">
        {/* Text lines representing structured view */}
        <rect x="120" y="45" width="65" height="5" rx="2" fill="currentColor" />
        <rect x="120" y="60" width="50" height="5" rx="2" fill="currentColor" />
        <rect x="120" y="75" width="55" height="5" rx="2" fill="currentColor" />
        
        <rect x="120" y="95" width="65" height="5" rx="2" fill="currentColor" />
        <rect x="120" y="110" width="45" height="5" rx="2" fill="currentColor" />
        <rect x="120" y="125" width="50" height="5" rx="2" fill="currentColor" />
        
        <rect x="120" y="145" width="65" height="5" rx="2" fill="currentColor" />
        <rect x="120" y="160" width="40" height="5" rx="2" fill="currentColor" />
      </g>
      
      {/* Arrows indicating switchable views */}
      <path
        d="M 85 100 L 95 95 L 95 100 L 105 100 L 95 100 L 95 105 Z"
        fill="currentColor"
        opacity="0.6"
      />
      <path
        d="M 115 100 L 105 95 L 105 100 L 95 100 L 105 100 L 105 105 Z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}

