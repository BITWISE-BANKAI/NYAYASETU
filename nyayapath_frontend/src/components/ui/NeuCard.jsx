import React from 'react';

export function NeuCard({ children, inset = false, className = '', ...props }) {
  const baseClass = inset ? 'neu-inset' : 'neu-raised';
  return (
    <div className={`${baseClass} ${className}`.trim()} style={{ padding: '24px' }} {...props}>
      {children}
    </div>
  );
}
