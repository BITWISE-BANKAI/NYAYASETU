import React from 'react';

const icons = {
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Zm0 15A2.5 2.5 0 0 1 6.5 18H20M8 7h8" />,
  briefcase: <path d="M9 7V5h6v2m-11 0h16v12H4V7Zm0 5h16M9 12v2h6v-2" />,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  document: <path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h6" />,
  home: <path d="m3 11 9-8 9 8v10h-6v-6H9v6H3V11Z" />,
  lock: <path d="M6 10h12v10H6V10Zm3 0V7a3 3 0 0 1 6 0v3" />,
  message: <path d="M4 4h16v13H8l-4 4V4Zm4 5h8m-8 4h5" />,
  moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
  paperclip: <path d="m9 12 5-5a3 3 0 0 1 4 4l-7 7a5 5 0 0 1-7-7l7-7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  scale: <path d="M12 3v18M6 6h12M4 6 1 12h6L4 6Zm16 0-3 6h6l-3-6ZM7 21h10" />,
  send: <path d="m3 4 18 8-18 8 3-8-3-8Zm3 8h15" />,
  shield: <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Zm-3 9 2 2 4-5" />,
  spark: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  gavel: <path d="m14 13-7.5 7.5a2.12 2.12 0 1 1-3-3L11 10m5 6 6-6a3 3 0 0 0-4.24-4.24l-6 6M8 8l8 8" />,
  externalLink: <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6m4-3h6v6m-11 5L21 3" />
};

export function FigmaIcon({ name, size = 20, className = '' }) {
  const iconContent = icons[name] || icons.document;
  return (
    <svg 
      aria-hidden="true" 
      className={`icon ${className}`.trim()} 
      fill="none" 
      height={size} 
      viewBox="0 0 24 24" 
      width={size}
    >
      {iconContent}
    </svg>
  );
}
