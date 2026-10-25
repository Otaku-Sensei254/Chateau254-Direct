import React from 'react';
import { Link } from 'react-router-dom';

const Brand = ({ className = '', to = '/' }) => (
  <Link className={`brand-emblem brand-wordmark ${className}`.trim()} to={to} aria-label="Château254 home">
    <span className="brand-wordmark-text">
      <span className="brand-wordmark-main">Château</span>
      <span className="brand-wordmark-num">254</span>
    </span>
  </Link>
);

export default Brand;
