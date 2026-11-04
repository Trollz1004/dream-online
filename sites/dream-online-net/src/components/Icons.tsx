/**
 * Clean-room inline stroke SVGs and abstract vector art for dream-online.net.
 *
 * Authored 100% in DREAM Space tokens:
 * - Ink #0A0B0D
 * - Panel #12151A
 * - Hull #3A3F45
 * - Slate #9DA3AA
 * - Fog #C9CBCE
 * - Porcelain #F4F1EA
 * - Signal #FFD21E
 *
 * Zero external image requests, zero emojis, zero cloud generators.
 */
import React from 'react';
import { color } from '../tokens.ts';

export const SupEmblem: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="34" height="34" rx="9" fill={color.ink} stroke={color.hull} strokeWidth="1.5" />
    <ellipse
      cx="18"
      cy="18"
      rx="13"
      ry="6"
      transform="rotate(-28 18 18)"
      stroke={color.signal}
      strokeWidth="1.75"
    />
    <ellipse
      cx="18"
      cy="18"
      rx="13"
      ry="6"
      transform="rotate(28 18 18)"
      stroke={color.porcelain}
      strokeWidth="1.4"
    />
    <circle cx="18" cy="18" r="4.2" fill={color.signal} />
    <circle cx="18" cy="18" r="1.8" fill={color.ink} />
  </svg>
);

export const ArrowUpRightIcon: React.FC<{ size?: number; stroke?: string }> = ({
  size = 18,
  stroke = color.porcelain,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M5.5 14.5L14.5 5.5M14.5 5.5H7.5M14.5 5.5V12.5"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const DisciplineIcon: React.FC<{
  shape: 'blade' | 'guard' | 'spear' | 'bow' | 'focus' | 'awakening';
  active?: boolean;
}> = ({ shape, active = false }) => {
  const stroke = active ? color.signal : color.porcelain;
  const sub = active ? color.porcelain : color.slate;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="34" height="34" rx="8" fill={color.ink} stroke={active ? color.signal : color.hull} />
      {shape === 'blade' && (
        <>
          <path d="M9 27L26 10M22 9H27V14" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M11 21L15 25M8 28L11 25" stroke={sub} strokeWidth="1.75" strokeLinecap="round" />
        </>
      )}
      {shape === 'guard' && (
        <>
          <path
            d="M18 7L27 11V18C27 23.5 23 27.5 18 29C13 27.5 9 23.5 9 18V11L18 7Z"
            stroke={stroke}
            strokeWidth="2"
          />
          <path d="M18 12V24M13 17H23" stroke={sub} strokeWidth="1.75" strokeLinecap="round" />
        </>
      )}
      {shape === 'spear' && (
        <>
          <path d="M8 28L25 11" stroke={sub} strokeWidth="2" strokeLinecap="round" />
          <path d="M21 9L28 8L27 15L21 9Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        </>
      )}
      {shape === 'bow' && (
        <>
          <path d="M13 8C22 11 22 25 13 28" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M13 9V27M10 18H26M22 14L26 18L22 22" stroke={sub} strokeWidth="1.75" strokeLinecap="round" />
        </>
      )}
      {shape === 'focus' && (
        <>
          <polygon points="18,7 28,18 18,29 8,18" stroke={stroke} strokeWidth="2" />
          <circle cx="18" cy="18" r="4" stroke={sub} strokeWidth="1.75" />
        </>
      )}
      {shape === 'awakening' && (
        <>
          <circle cx="18" cy="18" r="9" stroke={stroke} strokeWidth="2" />
          <path d="M18 6V30M6 18H30M10 10L26 26M26 10L10 26" stroke={sub} strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
};

export const ShowcaseEmblem: React.FC<{ id: string; isAccent?: boolean }> = ({ id, isAccent = false }) => {
  const primary = isAccent ? color.signal : color.porcelain;
  const accent = color.signal;
  const muted = color.hull;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="52" height="52" rx="12" fill={color.ink} stroke={isAccent ? accent : muted} strokeWidth="1.5" />
      {id === 'one-world' && (
        <>
          <circle cx="28" cy="28" r="16" stroke={primary} strokeWidth="1.75" />
          <ellipse cx="28" cy="28" rx="16" ry="6" stroke={accent} strokeWidth="1.5" />
          <line x1="28" y1="12" x2="28" y2="44" stroke={muted} strokeWidth="1.5" />
        </>
      )}
      {id === 'sup-companion' && (
        <>
          <ellipse cx="28" cy="28" rx="18" ry="7" transform="rotate(-25 28 28)" stroke={accent} strokeWidth="1.75" />
          <ellipse cx="28" cy="28" rx="18" ry="7" transform="rotate(25 28 28)" stroke={primary} strokeWidth="1.5" />
          <circle cx="28" cy="28" r="5" fill={accent} />
        </>
      )}
      {id === 'fables-forge' && (
        <>
          <path d="M14 34H42L38 42H18L14 34Z" stroke={primary} strokeWidth="1.75" />
          <path d="M22 26H34V34H22V26Z" stroke={accent} strokeWidth="1.75" />
          <path d="M28 14L32 22H24L28 14Z" fill={accent} />
        </>
      )}
      {id === 'day-night-cycle' && (
        <>
          <circle cx="28" cy="28" r="15" stroke={primary} strokeWidth="1.75" />
          <path d="M28 13A15 15 0 0 1 28 43V13Z" fill={accent} />
        </>
      )}
      {id === 'sovereign-blade' && (
        <>
          <path d="M14 42L40 16M33 15H41V23" stroke={accent} strokeWidth="2" strokeLinecap="round" />
          <path d="M18 30L26 38" stroke={primary} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {id === 'veynar-guard' && (
        <path
          d="M28 11L42 17V28C42 36.5 36 42.5 28 45C20 42.5 14 36.5 14 28V17L28 11Z"
          stroke={primary}
          strokeWidth="2"
        />
      )}
      {id === 'inferno-titan' && (
        <>
          <polygon points="28,11 43,39 13,39" stroke={accent} strokeWidth="2" />
          <circle cx="28" cy="30" r="4" fill={primary} />
        </>
      )}
      {id === 'gemineye-openaeye' && (
        <>
          <circle cx="22" cy="28" r="9" stroke={primary} strokeWidth="1.75" />
          <circle cx="34" cy="28" r="9" stroke={accent} strokeWidth="1.75" />
          <circle cx="28" cy="28" r="3" fill={accent} />
        </>
      )}
      {id === 'mythos-kraken' && (
        <>
          <circle cx="28" cy="22" r="8" stroke={accent} strokeWidth="2" />
          <path d="M16 34C20 40 24 34 28 40C32 34 36 40 40 34" stroke={primary} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {id === 'trollinlootnscoot' && (
        <>
          <rect x="15" y="22" width="26" height="12" rx="4" stroke={primary} strokeWidth="1.75" />
          <circle cx="21" cy="38" r="4" stroke={accent} strokeWidth="2" />
          <circle cx="35" cy="38" r="4" stroke={accent} strokeWidth="2" />
        </>
      )}
      {id === 'captain-varen' && (
        <>
          <polygon points="28,12 33,24 45,24 35,31 39,43 28,35 17,43 21,31 11,24 23,24" stroke={primary} strokeWidth="1.6" />
        </>
      )}
      {id === 'you-slot' && (
        <>
          <circle cx="28" cy="28" r="15" stroke={accent} strokeWidth="2" strokeDasharray="4 4" />
          <path d="M28 20V36M20 28H36" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
};

/**
 * Clean-room abstract architectural & landscape vector art in DREAM Space tokens
 * for Section 4 (Day Dreams vs Nightfall) and Section 11 (FABLE's Forge & Camper).
 */
export const RealmSceneArtwork: React.FC<{ variant: 'day-dreams' | 'nightfall' | 'fable-camper' }> = ({ variant }) => (
  <svg
    viewBox="0 0 480 180"
    width="100%"
    height="150"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ display: 'block', borderRadius: 10, border: `1px solid ${color.hull}`, background: color.ink }}
  >
    {/* Horizon grid lines */}
    <line x1="0" y1="132" x2="480" y2="132" stroke={color.hull} strokeWidth="1" />
    <line x1="0" y1="154" x2="480" y2="154" stroke={color.hull} strokeWidth="1" />
    {variant === 'day-dreams' && (
      <>
        {/* Low golden sun & Old World mountain ridge */}
        <circle cx="370" cy="64" r="28" stroke={color.signal} strokeWidth="2" />
        <circle cx="370" cy="64" r="10" fill={color.signal} />
        <path d="M20 132L115 62L195 132" stroke={color.porcelain} strokeWidth="2" />
        <path d="M150 132L245 48L340 132" stroke={color.fog} strokeWidth="1.75" />
        {/* Old-world gabled stone cottage & windmill */}
        <polygon points="72,132 72,102 96,84 120,102 120,132" fill={color.ink} stroke={color.porcelain} strokeWidth="1.75" />
        <line x1="290" y1="74" x2="290" y2="132" stroke={color.signal} strokeWidth="2" />
        <line x1="272" y1="62" x2="308" y2="86" stroke={color.porcelain} strokeWidth="1.75" />
        <line x1="308" y1="62" x2="272" y2="86" stroke={color.porcelain} strokeWidth="1.75" />
      </>
    )}
    {variant === 'nightfall' && (
      <>
        {/* Neon metropolis towers on the exact same terrain coordinates */}
        <rect x="56" y="46" width="44" height="86" fill={color.ink} stroke={color.porcelain} strokeWidth="1.75" />
        <rect x="114" y="28" width="52" height="104" fill={color.ink} stroke={color.signal} strokeWidth="2" />
        <rect x="182" y="58" width="46" height="74" fill={color.ink} stroke={color.fog} strokeWidth="1.75" />
        <rect x="246" y="36" width="58" height="96" fill={color.ink} stroke={color.porcelain} strokeWidth="1.75" />
        <rect x="322" y="52" width="48" height="80" fill={color.ink} stroke={color.signal} strokeWidth="1.75" />
        {/* Skyway neon arcs */}
        <path d="M40 92Q240 24 440 88" stroke={color.signal} strokeWidth="1.75" strokeDasharray="6 4" />
        <circle cx="140" cy="52" r="4" fill={color.signal} />
        <circle cx="275" cy="58" r="4" fill={color.signal} />
      </>
    )}
    {variant === 'fable-camper' && (
      <>
        {/* FABLE's Central Anvil & Frontier Popup Camper */}
        <path d="M90 132H170L158 104H102L90 132Z" stroke={color.porcelain} strokeWidth="2" />
        <rect x="108" y="88" width="44" height="16" stroke={color.signal} strokeWidth="2" />
        <rect x="260" y="82" width="136" height="50" rx="10" fill={color.ink} stroke={color.porcelain} strokeWidth="2" />
        <line x1="244" y1="68" x2="412" y2="68" stroke={color.signal} strokeWidth="1.75" strokeDasharray="4 6" />
        <circle cx="292" cy="132" r="10" fill={color.ink} stroke={color.signal} strokeWidth="2" />
        <circle cx="364" cy="132" r="10" fill={color.ink} stroke={color.signal} strokeWidth="2" />
      </>
    )}
  </svg>
);

export const FooterHorizonWave: React.FC = () => (
  <svg
    viewBox="0 0 1440 90"
    width="100%"
    height="72"
    fill="none"
    preserveAspectRatio="none"
    aria-hidden="true"
    style={{ display: 'block' }}
  >
    <path d="M0 78Q720 8 1440 78" stroke={color.hull} strokeWidth="1.5" />
    <path d="M0 86Q720 26 1440 86" stroke={color.signal} strokeWidth="1.5" />
  </svg>
);
