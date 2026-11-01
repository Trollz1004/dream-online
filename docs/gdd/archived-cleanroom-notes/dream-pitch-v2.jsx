/* DREAM Online — funding reel v2 (gameplay-first, layered capture).
   Layers: World (parallax) → Entities (tokens+nameplates+prestige icons) → VFX (arcs, AOE, damage numbers)
   → HUD (party frames, hotbar, chat, minimap, honor) → Cinematic (captions). All rendered from T. */
const { useComposition, Shot, Captions, Easing, animate, interpolate, clamp } = window;

const CY = '#22d3ee', PK = '#ec4899', GD = '#e9b949', RS = '#f43f5e', GR = '#34d399', VI = '#f59e0b', AM = '#fbbf24';
const MONO = "'JetBrains Mono', monospace", SANS = "Inter, sans-serif";
const MOTION = {
  enter: (start, dur) => (T) => animate({ from: 0, to: 1, start, end: start + (dur || 0.7), ease: Easing.easeOutCubic })(T),
  draw: (start, dur, from, to) => (T) => animate({ from: from ?? 0, to: to ?? 1, start, end: start + dur, ease: Easing.easeInOutCubic })(T),
  pop: (start, dur) => (T) => animate({ from: 0.6, to: 1, start, end: start + (dur || 0.45), ease: Easing.easeOutBack })(T)
};
const glass = (x) => Object.assign({ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 40px rgba(0,0,0,0.5)', borderRadius: 24 }, x || {});
const label = (color, size) => ({ fontFamily: MONO, fontSize: size || 22, letterSpacing: '0.12em', color: color || '#64748b' });
const lerp = (p, a, b, ease) => a + (b - a) * (ease ? ease(clamp(p, 0, 1)) : clamp(p, 0, 1));
const fadeWin = (T, from, to, f) => clamp((T - from) / (f || 0.5), 0, 1) * (1 - clamp((T - to) / (f || 0.5), 0, 1));

/* ---------- spine ---------- */
function Orb({ T, x, y, size, mode, rings }) {
  const prime = mode === 'prime', core = size * 0.42;
  const defs = [
    { inset: size * 0.10, color: prime ? GD : CY, per: 26, cut: 'borderBottomColor' },
    { inset: size * 0.04, color: prime ? RS : GD, per: -17, cut: 'borderLeftColor' },
    { inset: 0, color: AM, per: 11, cut: 'borderRightColor' }
  ].slice(0, rings);
  return (
    <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      <div style={{ position: 'absolute', inset: size * 0.12, borderRadius: '50%', background: `radial-gradient(circle, ${prime ? 'rgba(244,63,94,0.45)' : 'rgba(34,211,238,0.4)'}, transparent 70%)`, opacity: 0.55 + 0.4 * Math.sin(T * 2.1), transform: `scale(${1 + 0.06 * Math.sin(T * 2.1)})` }} />
      <div style={{ position: 'absolute', left: (size - core) / 2, top: (size - core) / 2, width: core, height: core, borderRadius: '50%', background: prime ? 'radial-gradient(circle at 35% 28%, #fff1f2, #fda4af 35%, #e9b949 62%, #7f1d1d)' : 'radial-gradient(circle at 35% 28%, #e0fbff, #a5f3fc 45%, #22d3ee 82%, #0e7490)', boxShadow: `0 0 ${size * 0.18}px ${prime ? 'rgba(244,63,94,0.55)' : 'rgba(34,211,238,0.55)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 700, fontSize: core * 0.52, color: prime ? '#450a0a' : '#083344' }}>@</div>
      {defs.map((r, i) => <div key={i} style={Object.assign({ position: 'absolute', inset: r.inset, borderRadius: '50%', border: `${Math.max(2, size * 0.018)}px solid ${r.color}`, transform: `rotate(${(T * r.per * (prime ? 2.6 : 1) + i * 40) % 360}deg)` }, { [r.cut]: 'transparent' })} />)}
    </div>
  );
}
function Wordmark({ scale, opacity, sub, subOpacity, size, top }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: top ? 'flex-end' : 'center', paddingBottom: top ? 150 : 0, opacity, transform: `scale(${scale})` }}>
      <div style={{ fontFamily: SANS, fontSize: size || 152, lineHeight: 1, fontWeight: 900, fontStyle: 'italic', background: `linear-gradient(to right, ${CY}, ${GD})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 0 28px rgba(34,211,238,0.35))' }}>DREAM ONLINE</div>
      <div style={Object.assign(label('#94a3b8', 30), { marginTop: 18, opacity: subOpacity, textAlign: 'center' })}>{sub}</div>
    </div>
  );
}

/* ---------- game layers ---------- */
const CLASS_COL = { Dragonclaw: RS, Blade: CY, Hammer: AM, Spear: GR, Bow: PK, Focus: VI };
function Token({ x, y, r, color, name, guild, guildColor, icons, red, champion, T, hp, ring, faint }) {
  const flick = champion ? 0.75 + 0.25 * Math.sin(T * 13 + x) : 0;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, opacity: faint ?? 1 }}>
      {champion ? <div style={{ position: 'absolute', left: -r * 2.2, top: -r * 2.6, width: r * 4.4, height: r * 4.4, borderRadius: '50%', background: `radial-gradient(circle, rgba(59,130,246,${0.55 * flick}), rgba(34,211,238,${0.25 * flick}) 40%, transparent 70%)`, transform: `scaleY(${1.15 + 0.1 * Math.sin(T * 9)})` }} /> : null}
      <div style={{ position: 'absolute', left: -r, top: -r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #fff, ${color} 45%, #0f172a 130%)`, border: `3px solid ${ring || (red ? RS : 'rgba(255,255,255,0.6)')}`, boxShadow: `0 0 ${r}px ${red ? RS : color}` }} />
      {hp != null ? <div style={{ position: 'absolute', left: -r - 6, top: -r - 12, width: r * 2 + 12, height: 5, background: '#0f172a', borderRadius: 3 }}><div style={{ width: `${hp * 100}%`, height: '100%', background: RS, borderRadius: 3 }} /></div> : null}
      <div style={{ position: 'absolute', left: -140, top: -r - (hp != null ? 22 : 12) - 54, width: 280, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {icons && icons.length ? <div style={{ display: 'flex', gap: 5 }}>{icons.map((ic, i) => <div key={i} style={{ width: 16, height: 16, borderRadius: 4, background: ic, boxShadow: `0 0 8px ${ic}` }} />)}</div> : null}
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 22, color: red ? RS : '#f8fafc', textShadow: red ? `0 0 14px ${RS}` : '0 2px 6px #000' }}>{name}</div>
        {guild ? <div style={{ fontFamily: MONO, fontSize: 17, color: guildColor || '#fbbf24', textShadow: '0 2px 6px #000' }}>&lt;{guild}&gt;</div> : null}
      </div>
    </div>
  );
}
function Dmg({ T, at, x, y, v, big, color }) {
  const p = MOTION.draw(at, big ? 1.7 : 1.3)(T);
  if (p <= 0 || p >= 1) return null;
  return <div style={{ position: 'absolute', left: x, top: y - p * 110, transform: 'translateX(-50%)', fontFamily: SANS, fontStyle: 'italic', fontWeight: 900, fontSize: big ? 92 : 46, letterSpacing: '-0.02em', color: color || (big ? '#fb7185' : '#fde68a'), WebkitTextStroke: big ? '2px #450a0a' : '1px #1c1917', textShadow: `0 0 ${big ? 30 : 12}px ${color || RS}`, opacity: clamp(p * 4, 0, 1) * (1 - clamp((p - 0.6) * 2.5, 0, 1)) }}>{v}</div>;
}
function WorldLayer({ T, c, tint }) {
  const drift = (T - c) * 14;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: -200, background: `radial-gradient(ellipse at 50% 120%, ${tint || 'rgba(14,116,144,0.35)'}, transparent 60%), linear-gradient(180deg, #020617 0%, #061a24 55%, #0b2a33 100%)` }} />
      <div style={{ position: 'absolute', inset: -200, backgroundImage: 'repeating-linear-gradient(0deg, rgba(37,99,235,0.05) 0 1px, transparent 1px 90px), repeating-linear-gradient(90deg, rgba(37,99,235,0.05) 0 1px, transparent 1px 90px)', transform: `translate(${-drift * 0.4}px, ${-drift * 0.2}px)` }} />
      <div style={{ position: 'absolute', inset: -200, backgroundImage: 'repeating-linear-gradient(0deg, rgba(34,211,238,0.10) 0 1px, transparent 1px 44px), repeating-linear-gradient(90deg, rgba(34,211,238,0.10) 0 1px, transparent 1px 44px)', transform: `translate(${-drift}px, ${-drift * 0.5}px) perspective(900px) rotateX(38deg)`, transformOrigin: '50% 100%', opacity: 0.7 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, background: 'linear-gradient(180deg, transparent, rgba(2,6,23,0.85))' }} />
    </div>
  );
}
const PARTY = [
  { n: 'JoshinYa', cls: 'Dragonclaw', lv: 61 }, { n: 'Nyx', cls: 'Focus', lv: 58 }, { n: 'Bram', cls: 'Hammer', lv: 60 },
  { n: 'Sefa', cls: 'Bow', lv: 57 }, { n: 'Tolliver', cls: 'Spear', lv: 59 }, { n: 'Wren', cls: 'Blade', lv: 55 }
];
const CHAT = [
  { at: 0.5, who: 'Party·Nyx', t: 'pull the pack, i have heals', col: '#67e8f9' },
  { at: 2.2, who: 'Party·Bram', t: 'lol that whole pack in one swing', col: '#67e8f9' },
  { at: 8.4, who: 'Party·Sefa', t: 'buffs up · 5/6 in range', col: '#67e8f9' },
  { at: 11.6, who: 'System', t: 'PvP flag raised. You may be attacked.', col: AM },
  { at: 14.0, who: 'Guild·Wren', t: 'red name on the Low Road, he jumped a fisher', col: '#fcd34d' },
  { at: 17.4, who: 'System', t: 'VENGEANCE MARK: Malrick · last known Low Road', col: RS },
  { at: 21.5, who: 'Party·Tolliver', t: 'six of us. he\'s not making it home', col: '#67e8f9' },
  { at: 24.2, who: 'World', t: 'A great presence stirs near Ashfall Bridge.', col: VI },
  { at: 27.8, who: 'Guild·Bram', t: 'ALL HANDS. random spawn is up. 22 hours, on the dot.', col: '#fcd34d' },
  { at: 30.6, who: 'System', t: 'Boss down. Loot → <Famous> · 54% pooled damage', col: GD },
  { at: 31.8, who: 'System', t: 'Node War: <Famous> take Ashfall · Champions (7d)', col: '#60a5fa' }
];
function Hud({ T, c, party, honor, hpFrac, flag }) {
  const lines = CHAT.filter((l) => T - c >= l.at).slice(-5);
  const cd = (period, off) => ((T - c + off) % period) / period;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* party frames */}
      <div style={{ position: 'absolute', left: 34, top: 34, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PARTY.slice(0, party).map((m, i) => {
          const e = MOTION.enter(c + (i === 0 ? 0 : 7.2 + i * 0.28))(T);
          const hp = i === 0 ? hpFrac : 0.82 + 0.15 * Math.sin(T * 0.9 + i);
          return (
            <div key={m.n} style={Object.assign(glass({ borderRadius: 14, padding: '8px 12px', width: 330, display: 'flex', gap: 10, alignItems: 'center' }), { opacity: e, transform: `translateX(${(1 - e) * -40}px)` })}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `radial-gradient(circle at 35% 30%, #fff, ${CLASS_COL[m.cls]} 45%, #0f172a 130%)`, border: '1px solid rgba(255,255,255,0.2)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 18, color: '#f1f5f9' }}>{m.n}</span><span style={{ fontFamily: MONO, fontSize: 12, color: CLASS_COL[m.cls] }}>{m.cls.toUpperCase()} {m.lv}</span></div>
                <div style={{ marginTop: 5, height: 7, borderRadius: 4, background: '#0f172a' }}><div style={{ width: `${hp * 100}%`, height: '100%', borderRadius: 4, background: i === 0 ? `linear-gradient(to right, ${RS}, #fb7185)` : GR }} /></div>
                <div style={{ marginTop: 3, height: 4, borderRadius: 2, background: '#0f172a' }}><div style={{ width: `${65 + 30 * Math.sin(T * 0.6 + i)}%`, height: '100%', borderRadius: 2, background: '#38bdf8' }} /></div>
              </div>
            </div>
          );
        })}
      </div>
      {/* honor / karma pill */}
      <div style={Object.assign(glass({ borderRadius: 14, padding: '10px 16px', position: 'absolute', left: 34, top: 34 + party * 72 + 8, display: 'flex', gap: 14, alignItems: 'center' }), { opacity: MOTION.enter(c + 0.6)(T) })}>
        <span style={label(GD, 15)}>PVP HONOR</span><span style={{ fontFamily: SANS, fontWeight: 900, fontSize: 24, color: '#f8fafc' }}>#{honor}</span>
        <span style={label(flag ? RS : '#64748b', 15)}>{flag ? 'FLAG · RAISED' : 'FLAG · DOWN'}</span>
      </div>
      {/* minimap */}
      <div style={Object.assign(glass({ borderRadius: 18, position: 'absolute', right: 34, top: 34, width: 250, height: 190, overflow: 'hidden' }), { opacity: MOTION.enter(c + 0.3)(T) })}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(37,99,235,0.12) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(37,99,235,0.12) 0 1px, transparent 1px 22px)' }} />
        <div style={{ position: 'absolute', left: 30, top: 28, width: 60, height: 48, border: `1.5px solid ${GD}`, borderRadius: 4, background: 'rgba(233,185,73,0.15)' }} />
        <div style={{ position: 'absolute', left: 150, top: 110, width: 56, height: 56, borderRadius: '50%', border: `1.5px solid ${VI}` }} />
        <div style={{ position: 'absolute', left: 122 + Math.sin(T * 0.3) * 6, top: 96, width: 8, height: 8, borderRadius: '50%', background: CY, boxShadow: `0 0 10px ${CY}` }} />
        <div style={Object.assign(label('#94a3b8', 12), { position: 'absolute', left: 12, bottom: 10 })}>LOW ROAD · NIGHTFALL 22%</div>
      </div>
      {/* chat */}
      <div style={{ position: 'absolute', left: 34, bottom: 130, width: 600, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {lines.map((l) => <div key={l.at} style={{ fontFamily: MONO, fontSize: 16, color: l.col, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 2px 6px #000', opacity: MOTION.enter(c + l.at, 0.35)(T) }}>[{l.who}] {l.t}</div>)}
      </div>
      {/* hotbar */}
      <div style={Object.assign(glass({ borderRadius: 16, padding: 8, position: 'absolute', right: 34, bottom: 34, display: 'flex', gap: 6 }), { opacity: MOTION.enter(c + 0.2)(T) })}>
        {[RS, RS, AM, CY, CY, GR, VI, PK, '#64748b', '#64748b'].map((col, i) => {
          const p = i === 0 ? cd(11, 6) : i === 1 ? cd(7, 2) : i === 3 ? cd(4, 0) : null;
          return (
            <div key={i} style={{ position: 'relative', width: 46, height: 46, borderRadius: 10, background: `linear-gradient(160deg, ${col}, #0f172a 140%)`, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
              {p != null ? <div style={{ position: 'absolute', inset: 0, background: `conic-gradient(rgba(2,6,23,0.75) ${p * 360}deg, transparent 0)` }} /> : null}
              <div style={Object.assign(label('#f8fafc', 12), { position: 'absolute', left: 6, top: 4 })}>{i + 1}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- beats ---------- */
function WorldMap({ T, c }) {
  const grow = MOTION.draw(c + 0.2, 1.4)(T), walk = MOTION.draw(c + 1.2, 3.2)(T);
  return (
    <div style={{ position: 'absolute', left: 200, top: 190, width: 960, height: 740, opacity: grow, transform: `scale(${1 + 0.04 * grow})` }}>
      <div style={glass({ position: 'absolute', inset: 0, borderRadius: 40, overflow: 'hidden' })}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(37,99,235,0.10) 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, rgba(37,99,235,0.10) 0 1px, transparent 1px 48px)' }} />
        <div style={{ position: 'absolute', left: 60, top: 60, width: 200, height: 170, background: 'rgba(233,185,73,0.16)', border: `2px solid ${GD}`, borderRadius: 14 }} />
        <div style={Object.assign(label(GD, 20), { position: 'absolute', left: 74, top: 240 })}>HAVEN · SAFE</div>
        {[{ x: 300, y: 150, w: 300, h: 210, n: 'RUST RIDGE', col: '#fb923c' }, { x: 250, y: 420, w: 340, h: 280, n: 'MISTFEN PLAINS', col: '#94a3b8' }, { x: 40, y: 470, w: 180, h: 230, n: 'GLOOMWOOD', col: VI }].map((z) => (
          <div key={z.n}><div style={{ position: 'absolute', left: z.x, top: z.y, width: z.w, height: z.h, border: `1.5px dashed ${z.col}`, borderRadius: 18, opacity: 0.75 }} /><div style={Object.assign(label(z.col, 19), { position: 'absolute', left: z.x + 14, top: z.y + 14 })}>{z.n}</div></div>
        ))}
        <div style={{ position: 'absolute', left: 620, top: 500, width: 260, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, #0e7490, #082f49)', border: `2px solid ${CY}` }} />
        <div style={{ position: 'absolute', left: 700, top: 120, width: 180, height: 180, borderRadius: '50%', border: `2px solid ${VI}`, background: 'rgba(245,158,11,0.08)' }} />
        <div style={Object.assign(label('#fde68a', 18), { position: 'absolute', left: 560, top: 84, whiteSpace: 'nowrap' })}>ASHFALL BRIDGE · RANDOM SPAWN</div>
        <svg width="960" height="740" style={{ position: 'absolute', inset: 0 }}><path d="M 160 150 C 300 300, 260 420, 430 300 S 520 200, 450 255" fill="none" stroke="rgba(34,211,238,0.5)" strokeWidth="3" strokeDasharray="10 10" /></svg>
        <div style={{ position: 'absolute', left: lerp(walk, 160, 450, Easing.easeInOutSine) - 9, top: lerp(walk, 150, 255, Easing.easeInOutSine) - 9, width: 18, height: 18, borderRadius: '50%', background: CY, boxShadow: `0 0 16px ${CY}` }} />
      </div>
      <div style={Object.assign(glass({ position: 'absolute', right: -140, bottom: -40, padding: '22px 30px', borderRadius: 24 }), { opacity: clamp((walk - 0.15) * 3, 0, 1) })}>
        <div style={label(CY, 22)}>HAVEN → RUST RIDGE</div>
        <div style={{ fontFamily: SANS, fontSize: 44, fontWeight: 800, color: '#e2e8f0', marginTop: 6 }}>an 8-minute walk</div>
        <div style={{ fontFamily: SANS, fontSize: 26, color: '#94a3b8', marginTop: 4 }}>Every single time. No teleport, ever.</div>
      </div>
    </div>
  );
}
function CombatBeat({ T, c }) {
  const hits = [0.35, 0.95, 1.6];
  const dodge = MOTION.draw(c + 2.6, 0.35)(T);
  return (
    <div style={{ position: 'absolute', left: 300, top: 230, width: 1320, height: 640 }}>
      <div style={glass({ position: 'absolute', inset: 0, borderRadius: 40 })} />
      <div style={{ position: 'absolute', left: 470 + dodge * 160, top: 300, width: 34, height: 34, borderRadius: '50%', background: CY, boxShadow: `0 0 22px ${CY}`, opacity: dodge > 0 && dodge < 1 ? 0.5 : 1 }} />
      <svg width="1320" height="640" style={{ position: 'absolute', inset: 0 }}>
        {hits.map((h, i) => { const p = MOTION.draw(c + h, 0.42)(T), fade = 1 - clamp((T - (c + h + 0.42)) / 0.5, 0, 1), r = i === 2 ? 190 : 140; return <path key={i} d={`M ${487 + r * Math.cos(-0.85)} ${317 + r * Math.sin(-0.85)} A ${r} ${r} 0 0 1 ${487 + r * Math.cos(0.85)} ${317 + r * Math.sin(0.85)}`} fill="none" stroke={i === 2 ? GD : CY} strokeWidth={i === 2 ? 14 : 7} strokeLinecap="round" strokeDasharray={r * 1.9} strokeDashoffset={r * 1.9 * (1 - p)} opacity={fade} />; })}
        <path d="M 720 380 L 560 310" stroke={RS} strokeWidth="6" strokeLinecap="round" opacity={fadeWin(T, c + 2.5, c + 3.0, 0.15)} />
      </svg>
      <Dmg T={T} at={c + 0.5} x={760} y={300} v="214" /><Dmg T={T} at={c + 1.1} x={860} y={290} v="231" /><Dmg T={T} at={c + 1.75} x={980} y={300} v="418" big />
      <div style={Object.assign(label(CY, 24), { position: 'absolute', left: 700, top: 420, opacity: fadeWin(T, c + 2.75, c + 4.2, 0.2) })}>PERFECT DODGE · I-FRAME</div>
      <div style={{ position: 'absolute', left: 60, bottom: 54, display: 'flex', gap: 14 }}>
        {['AIM THE ARC', 'DODGE = I-FRAMES', 'WHIFFS MISS', 'NO TAB TARGET'].map((k, i) => <div key={k} style={Object.assign(label('#cbd5e1', 21), { border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, padding: '12px 20px', opacity: MOTION.enter(c + 1.9 + i * 0.25, 0.5)(T) })}>{k}</div>)}
      </div>
      <div style={Object.assign(label(GD, 26), { position: 'absolute', right: 60, top: 54, opacity: MOTION.enter(c + 1.75, 0.5)(T) })}>COMBO FINISHER · 1.8×</div>
    </div>
  );
}
function DurabilityBeat({ T, c }) {
  const drain = MOTION.draw(c + 0.3, 1.9, 1, 0)(T), broke = T > c + 2.1, pick = MOTION.enter(c + 2.5)(T);
  return (
    <div style={{ position: 'absolute', left: 360, top: 250, width: 1200, height: 600 }}>
      <div style={glass({ position: 'absolute', inset: 0, borderRadius: 40 })} />
      {[{ n: 'WEAPON', v: drain }, { n: 'ARMOR', v: clamp(drain + 0.12, 0, 1) }].map((b, i) => (
        <div key={b.n} style={{ position: 'absolute', left: 70, top: 70 + i * 110, width: 700 }}>
          <div style={label('#64748b', 22)}>{b.n} DURABILITY</div>
          <div style={{ marginTop: 12, height: 26, borderRadius: 13, background: 'rgba(2,6,23,0.75)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${b.v * 100}%`, background: b.v < 0.02 ? RS : b.v < 0.28 ? GD : CY, boxShadow: `0 0 18px ${b.v < 0.28 ? GD : CY}` }} /></div>
        </div>
      ))}
      <div style={{ position: 'absolute', left: 70, top: 300, fontFamily: MONO, fontSize: 46, fontWeight: 700, color: RS, opacity: broke ? 0.6 + 0.4 * Math.sin(T * 9) : 0 }}>BROKEN · DAMAGE HALVED</div>
      <div style={{ position: 'absolute', left: 70, top: 390, width: 700, fontFamily: SANS, fontSize: 27, color: '#94a3b8', lineHeight: 1.5, opacity: pick }}>Wear is the only tax. Upgrades never fail backward — no gear ever breaks, downgrades, or gambles away what you earned.</div>
      <div style={{ position: 'absolute', right: 70, top: 70, width: 380, display: 'flex', flexDirection: 'column', gap: 16, opacity: pick, transform: `translateY(${(1 - pick) * 30}px)` }}>
        <div style={{ background: 'rgba(2,6,23,0.6)', border: `1px solid ${GD}66`, borderRadius: 20, padding: 22 }}><div style={label(GD, 20)}>WALK TO HAVEN</div><div style={{ fontFamily: SANS, fontSize: 32, fontWeight: 700, color: '#e2e8f0', marginTop: 6 }}>Cheap in Sols</div><div style={{ fontFamily: SANS, fontSize: 22, color: '#94a3b8' }}>Costs you time.</div></div>
        <div style={{ background: 'rgba(34,211,238,0.08)', border: `1px solid ${CY}66`, borderRadius: 20, padding: 22, boxShadow: '0 0 24px rgba(34,211,238,0.18)' }}><div style={label(CY, 20)}>FABLE ANVIL · NEEDS</div><div style={{ fontFamily: SANS, fontSize: 32, fontWeight: 700, color: '#e2e8f0', marginTop: 6 }}>Repair anywhere</div><div style={{ fontFamily: SANS, fontSize: 22, color: '#94a3b8' }}>5 red · 5 blue. Never unlimited.</div></div>
      </div>
    </div>
  );
}

/* ---- the layered gameplay capture (Dragonclaw → Prestige) ---- */
function GameCapture({ T, C }) {
  const c = C.Dragonclaw;
  const t = T - c;
  // camera: slow push-in + hit shake on the AOE
  const push = 1 + 0.05 * clamp(t / 30, 0, 1);
  const shakeT = clamp(T - (c + 2.1), 0, 0.6);
  const shake = shakeT < 0.6 ? Math.sin(shakeT * 60) * (1 - shakeT / 0.6) * 9 : 0;
  // player + HP-fuelled AOE
  const drainP = MOTION.draw(c + 1.4, 0.6)(T);
  const hpFrac = 1 - 0.10 * drainP;
  const aoe = MOTION.draw(c + 2.0, 0.55)(T);
  const mobs = [[1180, 520], [1300, 620], [1090, 680], [1250, 760], [1200, 440]];
  // party arrives (Party beat)
  const arrive = (i) => MOTION.draw(C.Party + 0.2 + i * 0.25, 0.9)(T);
  const partyN = T >= C.Party ? 6 : 1;
  // rival for PvP → becomes the vengeance target
  const rivalIn = MOTION.draw(C.PvP + 0.3, 0.9)(T);
  const rivalRed = T > C.PvP + 2.2;
  const rivalX = lerp(rivalIn, 1900, 1290, Easing.easeOutCubic) + (T > C.Vengeance ? lerp(MOTION.draw(C.Vengeance + 3.6, 1.6)(T), 0, 520, Easing.easeInCubic) : 0);
  const rivalHp = T > C.Vengeance + 4.6 ? clamp(1 - (T - C.Vengeance - 4.6) * 1.6, 0, 1) : 1;
  const rivalDead = rivalHp <= 0;
  // guild fight crowd
  const crowd = MOTION.draw(C.GuildFight + 0.6, 1.4)(T);
  const champ = T > C.GuildFight + 4.2;
  const flagUp = T > C.PvP + 0.8;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${shake}px, ${shake * 0.6}px) scale(${push})`, transformOrigin: '55% 60%' }}>
        <WorldLayer T={T} c={c} tint={T > C.GuildFight ? 'rgba(180,83,9,0.45)' : 'rgba(14,116,144,0.45)'} />
        {/* mobs pack — die on the AOE */}
        {mobs.map(([mx, my], i) => { const dead = clamp((T - (c + 2.25 + i * 0.05)) / 0.4, 0, 1); return <Token key={i} T={T} x={mx} y={my} r={22} color="#94a3b8" name={`Mist Golem L${58 + i}`} hp={1 - dead} faint={1 - dead} />; })}
        {/* AOE ring — fuelled by HP */}
        <div style={{ position: 'absolute', left: 960 - 330 * aoe, top: 600 - 330 * aoe * 0.55, width: 660 * aoe, height: 660 * aoe * 0.55, borderRadius: '50%', border: `${8 * (1 - aoe) + 3}px solid ${RS}`, boxShadow: `0 0 ${60 * aoe}px ${RS}, inset 0 0 ${80 * aoe}px rgba(244,63,94,0.4)`, opacity: aoe > 0 && aoe < 1 ? 1 : 0 }} />
        {/* claw swipes */}
        <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
          {[0, 1].map((k) => { const p = MOTION.draw(c + 1.95 + k * 0.18, 0.3)(T); const r = 250 + k * 40; return <path key={k} d={`M ${960 + r * Math.cos(-1.2 + k * 0.4)} ${600 + r * 0.55 * Math.sin(-1.2 + k * 0.4)} A ${r} ${r * 0.55} 0 0 1 ${960 + r * Math.cos(1.2 + k * 0.4)} ${600 + r * 0.55 * Math.sin(1.2 + k * 0.4)}`} fill="none" stroke={k ? '#fb7185' : RS} strokeWidth="16" strokeLinecap="round" strokeDasharray={r * 2.4} strokeDashoffset={r * 2.4 * (1 - p)} opacity={fadeWin(T, c + 1.95 + k * 0.18, c + 2.55 + k * 0.18, 0.12)} />; })}
        </svg>
        {/* damage numbers */}
        {mobs.map(([mx, my], i) => <Dmg key={'d' + i} T={T} at={c + 2.2 + i * 0.07} x={mx} y={my - 40} v={[164530, 158812, 171904, 149260, 166007][i].toLocaleString()} big={i === 0} />)}
        {/* party */}
        {PARTY.slice(1).map((m, i) => { const a = arrive(i); const tx = [660, 800, 580, 880, 720][i], ty = [500, 700, 720, 590, 840][i]; return <Token key={m.n} T={T} x={lerp(a, tx - 900, tx)} y={ty} r={24} color={CLASS_COL[m.cls]} name={m.n} guild="Famous" guildColor={GR} faint={a} />; })}
        {/* buff burst */}
        <div style={{ position: 'absolute', left: 960 - 260, top: 640 - 140, width: 520, height: 280, borderRadius: '50%', border: `3px solid ${GR}`, boxShadow: `0 0 40px ${GR}`, opacity: fadeWin(T, C.Party + 1.9, C.Party + 3.2, 0.3), transform: `scale(${0.6 + 0.6 * MOTION.draw(C.Party + 1.9, 1.2)(T)})` }} />
        {/* rival / vengeance target */}
        {!rivalDead ? <Token T={T} x={rivalX} y={560} r={26} color="#64748b" name="Malrick" guild="Ashfall Reavers" guildColor="#f87171" red={rivalRed} hp={rivalHp} faint={rivalIn} /> : null}
        <Dmg T={T} at={C.Vengeance + 4.7} x={rivalX} y={520} v="162,313" big />
        <div style={{ position: 'absolute', left: rivalX - 34, top: 560 - 10, width: 68, height: 20, borderRadius: 10, background: GD, boxShadow: `0 0 26px ${GD}`, opacity: rivalDead ? 1 : 0 }} />
        {/* guild crowd */}
        {[...Array(14)].map((_, i) => { const side = i % 2; const bx = side ? 1560 + (i % 7) * 95 : 40 + (i % 7) * 95; const by = 380 + ((i * 53) % 330); const gx = lerp(crowd, bx, bx + (side ? -300 : 300), Easing.easeInOutCubic); return <Token key={'g' + i} T={T} x={gx} y={by} r={18} color={side ? '#f87171' : GR} name={side ? ['Vane', 'Korr', 'Dusk', 'Ilex', 'Roan', 'Pell', 'Sable'][i % 7] : ['Ashe', 'Brind', 'Cael', 'Dara', 'Eryn', 'Fenn', 'Gale'][i % 7]} guild={side ? 'Ashfall Reavers' : 'Famous'} guildColor={side ? '#f87171' : GR} faint={crowd} champion={champ && !side} />; })}
        {/* the boss at the random spawn */}
        <div style={{ position: 'absolute', left: 960 - 90, top: 300, width: 180, height: 180, opacity: crowd }}><Orb T={T} x={90} y={90} size={180} mode="prime" rings={3} /></div>
        {/* player */}
        <Token T={T} x={960} y={640} r={30} color={RS} name="JoshinYa" guild="Famous" guildColor={GR} icons={T > C.Prestige - 0.5 ? [GD, RS, CY, '#60a5fa'] : [GD, RS]} hp={hpFrac} ring={flagUp ? RS : GD} champion={champ} />
        <Dmg T={T} at={c + 1.45} x={960} y={560} v="−10% HP" color={RS} />
      </div>
      {/* skill card (Dragonclaw) */}
      <div style={Object.assign(glass({ position: 'absolute', right: 34, top: 250, width: 430, padding: 22, borderRadius: 20, border: `1px solid ${RS}55` }), { opacity: fadeWin(T, c + 0.4, C.Party - 0.4, 0.4), transform: `translateY(${(1 - MOTION.enter(c + 0.4)(T)) * 30}px)` })}>
        <div style={label(RS, 16)}>DRAGONCLAW · VITALITY PATH</div>
        <div style={{ fontFamily: SANS, fontSize: 32, fontWeight: 900, fontStyle: 'italic', color: '#fecdd3', marginTop: 6 }}>FOREFOOT REND · Lv 7</div>
        <div style={{ fontFamily: MONO, fontSize: 16, color: '#cbd5e1', lineHeight: 1.7, marginTop: 10 }}>Drains 10% of your HP.<br />Deals 390% × 2 of drained HP.<br />15m AOE · reactivation 11s.</div>
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, background: 'rgba(244,63,94,0.10)', border: `1px solid ${RS}55`, opacity: MOTION.enter(c + 3.0, 0.5)(T) }}><div style={label('#fda4af', 14)}>THIS SWING</div><div style={{ fontFamily: MONO, fontSize: 19, color: '#f8fafc', marginTop: 4, lineHeight: 1.6 }}>210,000 HP × 10% = 21,000 drained<br />21,000 × 390% × 2 = <b style={{ color: '#fb7185' }}>163,800</b> per target · ×5</div></div>
        <div style={{ fontFamily: SANS, fontSize: 21, color: '#94a3b8', marginTop: 12, lineHeight: 1.45 }}>The melee class where health is the weapon. Full vitality, no ranged crutch — your HP bar is your damage stat.</div>
      </div>
      {/* party buff card */}
      <div style={Object.assign(glass({ position: 'absolute', right: 34, top: 250, width: 430, padding: 22, borderRadius: 20, border: `1px solid ${GR}55` }), { opacity: fadeWin(T, C.Party + 1.6, C.PvP - 0.3, 0.4) })}>
        <div style={label(GR, 16)}>PARTY · 6 / 6 · BUFFS ACTIVE</div>
        {[['Vitality Hymn', '+12% max HP · Focus'], ['Ironwall', '+8% defense · Hammer'], ['Hawkeye', '+10% crit · Bow'], ['Longstride', '+15% move · Spear']].map(([n, b], i) => <div key={n} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, opacity: MOTION.enter(C.Party + 2.0 + i * 0.2, 0.4)(T) }}><span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 21, color: '#f1f5f9' }}>{n}</span><span style={label('#94a3b8', 15)}>{b}</span></div>)}
        <div style={{ fontFamily: SANS, fontSize: 21, color: '#94a3b8', marginTop: 14, lineHeight: 1.45 }}>Solo is viable. Groups are dominant. Small elite guilds win on knowledge, not headcount.</div>
      </div>
      {/* PvP card */}
      <div style={Object.assign(glass({ position: 'absolute', right: 34, top: 250, width: 430, padding: 22, borderRadius: 20, border: `1px solid ${RS}55` }), { opacity: fadeWin(T, C.PvP + 0.5, C.Vengeance - 0.3, 0.4) })}>
        <div style={label(RS, 16)}>OPEN-WORLD PVP · OPT-IN FLAG</div>
        <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 900, fontStyle: 'italic', color: '#fecdd3', marginTop: 6 }}>{rivalRed ? 'MALRICK WENT RED' : 'A FISHER GETS JUMPED'}</div>
        <div style={{ fontFamily: SANS, fontSize: 21, color: '#94a3b8', marginTop: 12, lineHeight: 1.5 }}>Three kills turns a name red. Guards one-shot reds. Death spills half the bag. And now there is a mark on him.</div>
      </div>
      {/* Vengeance panel */}
      <div style={Object.assign(glass({ position: 'absolute', right: 34, top: 250, width: 520, padding: 22, borderRadius: 20, border: `1px solid ${GD}66` }), { opacity: fadeWin(T, C.Vengeance + 0.2, C.GuildFight - 0.3, 0.4) })}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}><span style={label(GD, 16)}>VENGEANCE · HIT LIST</span><span style={label('#64748b', 14)}>KILLED</span><span style={label('#f8fafc', 14)}>KILLED BY</span></div>
        {[['Malrick (Ashfall Reavers)', 'Low Road · 4 min ago', true], ['Sable (Ashfall Reavers)', 'Rust Ridge · 2 d ago', false], ['Korr', 'Mistfen · 6 d ago', false]].map(([n, w, hot], i) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: '10px 12px', borderRadius: 12, background: hot ? 'rgba(244,63,94,0.12)' : 'rgba(2,6,23,0.5)', border: `1px solid ${hot ? RS + '66' : 'rgba(255,255,255,0.08)'}`, opacity: MOTION.enter(C.Vengeance + 0.5 + i * 0.2, 0.4)(T) }}>
            <div><div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 20, color: hot ? '#fecdd3' : '#e2e8f0' }}>{n}</div><div style={label('#94a3b8', 13)}>LAST KNOWN · {w}</div></div>
            <div style={Object.assign(label(hot ? RS : '#64748b', 13), { border: `1px solid ${hot ? RS : '#334155'}`, borderRadius: 8, padding: '6px 10px' })}>{hot ? 'MARK ACTIVE' : 'EXPIRED'}</div>
          </div>
        ))}
        <div style={{ fontFamily: SANS, fontSize: 20, color: '#94a3b8', marginTop: 14, lineHeight: 1.5, opacity: MOTION.enter(C.Vengeance + 1.4)(T) }}>No teleport-to-target. You get intelligence — last seen, heading, how long ago — and up to <b style={{ color: '#f8fafc' }}>five friends</b>. Cities and beginner zones are sanctuary. Everywhere else is open season.</div>
        <div style={Object.assign(label('#60a5fa', 15), { marginTop: 12, opacity: fadeWin(T, C.Vengeance + 5.3, C.GuildFight + 1, 0.3) })}>TITLE EARNED · COLD DISH — vengeance completed 7 days after the kill</div>
      </div>
      {/* Guild fight card */}
      <div style={Object.assign(glass({ position: 'absolute', right: 34, top: 250, width: 470, padding: 22, borderRadius: 20, border: `1px solid ${VI}66` }), { opacity: fadeWin(T, C.GuildFight + 0.3, C.Prestige - 0.3, 0.4) })}>
        <div style={label('#fde68a', 16)}>RANDOM SPAWN · EVERY 22 HOURS</div>
        <div style={{ fontFamily: MONO, fontSize: 54, fontWeight: 700, color: '#f8fafc', marginTop: 4, letterSpacing: '0.04em' }}>{T < C.GuildFight + 1.6 ? `00:00:0${Math.max(0, Math.ceil(1.6 - (T - C.GuildFight)))}` : 'SPAWNED'}</div>
        <div style={{ fontFamily: SANS, fontSize: 21, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>Every guild knows the clock. Nobody knows the place. And the loot goes to the party that did the most damage — pooled, with a party modifier. Every drop in the game works that way.</div>
        <div style={{ marginTop: 12, opacity: MOTION.enter(C.GuildFight + 2.2, 0.5)(T) }}><div style={label('#94a3b8', 14)}>DAMAGE CONTRIBUTION · PARTY POOLED</div>{[['Famous', GR, MOTION.draw(C.GuildFight + 2.4, 1.6, 0, 0.54)(T)], ['Ashfall Reavers', '#f87171', MOTION.draw(C.GuildFight + 2.4, 1.6, 0, 0.46)(T)]].map(([g, col, v]) => <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}><span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 18, color: '#f1f5f9', width: 150 }}>&lt;{g}&gt;</span><div style={{ flex: 1, height: 10, borderRadius: 5, background: 'rgba(2,6,23,0.7)' }}><div style={{ width: `${v * 100}%`, height: '100%', borderRadius: 5, background: col, boxShadow: `0 0 10px ${col}` }} /></div><span style={{ fontFamily: MONO, fontSize: 16, color: col, width: 52, textAlign: 'right' }}>{Math.round(v * 100)}%</span></div>)}<div style={Object.assign(label(GD, 14), { marginTop: 6, opacity: MOTION.enter(C.GuildFight + 4.0, 0.4)(T) })}>LOOT → &lt;FAMOUS&gt; · 1.15× PARTY MODIFIER</div></div>
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(96,165,250,0.5)', opacity: MOTION.enter(C.GuildFight + 4.2, 0.5)(T) }}>
          <div style={label('#60a5fa', 15)}>NODE WAR · CHAMPIONS OF ASHFALL · 7 DAYS</div>
          <div style={{ fontFamily: SANS, fontSize: 21, color: '#dbeafe', marginTop: 4 }}>The blue flame. Earned only. Never sold.</div>
        </div>
      </div>
      {/* Prestige inspect */}
      <div style={Object.assign(glass({ position: 'absolute', right: 34, top: 250, width: 470, padding: 22, borderRadius: 20, border: `1px solid ${GD}66` }), { opacity: fadeWin(T, C.Prestige + 0.2, C.Pets - 0.3, 0.4) })}>
        <div style={label(GD, 16)}>INSPECT · JoshinYa · PRESTIGE SHOWCASE 4 / 5</div>
        {[[GD, 'PvP Honor · Rank 1', '47,312 player kills'], [RS, 'Vengeance Hunter', '23 active claims · Untouchable ×50'], [CY, 'First Clear', 'CrossEyed Duo · world first'], ['#60a5fa', 'Node War Champion', 'Ashfall · this week']].map(([col, n, b], i) => (
          <div key={n} style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 12, opacity: MOTION.enter(C.Prestige + 0.5 + i * 0.3, 0.4)(T) }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: col, boxShadow: `0 0 14px ${col}`, flexShrink: 0 }} />
            <div><div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 21, color: '#f1f5f9' }}>{n}</div><div style={label('#94a3b8', 14)}>{b}</div></div>
          </div>
        ))}
        <div style={{ fontFamily: SANS, fontSize: 21, color: '#94a3b8', marginTop: 14, lineHeight: 1.5 }}>Walking résumé. Pick 3–5 to wear above your head; the full record lives on inspect. <b style={{ color: '#f8fafc' }}>None purchasable.</b></div>
      </div>
      <Hud T={T} c={c} party={partyN} honor={T > C.Prestige ? 1 : 3} hpFrac={hpFrac} flag={flagUp} />
    </div>
  );
}

function PetsBeat({ T, c }) {
  const e = MOTION.enter(c + 0.2, 0.8)(T);
  const fire = 0.7 + 0.3 * Math.sin(T * 11);
  return (
    <div style={{ position: 'absolute', left: 200, top: 250, width: 1520, height: 600, opacity: e }}>
      {[['NPC DRAGON', 'From the Beastmaster · Sols', '#94a3b8', false], ['EMBER DRAGON', 'NEEDS · cosmetic variant', '#fb923c', true]].map(([n, s, col, prem], i) => (
        <div key={n} style={glass({ position: 'absolute', left: i * 780, top: 0, width: 740, height: 460, borderRadius: 36, border: `1px solid ${prem ? col + '88' : 'rgba(255,255,255,0.1)'}`, transform: `translateY(${(1 - e) * 40}px)` })}>
          <div style={{ position: 'absolute', left: 300, top: 120, width: 140, height: 140 }}>
            {prem ? <div style={{ position: 'absolute', inset: -40, borderRadius: '50%', background: `radial-gradient(circle, rgba(251,146,60,${0.55 * fire}), rgba(244,63,94,${0.25 * fire}) 45%, transparent 70%)`, transform: `scaleY(${1.2 + 0.15 * Math.sin(T * 8)})` }} /> : null}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50% 50% 50% 12px', background: `radial-gradient(circle at 35% 30%, #fff, ${col} 45%, #0f172a 130%)`, boxShadow: `0 0 ${prem ? 40 : 14}px ${col}`, transform: `rotate(${Math.sin(T * 2 + i) * 6}deg)` }} />
          </div>
          <div style={Object.assign(label(col, 20), { position: 'absolute', left: 40, top: 36 })}>{n}</div>
          <div style={{ position: 'absolute', left: 40, top: 66, fontFamily: SANS, fontSize: 22, color: '#94a3b8' }}>{s}</div>
          <div style={{ position: 'absolute', left: 40, bottom: 36, right: 40, padding: '14px 18px', borderRadius: 16, background: 'rgba(2,6,23,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={label('#64748b', 15)}>GAMEPLAY EFFECT</div>
            <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginTop: 4 }}>Auto-loot · +5% gather speed · feed every 6h</div>
            <div style={Object.assign(label(prem ? col : GR, 15), { marginTop: 6 })}>{prem ? 'IDENTICAL CEILING · fire, roars, plays with other pets, 12h auto-feed' : 'THE BASELINE EVERYONE GETS'}</div>
          </div>
        </div>
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 500, textAlign: 'center', fontFamily: SANS, fontSize: 40, fontWeight: 900, fontStyle: 'italic', color: '#f8fafc', opacity: MOTION.enter(c + 1.6)(T) }}>SAME POWER. DIFFERENT PRESENTATION.</div>
    </div>
  );
}
function CompanionBeat({ T, c }) {
  const tiers = ['MURMUR', 'WHISPER', 'VOICE', 'CHORUS', 'ULTRACODE'];
  const p = MOTION.draw(c + 0.3, 3.6)(T), idx = clamp(Math.floor(p * 5), 0, 4);
  return (
    <div style={{ position: 'absolute', left: 240, top: 700, width: 1440, height: 260 }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 96, height: 4, background: 'rgba(255,255,255,0.1)' }} />
      <div style={{ position: 'absolute', left: 0, top: 96, height: 4, width: `${p * 100}%`, background: `linear-gradient(to right, ${CY}, ${GD})`, boxShadow: `0 0 18px ${CY}` }} />
      {tiers.map((tn, i) => { const on = i <= idx; return <div key={tn} style={{ position: 'absolute', left: `${i * 25}%`, top: 60, transform: 'translateX(-50%)', textAlign: 'center', width: 240 }}><div style={{ margin: '0 auto', width: 26 + i * 6, height: 26 + i * 6, borderRadius: '50%', background: on ? (i === 4 ? GD : CY) : 'rgba(255,255,255,0.14)', boxShadow: on ? `0 0 20px ${i === 4 ? GD : CY}` : 'none' }} /><div style={Object.assign(label(on ? (i === 4 ? GD : '#a5f3fc') : '#475569', 21), { marginTop: 16 })}>{tn}</div><div style={Object.assign(label('#475569', 17), { marginTop: 5 })}>LV {[1, 5, 10, 15, 20][i]}</div></div>; })}
      <div style={{ position: 'absolute', left: 0, top: 210, fontFamily: SANS, fontSize: 27, color: '#67e8f9', fontStyle: 'italic' }}>{['"...water. nearby. listen."', '"Your blade is thinning. Haven is a walk, not a wish."', '"Malrick again. Third time this week. Want the party list?"', '"Last Nightfall you ran. You\'re stronger than that dreamer now."', '"You know. I\'ll just watch."'][idx]}</div>
    </div>
  );
}
function PrimeBeat({ T, c }) {
  const ov = ((T - c - 1.0) % 2.4) / 2.4, flash = T > c + 1.0 ? clamp(1 - Math.abs(ov - 0.08) * 14, 0, 1) : 0;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 30%, rgba(251,146,60,${flash * 0.55}), rgba(233,185,73,${flash * 0.25}) 50%, transparent 80%)` }} />
      <div style={{ position: 'absolute', left: 140, top: 640, width: 900 }}><div style={label(RS, 24)}>SUP@ PRIME · RAGE: CONTEXT OVERFLOW</div><div style={{ fontFamily: SANS, fontSize: 46, fontWeight: 900, fontStyle: 'italic', color: '#fda4af', marginTop: 10 }}>A screen-wide one-shot</div><div style={{ fontFamily: SANS, fontSize: 27, color: '#cbd5e1', marginTop: 10, lineHeight: 1.5 }}>Block it, i-frame through it, or stand in a ring-shadow. Nobody finishes it alone — the @-mark makes solo impossible by design.</div></div>
    </div>
  );
}
function ModelBeat({ T, c }) {
  const cols = [['FREE TO PLAY', 'Every zone, every boss, every level. Free for the kids who can\'t pay.', GR], ['NEEDS = CONVENIENCE', 'Fable Anvil, storage, auto-feed, cosmetics with visible perks. ~2× what patience costs.', CY], ['NEVER POWER', 'No loot boxes. No stat purchases. Nothing in the shop wins a fight.', GD], ['NO GAMBLING UPGRADES', 'Enhancement never fails backward. No gear breaks. No repair-the-repair loop.', RS]];
  return (
    <div style={{ position: 'absolute', left: 120, top: 300, width: 1680, display: 'flex', gap: 20 }}>
      {cols.map(([h, b, col], i) => { const e = MOTION.enter(c + 0.3 + i * 0.3, 0.7)(T); return <div key={h} style={glass({ flex: 1, borderRadius: 30, padding: 32, opacity: e, transform: `translateY(${(1 - e) * 40}px)`, border: `1px solid ${col}44` })}><div style={label(col, 22)}>{h}</div><div style={{ fontFamily: SANS, fontSize: 27, color: '#e2e8f0', marginTop: 18, lineHeight: 1.45 }}>{b}</div></div>; })}
    </div>
  );
}

/* ---------- the piece ---------- */
function DreamPitchV2() {
  const { T, CUES: C, authoredTotal } = useComposition();
  const path = [
    { at: 0, x: 960, y: 540, s: 300, r: 3 }, { at: C.World, x: 1680, y: 300, s: 150, r: 1 }, { at: C.Combat, x: 1700, y: 240, s: 130, r: 1 },
    { at: C.Durability, x: 1740, y: 900, s: 130, r: 2 }, { at: C.Dragonclaw, x: 1780, y: 980, s: 90, r: 2 },
    { at: C.Pets, x: 960, y: 140, s: 150, r: 3 }, { at: C.Companion, x: 960, y: 380, s: 420, r: 3 }, { at: C.Prime, x: 960, y: 330, s: 470, r: 3 },
    { at: C.Model, x: 960, y: 170, s: 170, r: 3 }, { at: C.Close, x: 960, y: 330, s: 260, r: 3 }
  ];
  let ci = 0;
  for (let i = 0; i < path.length; i++) if (T >= path[i].at) ci = i;
  const cur = path[ci], prev = path[Math.max(0, ci - 1)];
  const ez = Easing.easeInOutCubic(clamp((T - cur.at) / 1.0, 0, 1));
  const orb = { x: prev.x + (cur.x - prev.x) * ez, y: prev.y + (cur.y - prev.y) * ez, s: prev.s + (cur.s - prev.s) * ez, r: T >= C.Companion ? 3 : cur.r };
  const prime = T >= C.Prime && T < C.Model;
  const inCapture = T >= C.Dragonclaw && T < C.Pets;
  const gridOn = MOTION.draw(0.3, 1.4)(T);
  const openScale = lerp(MOTION.draw(0.2, 1.6)(T), 1.18, 1, Easing.easeOutCubic);
  const openOpacity = clamp(MOTION.draw(0.4, 1.1)(T), 0, 1) * (1 - clamp((T - (C.World - 0.7)) / 0.7, 0, 1));
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#020617', fontFamily: SANS, color: '#e2e8f0', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: gridOn }}><window.DotField T={T} id="pdf" pitch={18} dotR={1.15} focus="edges" /></div>
      <div style={{ position: 'absolute', inset: 0, opacity: gridOn, background: `radial-gradient(ellipse at 14% 0%, ${prime ? 'rgba(251,146,60,0.18)' : 'rgba(34,211,238,0.13)'}, transparent 52%), radial-gradient(ellipse at 86% 100%, rgba(233,185,73,0.10), transparent 52%)` }} />

      <Shot from={C.Dragonclaw} to={C.Pets}><GameCapture T={T} C={C} /></Shot>
      {!inCapture ? <Orb T={T} x={orb.x} y={orb.y} size={orb.s} mode={prime ? 'prime' : 'guide'} rings={orb.r} /> : null}
      <Wordmark scale={openScale} opacity={openOpacity} sub="IT WAS ALL A DREAM" subOpacity={MOTION.draw(1.5, 0.9)(T)} />

      <Shot from={C.World} to={C.Combat}><WorldMap T={T} c={C.World} /></Shot>
      <Shot from={C.Combat} to={C.Durability}><CombatBeat T={T} c={C.Combat} /></Shot>
      <Shot from={C.Durability} to={C.Dragonclaw}><DurabilityBeat T={T} c={C.Durability} /></Shot>
      <Shot from={C.Pets} to={C.Companion}><PetsBeat T={T} c={C.Pets} /></Shot>
      <Shot from={C.Companion} to={C.Prime}><CompanionBeat T={T} c={C.Companion} /></Shot>
      <Shot from={C.Prime} to={C.Model}><PrimeBeat T={T} c={C.Prime} /></Shot>
      <Shot from={C.Model} to={C.Close}><ModelBeat T={T} c={C.Model} /></Shot>
      <Shot from={C.Close} to={authoredTotal}>
        <Wordmark top size={118} scale={1} opacity={clamp((T - C.Close - 0.3) / 0.9, 0, 1)} sub={'AN OPEN WORLD THAT REMEMBERS YOU · FREE FOR THE KIDS WHO CAN\'T PAY'} subOpacity={clamp((T - C.Close - 1.0) / 0.8, 0, 1)} />
        <div style={Object.assign(label('#64748b', 24), { position: 'absolute', left: 0, right: 0, bottom: 90, textAlign: 'center', opacity: clamp((T - C.Close - 1.6) / 0.8, 0, 1) })}>BACK THE BUILD · FIRST GATE IS PLAYABLE NOW</div>
      </Shot>

      <Captions items={[
        { at: C.World + 0.4, text: 'One world. No instances. No fast travel — ever.' },
        { at: C.Combat + 0.4, text: 'Action combat: aim the arc, dodge the tell, whiff and pay for it.' },
        { at: C.Durability + 0.4, text: 'Gear wears, never breaks. Upgrades never fail backward.' },
        { at: C.Dragonclaw + 0.4, text: 'DRAGONCLAW — the melee class whose HP bar is its damage stat.' },
        { at: C.Party + 0.4, text: 'Solo is viable. A six-stack of an elite guild is a different animal.' },
        { at: C.PvP + 0.4, text: 'PvP is opt-in. Three kills makes you prey.' },
        { at: C.Vengeance + 0.4, text: 'Vengeance: a mark, last-known intel, five friends. No teleport. Cold dishes served.' },
        { at: C.GuildFight + 0.4, text: 'Every 22 hours a boss drops somewhere. Most pooled damage takes the loot — every drop works that way.' },
        { at: C.Prestige + 0.4, text: 'Prestige you can see from across town — and cannot buy.' },
        { at: C.Pets + 0.4, text: 'Premium pets look like raid bosses. They hit like the free ones.' },
        { at: C.Companion + 0.3, text: 'Sup@ remembers you — and grows for a thousand hours.' },
        { at: C.Prime + 0.3, text: 'One day it wakes up. Nobody finishes it alone.' },
        { at: C.Model + 0.3, text: 'Free to play. Paid convenience. Nothing that buys a win.' },
        { at: C.Close + 0.4, until: authoredTotal, text: '' }
      ]} />
    </div>
  );
}
window.DreamPitchV2 = DreamPitchV2;
