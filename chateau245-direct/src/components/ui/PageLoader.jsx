import React from 'react';
import './PageLoader.css';

export default function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader-spinner" />
      <p className="page-loader-text">Loading…</p>
    </div>
  );
}
