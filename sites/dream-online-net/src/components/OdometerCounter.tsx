/**
 * Odometer Counter Component (<OdometerCounter />)
 *
 * Implements rolling digit counters for Section 21 (60 FPS Technical Promise)
 * and Section 23 (The World by the Numbers).
 * Renders only the active digit per cell so DOM text-run scanners never hit
 * clipped off-screen numbers. Under reduced motion, fades in at full value.
 */
import React from 'react';
import { color, font, motion } from '../tokens.ts';
import { getOdometerDigits } from '../motion/motionEngine.ts';

export interface OdometerCounterProps {
  value: string;
  progress?: number;
  reducedMotion: boolean;
  accent?: boolean;
  sizePx?: number;
}

export const OdometerCounter: React.FC<OdometerCounterProps> = ({
  value,
  progress = 1,
  reducedMotion,
  accent = false,
  sizePx = 56,
}) => {
  const cells = getOdometerDigits(value, progress, reducedMotion);

  return (
    <span
      className="odometer-counter"
      aria-label={value}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 3,
        fontFamily: font.display,
        fontSize: sizePx,
        fontWeight: 700,
        lineHeight: 1.05,
        letterSpacing: '-0.03em',
        color: accent ? color.signal : color.porcelain,
        transition: `opacity ${motion.reveal}ms ${motion.easeOut}`,
      }}
    >
      {cells.map((cell, idx) => (
        <span
          key={idx}
          className={cell.isDigit ? 'odometer-digit-cell' : 'odometer-char-cell'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: cell.isDigit ? '2px 6px' : '0 2px',
            background: cell.isDigit ? color.ink : 'transparent',
            border: cell.isDigit ? `1px solid ${accent ? color.signal : color.hull}` : 'none',
            borderRadius: cell.isDigit ? 8 : 0,
            color: accent ? color.signal : color.porcelain,
          }}
        >
          {cell.isDigit ? String(cell.currentDigit) : cell.char}
        </span>
      ))}
    </span>
  );
};
