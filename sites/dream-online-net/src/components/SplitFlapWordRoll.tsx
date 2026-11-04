/**
 * Split-Flap Word Roll Component (<SplitFlapWordRoll />)
 *
 * Implements the mechanical split-flap character board from the inventory.
 * Under prefers-reduced-motion: reduce, disables mechanical flap flipping and
 * transitions cleanly via a 240ms opacity fade.
 */
import React, { useEffect, useState } from 'react';
import { color, font, motion } from '../tokens.ts';
import { getSplitFlapFrame } from '../motion/motionEngine.ts';

export interface SplitFlapWordRollProps {
  phrases: readonly string[];
  reducedMotion: boolean;
  label?: string;
}

export const SplitFlapWordRoll: React.FC<SplitFlapWordRollProps> = ({
  phrases,
  reducedMotion,
  label = 'ACTIVE REALM PILLAR',
}) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      setElapsedMs(0);
      return;
    }
    const start = performance.now();
    const id = window.setInterval(() => {
      if (!document.hidden) {
        setElapsedMs(performance.now() - start);
      }
    }, 120);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const frame = getSplitFlapFrame(phrases, elapsedMs, reducedMotion);

  return (
    <div
      className="split-flap-board"
      aria-label={`${label}: ${frame.phrase}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 8,
        padding: '10px 14px',
        background: color.ink,
        border: `1px solid ${color.hull}`,
        borderRadius: 10,
        maxWidth: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
           justifyContent: 'space-between',
          gap: 12,
          fontFamily: font.mono,
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: color.signal,
        }}
      >
        <span>{label}</span>
        <span style={{ color: color.slate }}>
          0{frame.phraseIndex + 1} / 0{phrases.length}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          opacity: frame.isFlipping ? 0.92 : 1,
          transition: `opacity ${motion.reveal}ms ${motion.easeOut}`,
        }}
      >
        {frame.chars.map((c, idx) => {
          const ch = c.char === ' ' ? '\u00A0' : c.char;
          return (
            <span
              key={idx}
              className="split-flap-tile"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 28,
                height: 38,
                padding: '0 5px',
                background: color.ink,
                border: `1px solid ${c.isAccent ? color.signal : color.hull}`,
                borderRadius: 5,
                fontFamily: font.mono,
                fontSize: 20,
                fontWeight: 600,
                color: c.isAccent ? color.signal : color.porcelain,
                transform:
                  !reducedMotion && frame.isFlipping
                    ? 'translateY(-1px)'
                    : 'translateY(0)',
                transition: `transform ${motion.press}ms ${motion.easeOut}, border-color ${motion.reveal}ms ${motion.easeOut}`,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </div>
  );
};
