/**
 * 0A — Fixed Top Bar (header.page_header + 3-column overview mega-menu drawer)
 *
 * Matches docs/house/SITE-BRIEF-dream-online-net.md §3 Row 0A and docs/house/DESIGN-SYSTEM.md:
 * - Sticky glass over Ink, 1px solid #3A3F45 Hull border.
 * - Left: DREAM ONLINE wordmark.
 * - Center: World, Combat, Life Skills, Living NPCs, First 15 Minutes (active section underlined in Signal yellow).
 * - Right: live server badge (REALM ONLINE · 23:06 ET), Playable Promise outlined button, Enter DREAM primary Signal button.
 */
import React, { useState } from 'react';
import { color, font, motion, radius } from '../tokens.ts';
import { BRAND_META } from '../data/siteContent.ts';
import { SupEmblem } from './Icons.tsx';

export interface TopHeaderProps {
  activeGroupId: string;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  onJumpToSection: (sectionIndex: number) => void;
}

const NAV_LINKS = [
  { id: 'world', label: 'World', sectionIndex: 2 },
  { id: 'combat', label: 'Combat', sectionIndex: 6 },
  { id: 'life-economy', label: 'Life Skills', sectionIndex: 10 },
  { id: 'living-npcs', label: 'Living NPCs', sectionIndex: 15 },
  { id: 'first-slice', label: 'First 15 Minutes', sectionIndex: 20, opensDrawer: true },
] as const;

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeGroupId,
  reducedMotion,
  onToggleReducedMotion,
  onJumpToSection,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header
      className="top-header"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: color.ink,
        borderBottom: `1px solid ${color.hull}`,
      }}
    >
      <div
        className="top-header-inner"
        style={{
          maxWidth: 1840,
          margin: '0 auto',
          minHeight: 68,
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Brand Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <a
            href="#section-1-hero"
            onClick={(e) => {
              e.preventDefault();
              onJumpToSection(1);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              minHeight: 44,
              textDecoration: 'none',
              color: color.porcelain,
              fontFamily: font.display,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            <SupEmblem size={32} />
            <span>{BRAND_META.title}</span>
          </a>
        </div>

        {/* Center: Pillar Navigation Links (Active Section Underlined in Signal Yellow) */}
        <nav
          aria-label="Primary Realm Sections"
          className="desktop-only-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {NAV_LINKS.map((item) => {
            const isActive =
              activeGroupId === item.id ||
              (item.id === 'combat' && activeGroupId === 'world');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if ('opensDrawer' in item && item.opensDrawer) {
                    setDrawerOpen((prev) => !prev);
                  }
                  onJumpToSection(item.sectionIndex);
                }}
                aria-expanded={'opensDrawer' in item ? drawerOpen : undefined}
                style={{
                  minHeight: 44,
                  padding: '0 14px',
                  background: color.ink,
                  border: 'none',
                  borderBottom: isActive ? `3px solid ${color.signal}` : `3px solid transparent`,
                  color: isActive ? color.porcelain : color.fog,
                  fontFamily: font.text,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: `border-color ${motion.press}ms ${motion.easeOut}, color ${motion.press}ms ${motion.easeOut}`,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Live Server Pill, Motion Toggle, Outlined Playable Promise, Primary Enter DREAM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="desktop-only-pill"
            aria-label="Live Realm Server Status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 38,
              padding: '0 14px',
              borderRadius: radius.pill,
              border: `1px solid ${color.hull}`,
              background: color.ink,
              color: color.porcelain,
              fontFamily: font.mono,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: radius.pill,
                background: color.statusGreen,
              }}
            />
            <span>{BRAND_META.serverProbeLabel}</span>
          </div>

          <button
            type="button"
            className="desktop-only-pill"
            onClick={onToggleReducedMotion}
            aria-pressed={reducedMotion}
            style={{
              minHeight: 44,
              padding: '0 14px',
              borderRadius: radius.button,
              border: `1px solid ${color.slate}`,
              background: color.ink,
              color: color.porcelain,
              fontFamily: font.text,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {reducedMotion ? 'Motion: Fade Only' : 'Motion: Full'}
          </button>

          <a
            href="#section-21-technical-promise"
            className="desktop-only-pill"
            onClick={(e) => {
              e.preventDefault();
              onJumpToSection(21);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              padding: '0 16px',
              borderRadius: radius.button,
              border: `1px solid ${color.slate}`,
              background: color.ink,
              color: color.porcelain,
              fontFamily: font.text,
              fontSize: 16,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Playable Promise
          </a>

          <a
            href="#section-20-first-15-min"
            onClick={(e) => {
              e.preventDefault();
              onJumpToSection(20);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              padding: '0 18px',
              borderRadius: radius.button,
              border: `1px solid ${color.signal}`,
              background: color.signal,
              color: color.ink,
              fontFamily: font.text,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Enter DREAM
          </a>
        </div>
      </div>

      {/* 3-Column Overview Mega-Menu Drawer */}
      {drawerOpen && (
        <div
          role="region"
          aria-label="First 15 Minutes & Realm Systems Overview"
          style={{
            background: color.ink,
            borderTop: `1px solid ${color.hull}`,
            borderBottom: `1px solid ${color.hull}`,
            padding: '24px',
            transition: `opacity ${motion.reveal}ms ${motion.easeOut}`,
          }}
        >
          <div
            style={{
              maxWidth: 1600,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 24,
            }}
          >
            <div style={{ borderRight: `1px solid ${color.hull}`, paddingRight: 20 }}>
              <div style={{ color: color.signal, fontFamily: font.mono, fontSize: 16, fontWeight: 600 }}>
                01 / THE SHARED REALM
              </div>
              <p style={{ color: color.porcelain, fontSize: 20, margin: '8px 0' }}>
                One unsharded horizon that transforms from Old World Day Dreams into a Nightfall Neon Metropolis.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onJumpToSection(4);
                }}
                style={{
                  minHeight: 44,
                  padding: '0 14px',
                  borderRadius: radius.button,
                  border: `1px solid ${color.slate}`,
                  background: color.ink,
                  color: color.porcelain,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Inspect Day & Night Cycle
              </button>
            </div>

            <div style={{ borderRight: `1px solid ${color.hull}`, paddingRight: 20 }}>
              <div style={{ color: color.signal, fontFamily: font.mono, fontSize: 16, fontWeight: 600 }}>
                02 / COMBAT & 10 LIFE SKILLS
              </div>
              <p style={{ color: color.porcelain, fontSize: 20, margin: '8px 0' }}>
                Five starter action paths, Level 45 Awakenings, pooled party damage, and ten interlocking crafts.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onJumpToSection(6);
                }}
                style={{
                  minHeight: 44,
                  padding: '0 14px',
                  borderRadius: radius.button,
                  border: `1px solid ${color.slate}`,
                  background: color.ink,
                  color: color.porcelain,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Open Discipline Selector
              </button>
            </div>

            <div>
              <div style={{ color: color.signal, fontFamily: font.mono, fontSize: 16, fontWeight: 600 }}>
                03 / FIRST 15-MINUTE SLICE
              </div>
              <p style={{ color: color.porcelain, fontSize: 20, margin: '8px 0' }}>
                Spawn at camp with Sup@, master stamina combat, gather resources, and meet Mireth & Captain Varen.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onJumpToSection(20);
                }}
                style={{
                  minHeight: 44,
                  padding: '0 14px',
                  borderRadius: radius.button,
                  border: `1px solid ${color.signal}`,
                  background: color.signal,
                  color: color.ink,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Jump to 15-Min Walkthrough
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
