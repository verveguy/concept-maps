import * as React from 'react';

/**
 * Illustration showing real-time collaboration on a concept map
 */
export default function CollaborationSvg(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Concept map nodes */}
      <circle cx="60" cy="60" r="18" fill="currentColor" opacity="0.9" />
      <circle cx="140" cy="60" r="18" fill="currentColor" opacity="0.9" />
      <circle cx="60" cy="140" r="18" fill="currentColor" opacity="0.9" />
      <circle cx="140" cy="140" r="18" fill="currentColor" opacity="0.9" />
      <circle cx="100" cy="100" r="20" fill="currentColor" opacity="1" />
      
      {/* Connections */}
      <line x1="60" y1="60" x2="100" y2="100" stroke="currentColor" strokeWidth="2.5" opacity="0.7" />
      <line x1="140" y1="60" x2="100" y2="100" stroke="currentColor" strokeWidth="2.5" opacity="0.7" />
      <line x1="60" y1="140" x2="100" y2="100" stroke="currentColor" strokeWidth="2.5" opacity="0.7" />
      <line x1="140" y1="140" x2="100" y2="100" stroke="currentColor" strokeWidth="2.5" opacity="0.7" />
      
      {/* User cursors/avatars with connection lines */}
      <circle cx="45" cy="45" r="7" fill="#10b981" />
      <line x1="45" y1="45" x2="60" y2="60" stroke="#10b981" strokeWidth="1.5" opacity="0.5" strokeDasharray="2 2" />
      
      <circle cx="155" cy="55" r="7" fill="#3b82f6" />
      <line x1="155" y1="55" x2="140" y2="60" stroke="#3b82f6" strokeWidth="1.5" opacity="0.5" strokeDasharray="2 2" />
      
      <circle cx="50" cy="155" r="7" fill="#f59e0b" />
      <line x1="50" y1="155" x2="60" y2="140" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5" strokeDasharray="2 2" />
      
      {/* Pulse effect for real-time updates */}
      <circle cx="100" cy="100" r="25" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <circle cx="100" cy="100" r="32" stroke="currentColor" strokeWidth="2" opacity="0.1" />
    </svg>
  );
}

