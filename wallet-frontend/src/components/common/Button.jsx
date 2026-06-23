// src/components/common/Button.jsx
import React from 'react';

export default function Button({ children, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 bg-primary text-white rounded hover:opacity-90 transition ${className}`}
    >
      {children}
    </button>
  );
}
