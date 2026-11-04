/**
 * Live Realm Marquee Strip (<MarqueeStrip />)
 *
 * Implements the continuous horizontal ticker strip named in the prompt & inventory,
 * using DREAM Space tokens (Ink #0A0B0D, Hull #3A3F45, Porcelain #F4F1EA, Signal #FFD21E).
 * Under prefers-reduced-motion: reduce, stops horizontal motion and wraps items cleanly.
 */
import React, { useState } from 'react';
import { color, font, motion } from '../tokens.ts';

export interface MarqueeStripProps {
  items: readonly string[];
  reducedMotion: boolean;
}

export const MarqueeStrip: React.FC<MarqueeStripProps> = ({ items, reducedMotion }) => {
  const [paused, setPaused] = useState(false);

  return (
    <section
      aria-label="DREAM Online Realm Pillars Marquee"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: 'relative',
        zIndex: 2,
        background: color.ink,
        borderTop: `1px solid ${color.hull}`,
        borderBottom: `1px solid ${color.hull}`,
        padding: '16px 24px',
        overflow: 'hidden',
      }}
    >
      <div
        className={reducedMotion ? 'marquee-track-reduced' : 'marquee-track'}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px 24px',
          transition: `opacity ${motion.reveal}ms ${motion.easeOut}`,
          opacity: paused ? 0.95 : 1,
        }}
      >
        {items.map((item, idx) => (
          <span
            key={idx}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 14px',
              background: color.ink,
              border: `1px solid ${idx === 0 ? color.signal : color.hull}`,
              borderRadius: 999,
              fontFamily: font.mono,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '0.03em',
              color: idx === 0 ? color.signal : color.porcelain,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: idx % 2 === 0 ? color.signal : color.porcelain,
              }}
            />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
};
