/**
 * 0B — Persistent Bottom-Right Sticky CTA
 * 0C — Fixed Bottom-Center 14-Step Segmented Chapter Scrubber (5 Groups, 14 Steps)
 *
 * Matches docs/house/SITE-BRIEF-dream-online-net.md §3 Rows 0B & 0C.
 * Active pills fill in Signal yellow (#FFD21E) with bold Ink (#0A0B0D) text (13.8:1 contrast).
 * Inactive pills sit on solid Ink (#0A0B0D) with Porcelain (#F4F1EA) text (17.5:1 contrast).
 * Both hand off cleanly at Section 22 (STEP INTO THE DREAM).
 */
import React, { useState } from 'react';
import { color, font, motion, radius } from '../tokens.ts';
import { BRAND_META, CHAPTER_GROUPS } from '../data/siteContent.ts';
import { ArrowUpRightIcon } from './Icons.tsx';

export interface ChapterScrubberProps {
  activeSection: number;
  activeGroupId: string;
  activeStepId: string;
  visible: boolean;
  onJumpToSection: (sectionIndex: number) => void;
}

export const ChapterScrubber: React.FC<ChapterScrubberProps> = ({
  activeSection,
  activeGroupId,
  activeStepId,
  visible,
  onJumpToSection,
}) => {
  const [ctaHovered, setCtaHovered] = useState(false);

  if (!visible) return null;

  return (
    <>
      {/* 0C — Bottom-Center 14-Step Segmented Chapter Scrubber */}
      <nav
        aria-label="14-Step Realm Chapter Scrubber"
        className="chapter-scrubber"
        style={{
          position: 'fixed',
          bottom: 16,
          left: 24,
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: color.ink,
          border: `1px solid ${color.hull}`,
          borderRadius: radius.card,
          maxWidth: 'calc(100vw - 48px)',
          overflowX: 'auto',
          transition: `opacity ${motion.reveal}ms ${motion.easeOut}`,
        }}
      >
        {CHAPTER_GROUPS.map((group) => {
          const isGroupActive = group.id === activeGroupId;
          return (
            <div
              key={group.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                paddingRight: 6,
                borderRight: `1px solid ${color.hull}`,
              }}
            >
              <span
                className="scrubber-group-label"
                style={{
                  fontFamily: font.mono,
                  fontSize: 16,
                  fontWeight: 600,
                  color: isGroupActive ? color.signal : color.slate,
                  padding: '0 6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {group.index} {group.title}
              </span>
              {group.steps.map((step) => {
                const isStepActive =
                  step.id === activeStepId || step.sectionIndex === activeSection;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => onJumpToSection(step.sectionIndex)}
                    aria-current={isStepActive ? 'step' : undefined}
                    title={`${group.title}: ${step.label}`}
                    style={{
                      minHeight: 44,
                      minWidth: 44,
                      padding: isGroupActive || isStepActive ? '0 12px' : '0 10px',
                      borderRadius: 8,
                      border: `1px solid ${isStepActive ? color.signal : color.hull}`,
                      background: isStepActive ? color.signal : color.ink,
                      color: isStepActive ? color.ink : color.porcelain,
                      fontFamily: font.text,
                      fontSize: 16,
                      fontWeight: isStepActive ? 700 : 600,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: `background-color ${motion.press}ms ${motion.easeOut}`,
                    }}
                  >
                    {isGroupActive || isStepActive ? step.label : step.sectionIndex}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* 0B — Persistent Bottom-Right Sticky CTA */}
      <a
        href="#section-20-first-15-min"
        className="sticky-corner-cta"
        onMouseEnter={() => setCtaHovered(true)}
        onMouseLeave={() => setCtaHovered(false)}
        onClick={(e) => {
          e.preventDefault();
          onJumpToSection(20);
        }}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 24,
          zIndex: 95,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 52,
          padding: '4px 6px 4px 16px',
          background: color.ink,
          border: `1px solid ${ctaHovered ? color.signal : color.hull}`,
          borderRadius: radius.button,
          color: color.porcelain,
          fontFamily: font.text,
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: '0.02em',
          textDecoration: 'none',
          transition: `border-color ${motion.press}ms ${motion.easeOut}`,
        }}
      >
        <span>{BRAND_META.stickyCtaLabel}</span>
        <span
          style={{
            width: 44,
            height: 44,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            border: `1px solid ${ctaHovered ? color.signal : color.hull}`,
            background: ctaHovered ? color.signal : color.ink,
            transition: `background-color ${motion.press}ms ${motion.easeOut}`,
          }}
        >
          <ArrowUpRightIcon size={18} stroke={ctaHovered ? color.ink : color.porcelain} />
        </span>
      </a>
    </>
  );
};
