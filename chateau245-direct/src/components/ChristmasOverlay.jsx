import React, { useState, useMemo } from 'react';
import XmasTree from './images/XmasTree.png';
import redRibbon from './images/redRibbon.png';
import greenRibbon from './images/ribbongreen.png';
import fallingSnow from './images/fallingSnow.png';
import snowfall from './images/snowfall.png';

/**
 * High-performance, non-blocking festive Christmas overlay.
 * Keeps the dark luxury background while adding:
 * - Green, red, and yellow flashing string lights across the top
 * - Dual-layer drifting snowfall using fallingSnow.png & snowfall.png
 * - Floating falling snowflakes with gentle swaying physics
 * - Seasonal corner ribbons (redRibbon & ribbongreen)
 * - Decorated Christmas tree accent in the bottom corner
 */
const ChristmasOverlay = () => {
  const [treeVisible, setTreeVisible] = useState(true);
  const [treeGreeting, setTreeGreeting] = useState(false);

  // Generate 15 well-spaced string light bulbs alternating red, green, yellow
  const bulbs = useMemo(() => {
    const colors = ['red', 'green', 'yellow'];
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      color: colors[i % 3],
    }));
  }, []);

  // Generate 20 falling snowflake particles with varied speeds, drifts, and delays
  const snowflakes = useMemo(() => {
    return Array.from({ length: 22 }, (_, i) => {
      const left = (i * 4.7 + (i % 3) * 2) % 98;
      const duration = 7 + (i % 6) * 1.5; // 7s to 14.5s
      const delay = -(i * 0.7); // staggered start so snow is immediately falling
      const size = 10 + (i % 5) * 3; // 10px to 22px
      const opacity = 0.35 + (i % 4) * 0.12; // 0.35 to 0.71
      const drift = (i % 2 === 0 ? 1 : -1) * (20 + (i % 4) * 15); // -55px to 55px horizontal drift
      return { id: i, left, duration, delay, size, opacity, drift };
    });
  }, []);

  return (
    <>
      {/* 1. Flashing String Lights across the top */}
      <div className="christmas-lights-bar" aria-hidden="true">
        {bulbs.map((b) => (
          <div key={b.id} className="christmas-bulb-node">
            <div className="christmas-bulb-cap" />
            <div className={`christmas-bulb ${b.color}`} />
          </div>
        ))}
      </div>

      {/* 2. Falling Snow Overlay (multi-layered drift + individual snowflakes) */}
      <div className="christmas-snow-overlay" aria-hidden="true">
        {/* Layer 1: continuous background snowfall drift */}
        <div
          className="christmas-snow-drift-layer1"
          style={{ backgroundImage: `url(${snowfall})` }}
        />
        {/* Layer 2: secondary background falling snow drift with sway */}
        <div
          className="christmas-snow-drift-layer2"
          style={{ backgroundImage: `url(${fallingSnow})` }}
        />

        {/* Individual swaying falling snowflake crystals */}
        {snowflakes.map((s) => (
          <span
            key={s.id}
            className="christmas-snowflake"
            style={{
              left: `${s.left}%`,
              fontSize: `${s.size}px`,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
              '--snow-opacity': s.opacity,
              '--snow-drift': `${s.drift}px`,
            }}
          >
            ❄
          </span>
        ))}
      </div>

      {/* 3. Corner Holiday Ribbons */}
      <img
        src={greenRibbon}
        alt="Holiday ribbon"
        className="christmas-ribbon-left"
        aria-hidden="true"
      />
      <img
        src={redRibbon}
        alt="Holiday ribbon"
        className="christmas-ribbon-right"
        aria-hidden="true"
      />

      {/* 4. Christmas Tree Corner Accent */}
      {treeVisible && (
        <aside
          className="christmas-tree-widget"
          onClick={() => setTreeGreeting((prev) => !prev)}
          title="Click to toggle Christmas greeting!"
          aria-label="Christmas tree festive accent"
        >
          <button
            type="button"
            className="christmas-tree-close"
            onClick={(e) => {
              e.stopPropagation();
              setTreeVisible(false);
            }}
            title="Dismiss festive tree"
            aria-label="Dismiss festive tree"
          >
            ×
          </button>
          <img
            src={XmasTree}
            alt="Decorated Christmas tree"
            className="christmas-tree-img"
          />
          <span className="christmas-tree-badge">
            {treeGreeting ? '🎄 Merry Christmas! 🍷' : 'Holiday Cheers'}
          </span>
        </aside>
      )}
    </>
  );
};

export default React.memo(ChristmasOverlay);
