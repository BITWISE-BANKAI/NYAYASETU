import React from 'react';

export function NeuButton({ children, variant = 'default', className = '', ...props }) {
  const baseClass = 'neu-button';
  const variantClass = variant !== 'default' ? variant : '';
  
  return (
    <button className={`${baseClass} ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
