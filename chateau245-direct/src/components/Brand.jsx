import React from 'react';
import { Link } from 'react-router-dom';
import emblemPng from './images/chateau-nobg.png';
import emblemWebp from './images/chateau-nobg.png';

/* The crest is much wider than the text wordmark it replaced, so it is sized by
   height and given its own height budget per surface. WebP is offered first
   because the source PNG is a 1.5 MB file and the emblem sits on every page.
   The PNG import remains as the fallback for older browsers.

   The emblem is the site link, so it is an anchor rather than a click handler:
   that gives correct middle-click, open-in-new-tab and keyboard behaviour, and
   means every surface navigates home without passing an onHome prop around. */
const Brand = ({ className = '', to = '/' }) => (
  <Link className={`brand-emblem ${className}`.trim()} to={to} aria-label="Chateau 254 home">
    <picture>
      <source srcSet={emblemWebp} type="image/png" />
      <img src={emblemPng} alt="Chateau 254" />
    </picture>
  </Link>
);

export default Brand;
