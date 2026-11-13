/**
 * dream-online.net v1 — Main Application
 *
 * Implements the complete 25-section DREAM Space translation from:
 * - docs/house/DESIGN-SYSTEM.md
 * - docs/house/SITE-BRIEF-dream-online-net.md
 * - docs/house/SITE-INVENTORY-2026-11.md
 *
 * Features:
 * - Pinned 3D Dot-Sphere Globe + Sup@ Counter-Rotating Rings + <2% CPU Starfield
 * - Scroll-driven word-by-word TextReveal, LineClipReveal, and TwoSteps split
 * - Split-flap word roll (<SplitFlapWordRoll />)
 * - Odometer digit counters (<OdometerCounter />)
 * - Marquee strip (<MarqueeStrip />)
 * - Interactive 2-tab x 5-card Combat Path & Level 45 Awakening selector
 * - Interactive 10-skill Living Economy explorer
 * - Live Realm Telemetry HUD panel with leader line into the 3D stage
 * - Interactive 5-stop First 15-Minute Journey scrubber
 * - Interactive Daytime Plaza / Nightfall Frontier technical promise switcher
 * - 6x2 Canon Showcase & Hall of Craft grid ending in YOU?
 * - Full keyboard navigation (ArrowDown/ArrowUp/PageDown/PageUp) and reduced-motion fade mode
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { color, font, motion, radius } from './tokens.ts';
import {
  BRAND_META,
  CHAPTER_GROUPS,
  COMBAT_TABS,
  FIRST_15_MIN_STOPS,
  FOOTER_COLUMNS,
  LIFE_SKILLS,
  MARQUEE_ITEMS,
  NUMBERS_COUNTERS,
  PROMISE_LIGHTING_MODES,
  SHOWCASE_CELLS,
  SPATIAL_SECTIONS,
  TELEMETRY_HUD_ROWS,
} from './data/siteContent.ts';
import { getWordRevealState } from './motion/motionEngine.ts';
import { DreamStageCanvas } from './components/DreamStageCanvas.tsx';
import { TopHeader } from './components/TopHeader.tsx';
import { ChapterScrubber } from './components/ChapterScrubber.tsx';
import { SplitFlapWordRoll } from './components/SplitFlapWordRoll.tsx';
import { OdometerCounter } from './components/OdometerCounter.tsx';
import { MarqueeStrip } from './components/MarqueeStrip.tsx';
import {
  ArrowUpRightIcon,
  DisciplineIcon,
  FooterHorizonWave,
  RealmSceneArtwork,
  ShowcaseEmblem,
  SupEmblem,
} from './components/Icons.tsx';

export const App: React.FC = () => {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(1);
  const [combatTabId, setCombatTabId] = useState<'starter' | 'awakening'>('starter');
  const [selectedCardId, setSelectedCardId] = useState<string>('blade');
  const [selectedSkillIdx, setSelectedSkillIdx] = useState<number>(0);
  const [journeyStopIdx, setJourneyStopIdx] = useState<number>(0);
  const [lightingMode, setLightingMode] = useState<'day' | 'night'>('day');
  const [dispatchEmail, setDispatchEmail] = useState('');
  const [dispatchSubscribed, setDispatchSubscribed] = useState(false);

  const spatialTrackRef = useRef<HTMLDivElement | null>(null);

  // Sync with OS prefers-reduced-motion changes
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Scroll listener computing spatial track progress and active section (1..22)
  useEffect(() => {
    const onScroll = () => {
      const track = spatialTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const totalScrollable = Math.max(1, track.offsetHeight - window.innerHeight);
      const scrolled = Math.max(0, -rect.top);
      const prog = Math.max(0, Math.min(1, scrolled / totalScrollable));
      setScrollProgress(prog);

      // Determine active spatial section from viewport center
      const sections = track.querySelectorAll<HTMLElement>('[data-section-index]');
      const midY = window.innerHeight * 0.45;
      let current = 1;
      sections.forEach((sec) => {
        const sr = sec.getBoundingClientRect();
        if (sr.top <= midY) {
          current = Number(sec.dataset.sectionIndex) || current;
        }
      });
      if (scrolled > totalScrollable + window.innerHeight * 0.3) {
        current = 23;
      }
      setActiveSection(current);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const jumpToSection = useCallback(
    (sectionIndex: number) => {
      const clamped = Math.max(1, Math.min(25, sectionIndex));
      const el = document.querySelector<HTMLElement>(`[data-section-index="${clamped}"]`);
      if (el) {
        el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
        setActiveSection(clamped);
      }
    },
    [reducedMotion],
  );

  // Keyboard ArrowDown/ArrowUp/PageDown/PageUp navigation across the 25 sections
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'PageDown' || (e.key === 'ArrowDown' && e.altKey)) {
        e.preventDefault();
        jumpToSection(activeSection + 1);
      } else if (e.key === 'PageUp' || (e.key === 'ArrowUp' && e.altKey)) {
        e.preventDefault();
        jumpToSection(activeSection - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSection, jumpToSection]);

  const currentSecMeta =
    SPATIAL_SECTIONS.find((s) => s.index === activeSection) ?? SPATIAL_SECTIONS[0];
  const activeGroupId = currentSecMeta.groupId ?? 'world';
  const activeStepId = currentSecMeta.stepId ?? 'seamless';

  const activeCombatTab = COMBAT_TABS.find((t) => t.id === combatTabId) ?? COMBAT_TABS[0];
  const activeCombatCard =
    activeCombatTab.cards.find((c) => c.id === selectedCardId) ?? activeCombatTab.cards[0];
  const activeSkill = LIFE_SKILLS[selectedSkillIdx] ?? LIFE_SKILLS[0];
  const activeJourneyStop = FIRST_15_MIN_STOPS[journeyStopIdx] ?? FIRST_15_MIN_STOPS[0];
  const activePromiseMode =
    PROMISE_LIGHTING_MODES.find((m) => m.id === lightingMode) ?? PROMISE_LIGHTING_MODES[0];

  const stageVisible = activeSection <= 22;
  const scrubberVisible = activeSection < 22;

  return (
    <div style={{ minHeight: '100vh', background: color.ink, color: color.porcelain }}>
      {/* Pinned 3D Dot-Sphere Globe + Sup@ Rings + <2% CPU Starfield Stage */}
      <DreamStageCanvas
        scrollProgress={scrollProgress}
        activeSection={activeSection}
        selectedDiscipline={activeCombatCard.shape}
        dayNightMode={lightingMode}
        reducedMotion={reducedMotion}
        visible={stageVisible}
      />

      {/* 0A — Fixed Top Header Bar */}
      <TopHeader
        activeGroupId={activeGroupId}
        reducedMotion={reducedMotion}
        onToggleReducedMotion={() => setReducedMotion((prev) => !prev)}
        onJumpToSection={jumpToSection}
      />

      {/* 0B & 0C — Bottom 14-Step Chapter Scrubber & Sticky Corner CTA */}
      <ChapterScrubber
        activeSection={activeSection}
        activeGroupId={activeGroupId}
        activeStepId={activeStepId}
        visible={scrubberVisible}
        onJumpToSection={jumpToSection}
      />

      {/* SPATIAL SCROLL TRACK (Sections 1–22) */}
      <main ref={spatialTrackRef} style={{ position: 'relative', zIndex: 2 }}>
        {SPATIAL_SECTIONS.map((sec) => {
          const words = sec.headline.split(/\s+/);
          const wordTokens = getWordRevealState(words, 1, reducedMotion);

          return (
            <section
              key={sec.id}
              id={sec.id}
              data-section-index={sec.index}
              className="spatial-section"
              style={{
                minHeight: `${sec.svh}svh`,
                padding: '104px 64px 124px 64px',
                maxWidth: 1840,
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                borderBottom: `1px solid ${color.hull}`,
              }}
            >
              {/* SECTION 1 — HERO */}
              {sec.kind === 'hero' && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(300px, 900px) 1fr',
                    gap: 32,
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      background: color.ink,
                      border: `1px solid ${color.hull}`,
                      borderLeft: `3px solid ${color.signal}`,
                      borderRadius: radius.card,
                      padding: '28px 32px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 18,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <p className="section-kicker" style={{ textTransform: 'none' }}>
                        {BRAND_META.heroKicker}
                      </p>
                    </div>

                    <h1 className="hero-h1">
                      {BRAND_META.heroLines[0]}
                      <br />
                      <span style={{ color: color.signal }}>{BRAND_META.heroLines[1]}</span>
                    </h1>

                    <p className="body-copy" style={{ color: color.porcelain }}>
                      {BRAND_META.heroSubhead}
                    </p>

                    <SplitFlapWordRoll
                      phrases={BRAND_META.splitFlapPhrases}
                      reducedMotion={reducedMotion}
                    />

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 14,
                        paddingTop: 6,
                      }}
                    >
                      <a
                        href="#section-20-first-15-min"
                        onClick={(e) => {
                          e.preventDefault();
                          jumpToSection(20);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10,
                          minHeight: 48,
                          padding: '0 24px',
                          borderRadius: radius.button,
                          border: `1px solid ${color.signal}`,
                          background: color.signal,
                          color: color.ink,
                          fontFamily: font.text,
                          fontSize: 20,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        <span>{BRAND_META.primaryCtaLabel}</span>
                        <ArrowUpRightIcon size={18} stroke={color.ink} />
                      </a>

                      <a
                        href="#section-6-combat-selector"
                        onClick={(e) => {
                          e.preventDefault();
                          jumpToSection(6);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          minHeight: 48,
                          padding: '0 20px',
                          borderRadius: radius.button,
                          border: `1px solid ${color.slate}`,
                          background: color.ink,
                          color: color.porcelain,
                          fontFamily: font.text,
                          fontSize: 20,
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        EXPLORE THE 14 SYSTEMS
                      </a>
                    </div>
                  </div>

                  {/* Right HUD Callout framing the 3D Dot-Sphere & Sup@ Rings */}
                  <div
                    className="hero-right-hud"
                    style={{
                      justifySelf: 'end',
                      alignSelf: 'end',
                      background: color.ink,
                      border: `1px solid ${color.hull}`,
                      borderRadius: radius.card,
                      padding: '18px 22px',
                      maxWidth: 380,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        color: color.signal,
                        fontFamily: font.mono,
                        fontSize: 20,
                        fontWeight: 600,
                      }}
                    >
                      <SupEmblem size={26} />
                      <span>SUP@ ORBITAL STAGE</span>
                    </div>
                    <p
                      style={{
                        color: color.porcelain,
                        fontSize: 20,
                        margin: '8px 0 0 0',
                      }}
                    >
                      Counter-rotating rings over our procedural dual-hemisphere dot-sphere. Scroll or select any chapter below to pilot the camera.
                    </p>
                  </div>
                </div>
              )}

              {/* SECTIONS 2 & 3 — WORD-BY-WORD TEXT REVEAL */}
              {sec.kind === 'text-reveal' && (
                <div
                  style={{
                    maxWidth: 960,
                    background: color.ink,
                    border: `1px solid ${color.hull}`,
                    borderLeft: `3px solid ${color.signal}`,
                    borderRadius: radius.card,
                    padding: '32px 36px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                  }}
                >
                  <p className="section-kicker">
                    0{sec.index} · {sec.kicker}
                  </p>
                  <h2 className="section-h2-statement" aria-label={sec.headline}>
                    {wordTokens.map((wt, idx) => (
                      <span
                        key={idx}
                        className="word"
                        style={{
                          color: wt.color,
                          transition: `color ${motion.reveal}ms ${motion.easeOut}`,
                        }}
                      >
                        {wt.word}
                        {idx < wordTokens.length - 1 ? ' ' : ''}
                      </span>
                    ))}
                  </h2>
                  <p className="body-copy">{sec.body}</p>
                </div>
              )}

              {/* SECTION 4 — ONE WORLD, TWO REALMS (DAY & NIGHT SPLIT) */}
              {sec.kind === 'two-steps' && (
                <div
                  style={{
                    background: color.ink,
                    border: `1px solid ${color.hull}`,
                    borderRadius: radius.card,
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 28,
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <p className="section-kicker">{sec.kicker}</p>
                    <h2 className="section-h2-giant" style={{ marginTop: 8 }}>
                      {sec.headline}
                    </h2>
                    <p className="body-copy" style={{ margin: '12px auto 0 auto' }}>
                      {sec.body}
                    </p>
                  </div>

                  <div className="two-steps-grid">
                    {/* Left: 01 DAY DREAMS */}
                    <div
                      style={{
                        background: color.ink,
                        border: `1px solid ${color.hull}`,
                        borderLeft: `3px solid ${color.signal}`,
                        borderRadius: radius.card,
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                      }}
                    >
                      <div style={{ color: color.signal, fontFamily: font.mono, fontSize: 16, fontWeight: 600 }}>
                        01 / DAY DREAMS / THE OLD WORLD
                      </div>
                      <h3 className="section-h3">Sunlit Stone Plazas & Open Valleys</h3>
                      <RealmSceneArtwork variant="day-dreams" />
                      <p className="body-copy">
                        Green valleys, dry-stone cottages, windmills, lantern workshops, and a +25% Life Skill EXP window for gathering, fishing at Lake Lumen, and crafting.
                      </p>
                    </div>

                    <div
                      className="two-steps-divider"
                      style={{ background: color.hull, width: 1 }}
                      aria-hidden="true"
                    />

                    {/* Right: 02 NIGHTFALL */}
                    <div
                      style={{
                        background: color.ink,
                        border: `1px solid ${color.hull}`,
                        borderLeft: `3px solid ${color.signal}`,
                        borderRadius: radius.card,
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                      }}
                    >
                      <div style={{ color: color.signal, fontFamily: font.mono, fontSize: 16, fontWeight: 600 }}>
                        02 / NIGHTFALL / NEON METROPOLIS
                      </div>
                      <h3 className="section-h3">Holographic Skyways & Neon Towers</h3>
                      <RealmSceneArtwork variant="nightfall" />
                      <p className="body-copy">
                        The exact same world coordinates awaken into lit tower grids, high-tier synthesis, +35% Monster EXP, and the Weekly Nightmare Shift.
                      </p>
                    </div>
                  </div>

                  {/* Bottom Signal-Yellow Progress Bar: DAWN BELLS to MIDNIGHT CONVERGENCE */}
                  <div
                    style={{
                      background: color.signal,
                      color: color.ink,
                      borderRadius: radius.button,
                      padding: '12px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontFamily: font.mono,
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    <span>DAWN BELLS · +25% LIFE SKILL EXP</span>
                    <span>SAME WORLD COORDINATES</span>
                    <span>MIDNIGHT CONVERGENCE · +35% MONSTER EXP</span>
                  </div>
                </div>
              )}

              {/* SECTIONS 5, 11, 15, 16, 17 — CHAPTER POSTER FRAMES */}
              {sec.kind === 'chapter-poster' && (
                <div
                  style={{
                    alignSelf:
                      sec.align === 'right'
                        ? 'flex-end'
                        : sec.align === 'center'
                          ? 'center'
                          : 'flex-start',
                    textAlign: sec.align === 'center' ? 'center' : 'left',
                    maxWidth: 860,
                    background: color.ink,
                    border: `1px solid ${color.hull}`,
                    borderLeft: `3px solid ${color.signal}`,
                    borderRadius: radius.card,
                    padding: '32px 36px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  <p className="section-kicker">{sec.kicker}</p>
                  <h2 className="section-h2-giant">{sec.headline}</h2>
                  {sec.index === 11 && <RealmSceneArtwork variant="fable-camper" />}
                  <p className="body-copy">{sec.body}</p>
                </div>
              )}

              {/* SECTION 6 — INTERACTIVE COMBAT PATH & AWAKENING SELECTOR */}
              {sec.kind === 'combat-selector' && (
                <div
                  className="combat-selector-layout"
                  style={{
                    background: color.ink,
                    border: `1px solid ${color.hull}`,
                    borderRadius: radius.card,
                    padding: '32px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p className="section-kicker">{sec.kicker}</p>
                    <h2 className="section-h2-statement">{sec.headline}</h2>
                    <p className="body-copy">{sec.body}</p>

                    {/* Selected Discipline Live Detail Panel */}
                    <div
                      style={{
                        marginTop: 8,
                        padding: '20px',
                        background: color.ink,
                        border: `1px solid ${color.signal}`,
                        borderRadius: radius.card,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ color: color.signal, fontFamily: font.mono, fontSize: 16, fontWeight: 600 }}>
                        {activeCombatCard.roleTag}
                      </div>
                      <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: color.porcelain }}>
                        {activeCombatCard.name}
                      </div>
                      <p className="body-copy">{activeCombatCard.summary}</p>
                      <div
                        style={{
                          display: 'flex',
                          gap: 16,
                          flexWrap: 'wrap',
                          fontFamily: font.mono,
                          fontSize: 16,
                          color: color.porcelain,
                        }}
                      >
                        <span>REACH: {activeCombatCard.reach}</span>
                        <span>·</span>
                        <span>COST: {activeCombatCard.staminaProfile}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: 2-Tab x 5-Card Interactive Selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div role="tablist" aria-label="Combat Progression Tiers" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {COMBAT_TABS.map((tab) => {
                        const isTabActive = tab.id === combatTabId;
                        return (
                          <button
                            key={tab.id}
                            role="tab"
                            type="button"
                            aria-selected={isTabActive}
                            onClick={() => {
                              setCombatTabId(tab.id);
                              setSelectedCardId(tab.cards[0].id);
                            }}
                            style={{
                              minHeight: 44,
                              padding: '0 18px',
                              borderRadius: radius.button,
                              border: `1px solid ${isTabActive ? color.signal : color.hull}`,
                              background: isTabActive ? color.signal : color.ink,
                              color: isTabActive ? color.ink : color.porcelain,
                              fontFamily: font.mono,
                              fontSize: 16,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                        gap: 12,
                      }}
                    >
                      {activeCombatTab.cards.map((card) => {
                        const isSelected = card.id === activeCombatCard.id;
                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => setSelectedCardId(card.id)}
                            aria-pressed={isSelected}
                            style={{
                              textAlign: 'left',
                              minHeight: 120,
                              padding: '16px',
                              background: color.ink,
                              border: `1px solid ${isSelected ? color.signal : color.hull}`,
                              borderLeft: isSelected ? `3px solid ${color.signal}` : `1px solid ${color.hull}`,
                              borderRadius: radius.card,
                              color: color.porcelain,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: 12,
                              cursor: 'pointer',
                              transition: `border-color ${motion.press}ms ${motion.easeOut}`,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <DisciplineIcon shape={card.shape} active={isSelected} />
                              <span
                                style={{
                                  fontFamily: font.mono,
                                  fontSize: 16,
                                  color: isSelected ? color.signal : color.slate,
                                }}
                              >
                                {card.reach}
                              </span>
                            </div>
                            <div>
                              <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, color: color.porcelain }}>
                                {card.name}
                              </div>
                              <div style={{ fontFamily: font.text, fontSize: 16, color: color.fog, marginTop: 4 }}>
                                {card.staminaProfile}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTIONS 7, 8, 9, 12, 13, 14, 18 — NARROW 450PX LEFT/RIGHT COLUMNS */}
              {(sec.kind === 'sub-left' || sec.kind === 'sub-right') && (
                <div
                  style={{
                    alignSelf: sec.kind === 'sub-right' ? 'flex-end' : 'flex-start',
                    maxWidth: 520,
                    background: color.ink,
                    border: `1px solid ${color.hull}`,
                    borderLeft: `3px solid ${color.signal}`,
                    borderRadius: radius.card,
                    padding: '28px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <p className="section-kicker">{sec.kicker}</p>
                  <h3 className="section-h3">{sec.headline}</h3>
                  <p className="body-copy">{sec.body}</p>
                </div>
              )}

              {/* SECTION 10 — TEN INTERLOCKING LIFE SKILLS */}
              {sec.kind === 'life-economy' && (
                <div
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: 1080,
                    width: '100%',
                    background: color.ink,
                    border: `1px solid ${color.hull}`,
                    borderRadius: radius.card,
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                  }}
                >
                  <div>
                    <p className="section-kicker">{sec.kicker}</p>
                    <h2 className="section-h2-giant" style={{ marginTop: 6 }}>
                      {sec.headline}
                    </h2>
                    <p className="body-copy" style={{ marginTop: 10 }}>
                      {sec.body}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))',
                      gap: 10,
                    }}
                  >
                    {LIFE_SKILLS.map((sk, idx) => {
                      const active = idx === selectedSkillIdx;
                      return (
                        <button
                          key={sk.index}
                          type="button"
                          onClick={() => setSelectedSkillIdx(idx)}
                          aria-pressed={active}
                          style={{
                            minHeight: 54,
                            padding: '12px 14px',
                            textAlign: 'left',
                            background: color.ink,
                            border: `1px solid ${active ? color.signal : color.hull}`,
                            borderLeft: active ? `3px solid ${color.signal}` : `1px solid ${color.hull}`,
                            borderRadius: radius.button,
                            color: color.porcelain,
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontFamily: font.mono, fontSize: 16, color: active ? color.signal : color.slate }}>
                            SKILL {sk.index}
                          </div>
                          <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, marginTop: 2 }}>
                            {sk.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      padding: '18px 22px',
                      background: color.ink,
                      border: `1px solid ${color.signal}`,
                      borderRadius: radius.button,
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ color: color.signal, fontFamily: font.mono, fontSize: 16, fontWeight: 600 }}>
                        RESOURCE CHAIN · {activeSkill.name.toUpperCase()}
                      </div>
                      <div style={{ color: color.porcelain, fontSize: 20, fontWeight: 600, marginTop: 4 }}>
                        {activeSkill.chain}
                      </div>
                    </div>
                    <div style={{ color: color.fog, fontSize: 16 }}>{activeSkill.benefit}</div>
                  </div>
                </div>
              )}

              {/* SECTION 19 — WORLD BOSSES & LIVE REALM TELEMETRY HUD */}
              {sec.kind === 'hud-telemetry' && (
                <div className="hud-telemetry-layout">
                  <div
                    style={{
                      background: color.ink,
                      border: `1px solid ${color.hull}`,
                      borderLeft: `3px solid ${color.signal}`,
                      borderRadius: radius.card,
                      padding: '28px 32px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}
                  >
                    <p className="section-kicker">{sec.kicker}</p>
                    <h3 className="section-h3">{sec.headline}</h3>
                    <p className="body-copy">{sec.body}</p>
                  </div>

                  {/* Right HUD Callout Panel with 1px solid #3A3F45 Leader Line */}
                  <div
                    style={{
                      background: color.ink,
                      border: `1px solid ${color.hull}`,
                      borderLeft: `3px solid ${color.signal}`,
                      borderRadius: radius.card,
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: `1px solid ${color.hull}`,
                        paddingBottom: 10,
                        fontFamily: font.mono,
                        fontSize: 16,
                        color: color.signal,
                      }}
                    >
                      <span>REALM TELEMETRY HUD</span>
                      <span>VERIFIED ENGINE BUDGETS</span>
                    </div>
                    {TELEMETRY_HUD_ROWS.map((row) => (
                      <div
                        key={row.label}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          paddingBottom: 10,
                          borderBottom: `1px solid ${color.hull}`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                          <span style={{ fontFamily: font.mono, fontSize: 16, color: color.fog }}>{row.label}</span>
                          <span style={{ fontFamily: font.mono, fontSize: 20, fontWeight: 700, color: color.signal }}>
                            {row.value}
                          </span>
                        </div>
                        <span style={{ fontSize: 16, color: color.porcelain }}>{row.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 20 — THE FIRST 15-MINUTE JOURNEY SCRUBBER */}
              {sec.kind === 'journey-scrubber' && (
                <div
                  style={{
                    background: color.ink,
                    border: `1px solid ${color.hull}`,
                    borderRadius: radius.card,
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <p className="section-kicker">{sec.kicker}</p>
                    <h2 className="section-h2-giant" style={{ marginTop: 6 }}>
                      {sec.headline}
                    </h2>
                    <p className="body-copy" style={{ margin: '10px auto 0 auto' }}>
                      {sec.body}
                    </p>
                  </div>

                  {/* 5-Stop Timeline Buttons + Range Scrubber */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: 10,
                      }}
                    >
                      {FIRST_15_MIN_STOPS.map((stop, idx) => {
                        const isSelected = idx === journeyStopIdx;
                        return (
                          <button
                            key={stop.time}
                            type="button"
                            onClick={() => setJourneyStopIdx(idx)}
                            aria-pressed={isSelected}
                            style={{
                              minHeight: 52,
                              padding: '10px 14px',
                              borderRadius: radius.button,
                              border: `1px solid ${isSelected ? color.signal : color.hull}`,
                              background: isSelected ? color.signal : color.ink,
                              color: isSelected ? color.ink : color.porcelain,
                              fontFamily: font.text,
                              fontSize: 16,
                              fontWeight: isSelected ? 700 : 600,
                              textAlign: 'left',
                              cursor: 'pointer',
                            }}
                          >
                            {stop.title}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label
                        htmlFor="journey-timeline-range"
                        style={{ fontFamily: font.mono, fontSize: 16, color: color.signal, whiteSpace: 'nowrap' }}
                      >
                        SCRUB TIMELINE:
                      </label>
                      <input
                        id="journey-timeline-range"
                        type="range"
                        min={0}
                        max={FIRST_15_MIN_STOPS.length - 1}
                        step={1}
                        value={journeyStopIdx}
                        onChange={(e) => setJourneyStopIdx(Number(e.target.value))}
                        style={{ width: '100%', accentColor: color.signal, minHeight: 44 }}
                      />
                    </div>
                  </div>

                  {/* Active Beat Card */}
                  <div
                    style={{
                      padding: '24px',
                      background: color.ink,
                      border: `1px solid ${color.signal}`,
                      borderLeft: `3px solid ${color.signal}`,
                      borderRadius: radius.card,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ fontFamily: font.mono, fontSize: 16, color: color.signal }}>
                      {activeJourneyStop.systemProof}
                    </div>
                    <h3 className="section-h3">{activeJourneyStop.title}</h3>
                    <p className="body-copy" style={{ color: color.porcelain }}>
                      {activeJourneyStop.description}
                    </p>
                    <p style={{ fontFamily: font.mono, fontSize: 16, color: color.fog, margin: 0 }}>
                      Guide Prompt: {activeJourneyStop.quote}
                    </p>
                  </div>
                </div>
              )}

              {/* SECTION 21 — FIRST PLAYABLE TECHNICAL PROMISE (ODOMETER + LIGHTING TOGGLE) */}
              {sec.kind === 'technical-promise' && (
                <div
                  style={{
                    background: color.ink,
                    border: `1px solid ${color.hull}`,
                    borderRadius: radius.card,
                    padding: '32px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 28,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p className="section-kicker">FIRST PLAYABLE PROMISE</p>
                    <h3 className="section-h3">{sec.headline}</h3>
                    <p className="body-copy">{sec.body}</p>
                  </div>

                  <div
                    style={{
                      textAlign: 'center',
                      padding: '24px',
                      background: color.ink,
                      border: `1px solid ${color.signal}`,
                      borderRadius: radius.card,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <span style={{ fontFamily: font.mono, fontSize: 16, fontWeight: 600, color: color.signal }}>
                      {sec.kicker}
                    </span>
                    <OdometerCounter
                      value={activePromiseMode.fpsStat}
                      progress={1}
                      reducedMotion={reducedMotion}
                      accent
                      sizePx={64}
                    />
                    <span style={{ fontFamily: font.mono, fontSize: 16, color: color.porcelain }}>
                      {sec.subtitle}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {PROMISE_LIGHTING_MODES.map((mode) => {
                        const isModeActive = mode.id === lightingMode;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => setLightingMode(mode.id)}
                            aria-pressed={isModeActive}
                            style={{
                              minHeight: 44,
                              padding: '0 16px',
                              borderRadius: radius.button,
                              border: `1px solid ${isModeActive ? color.signal : color.hull}`,
                              background: isModeActive ? color.signal : color.ink,
                              color: isModeActive ? color.ink : color.porcelain,
                              fontFamily: font.mono,
                              fontSize: 16,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {mode.label}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, color: color.porcelain }}>
                      {activePromiseMode.headline}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 20, color: color.fog, fontSize: 16 }}>
                      {activePromiseMode.specs.map((sp) => (
                        <li key={sp} style={{ marginBottom: 6 }}>
                          {sp}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* SECTION 22 — STEP INTO THE DREAM (CLIMAX CTA) */}
              {sec.kind === 'climax-cta' && (
                <div
                  style={{
                    textAlign: 'center',
                    maxWidth: 820,
                    margin: '0 auto',
                    background: color.ink,
                    border: `1px solid ${color.signal}`,
                    borderRadius: radius.card,
                    padding: '48px 36px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 20,
                  }}
                >
                  <p className="section-kicker">{sec.kicker}</p>
                  <h2 className="section-h2-giant">{sec.headline}</h2>
                  <p className="body-copy" style={{ color: color.porcelain }}>
                    {sec.body}
                  </p>
                  <a
                    href="#section-20-first-15-min"
                    onClick={(e) => {
                      e.preventDefault();
                      jumpToSection(20);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 14,
                      minWidth: 320,
                      minHeight: 72,
                      padding: '0 32px',
                      borderRadius: radius.button,
                      background: color.signal,
                      border: `2px solid ${color.signal}`,
                      color: color.ink,
                      fontFamily: font.display,
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      textDecoration: 'none',
                    }}
                  >
                    <span>{BRAND_META.primaryCtaLabel}</span>
                    <ArrowUpRightIcon size={22} stroke={color.ink} />
                  </a>
                </div>
              )}
            </section>
          );
        })}
      </main>

      {/* LIVE REALM MARQUEE STRIP */}
      <MarqueeStrip items={MARQUEE_ITEMS} reducedMotion={reducedMotion} />

      {/* SECTION 23 — THE WORLD BY THE NUMBERS (NORMAL FLOW) */}
      <section
        id="section-23-numbers"
        data-section-index={23}
        style={{
          position: 'relative',
          zIndex: 2,
          background: color.ink,
          borderBottom: `1px solid ${color.hull}`,
          padding: '80px 64px',
        }}
      >
        <div style={{ maxWidth: 1760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 36 }}>
          <div>
            <p className="section-kicker">ONE UNBROKEN REALM</p>
            <h2 className="section-h2-statement" style={{ marginTop: 8 }}>
              THE WORLD BY THE NUMBERS
            </h2>
          </div>

          <div className="numbers-grid">
            {NUMBERS_COUNTERS.map((item) => (
              <div
                key={item.unitLabel}
                style={{
                  background: color.ink,
                  border: `1px solid ${color.hull}`,
                  borderLeft: `3px solid ${color.signal}`,
                  borderRadius: radius.card,
                  padding: '28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <OdometerCounter
                  value={item.value}
                  progress={1}
                  reducedMotion={reducedMotion}
                  accent={item.value === '1'}
                  sizePx={56}
                />
                <div style={{ fontFamily: font.mono, fontSize: 16, fontWeight: 600, color: color.signal }}>
                  {item.unitLabel}
                </div>
                <p className="body-copy" style={{ fontSize: 16 }}>
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 24 — CANON SHOWCASE & HALL OF CRAFT (6x2 BORDERED GRID) */}
      <section
        id="section-24-showcase"
        data-section-index={24}
        style={{
          position: 'relative',
          zIndex: 2,
          background: color.ink,
          borderBottom: `1px solid ${color.hull}`,
          padding: '80px 64px',
        }}
      >
        <div style={{ maxWidth: 1760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <p className="section-kicker">INSIDE THE REALM</p>
            <h2 className="section-h2-statement" style={{ marginTop: 8 }}>
              CANON SHOWCASE & HALL OF CRAFT
            </h2>
          </div>

          <div className="showcase-grid">
            {SHOWCASE_CELLS.map((cell) => (
              <div key={cell.id} className="showcase-cell">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: font.mono, fontSize: 16, color: color.slate }}>{cell.index}</span>
                  <ShowcaseEmblem id={cell.id} isAccent={cell.isAccentCallout} />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: font.display,
                      fontSize: cell.isAccentCallout ? 40 : 24,
                      fontWeight: 700,
                      color: cell.isAccentCallout ? color.signal : color.porcelain,
                    }}
                  >
                    {cell.title}
                  </div>
                  <div style={{ fontFamily: font.mono, fontSize: 16, color: color.fog, marginTop: 4 }}>
                    {cell.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 25 — FOOTER */}
      <footer
        id="section-25-footer"
        data-section-index={25}
        style={{
          position: 'relative',
          zIndex: 2,
          background: color.ink,
          borderTop: `1px solid ${color.hull}`,
          padding: '64px 64px 120px 64px',
        }}
      >
        <div style={{ maxWidth: 1760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
          <FooterHorizonWave />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 32,
            }}
          >
            {/* Brand Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SupEmblem size={32} />
                <span style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, color: color.porcelain }}>
                  {BRAND_META.fullBanner}
                </span>
              </div>
              <p className="body-copy" style={{ fontSize: 16 }}>
                One shared 3D action RPG where every road, craft, and conversation is real.
              </p>
            </div>

            {/* 4 Link Columns */}
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: font.mono, fontSize: 16, fontWeight: 600, color: color.signal }}>
                  {col.heading}
                </div>
                {col.links.map((lnk) => (
                  <a
                    key={lnk.label}
                    href={lnk.href}
                    style={{
                      minHeight: 36,
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: color.porcelain,
                      fontFamily: font.text,
                      fontSize: 16,
                      textDecoration: 'none',
                    }}
                  >
                    {lnk.label}
                  </a>
                ))}
              </div>
            ))}
          </div>

          {/* Frontier Dispatch Signup Row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (dispatchEmail.trim()) setDispatchSubscribed(true);
            }}
            style={{
              padding: '24px',
              background: color.ink,
              border: `1px solid ${color.hull}`,
              borderRadius: radius.card,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <label
                htmlFor="frontier-dispatch-email"
                style={{ fontFamily: font.mono, fontSize: 16, fontWeight: 600, color: color.signal }}
              >
                JOIN THE FRONTIER DISPATCH
              </label>
              <p style={{ color: color.fog, fontSize: 16, margin: '4px 0 0 0' }}>
                Receive playable slice build notes, World Boss spawn chronicles, and FABLE anvil updates.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <input
                id="frontier-dispatch-email"
                type="email"
                value={dispatchEmail}
                onChange={(e) => setDispatchEmail(e.target.value)}
                aria-label="Email address for Frontier Dispatch"
                style={{
                  minHeight: 44,
                  minWidth: 240,
                  padding: '0 14px',
                  borderRadius: radius.button,
                  border: `1px solid ${color.slate}`,
                  background: color.ink,
                  color: color.porcelain,
                  fontFamily: font.text,
                  fontSize: 16,
                }}
              />
              <button
                type="submit"
                style={{
                  minHeight: 44,
                  padding: '0 20px',
                  borderRadius: radius.button,
                  border: `1px solid ${color.signal}`,
                  background: color.signal,
                  color: color.ink,
                  fontFamily: font.text,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {dispatchSubscribed ? 'DISPATCH JOINED' : 'JOIN DISPATCH'}
              </button>
            </div>
          </form>

          {/* Bottom Attribution Bar */}
          <div
            style={{
              borderTop: `1px solid ${color.hull}`,
              paddingTop: 24,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              fontFamily: font.mono,
              fontSize: 16,
              color: color.porcelain,
            }}
          >
            <span>
              © 2026 Joshua Coleman. All rights reserved. · {BRAND_META.title}
            </span>
            <span style={{ color: color.signal }}>{BRAND_META.builderAttribution}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
