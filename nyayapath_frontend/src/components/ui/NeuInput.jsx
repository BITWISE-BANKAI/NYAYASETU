import React from 'react';

export function NeuInput({ className = '', ...props }) {
  return (
    <input className={`neu-input ${className}`.trim()} {...props} />
  );
}

export function NeuTextArea({ className = '', ...props }) {
  return (
    <textarea className={`neu-textarea ${className}`.trim()} rows={6} {...props} />
  );
}
