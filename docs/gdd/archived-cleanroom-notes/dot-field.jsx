/* DotField — layered drifting dot-matrix backdrop. Pure function of T (exports cleanly);
   LiveDotField wraps it with its own clock for non-video surfaces.
   Layers: grid (mask, slow drift) → bright clusters → color clusters → hue sweep → particles → vignette */
(function () {
  const React = window.React;
  const PAL = { cyan: '#22d3ee', gold: '#e9b949', emerald: '#34d399', amber: '#fbbf24', rose: '#f43f5e', white: '#e2e8f0' };
  const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const wrap = (v, m) => ((v % m) + m) % m;
  const DEFAULT_COLORS = ['cyan', 'gold', 'emerald', 'cyan', 'gold', 'amber', 'emerald', 'cyan', 'rose', 'gold', 'cyan', 'emerald'];

  function DotField(props) {
    const T = +props.T || 0, W = props.width || 1920, H = props.height || 1080;
    const id = props.id || 'df', pitch = props.pitch || 18, r = props.dotR || 1.15;
    const dim = props.dim == null ? 1 : props.dim;
    const focus = props.focus || 'edges';
    const colors = props.colors || DEFAULT_COLORS;
    const gx = wrap(T * 3.2, pitch), gy = wrap(T * 1.6, pitch);
    const M = 260;
    const bright = [];
    for (let i = 0; i < 6; i++) {
      const ax = 160 + hash(i, 3) * 260, ay = 90 + hash(i, 4) * 200;
      bright.push({
        x: wrap(hash(i, 1) * W + ax * Math.sin(T * (0.05 + hash(i, 5) * 0.09) + i) + T * 7, W + M * 2) - M,
        y: hash(i, 2) * H + ay * Math.cos(T * (0.04 + hash(i, 6) * 0.08) + i * 1.7),
        r: 210 + hash(i, 7) * 220,
        o: 0.34 + 0.28 * Math.sin(T * (0.25 + hash(i, 8) * 0.4) + i * 2.1)
      });
    }
    const blobs = [];
    for (let i = 0; i < colors.length; i++) {
      const ax = 120 + hash(i, 13) * 300, ay = 80 + hash(i, 14) * 220;
      const dir = i % 2 ? 1 : -1;
      blobs.push({
        c: colors[i],
        x: wrap(hash(i, 11) * W + ax * Math.sin(T * (0.08 + hash(i, 15) * 0.12) + i) + T * 14 * dir, W + M * 2) - M,
        y: wrap(hash(i, 12) * H + ay * Math.cos(T * (0.06 + hash(i, 16) * 0.1) + i * 1.3) + T * 4 * (i % 3 - 1), H + M * 2) - M,
        r: 95 + hash(i, 17) * 150,
        o: 0.42 + 0.42 * Math.sin(T * (0.35 + hash(i, 18) * 0.5) + i * 1.9)
      });
    }
    // slow hue sweep: two wide bands crossing the field in ~40s, cyan one way, gold the other
    const sweep = [
      { c: 'cyan', x: wrap(T * 48, W + 1200) - 600, y: H * 0.35, r: 520, o: 0.22 },
      { c: 'gold', x: W - (wrap(T * 36 + 700, W + 1200) - 600), y: H * 0.7, r: 480, o: 0.18 }
    ];
    const particles = [];
    for (let i = 0; i < 26; i++) {
      const sp = 9 + hash(i, 21) * 16;
      particles.push({
        c: colors[i % colors.length],
        x: hash(i, 22) * W + 22 * Math.sin(T * (0.4 + hash(i, 23) * 0.5) + i),
        y: wrap(hash(i, 24) * H - T * sp, H + 80) - 40,
        r: 1.5 + hash(i, 25) * 1.4,
        o: 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(T * (0.8 + hash(i, 26)) + i * 2.3))
      });
    }
    const center = focus === 'center';
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={Object.assign({ position: 'absolute', inset: 0, display: 'block' }, props.style || {})}>
        <defs>
          <pattern id={id + 'p'} width={pitch} height={pitch} patternUnits="userSpaceOnUse" patternTransform={`translate(${gx.toFixed(2)} ${gy.toFixed(2)})`}>
            <circle cx={pitch / 2} cy={pitch / 2} r={r} fill="#fff" />
          </pattern>
          <mask id={id + 'm'} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <rect width={W} height={H} fill={`url(#${id}p)`} />
          </mask>
          {Object.keys(PAL).map((k) => (
            <radialGradient key={k} id={id + 'g' + k}>
              <stop offset="0" stopColor={PAL[k]} stopOpacity="1" />
              <stop offset="0.55" stopColor={PAL[k]} stopOpacity="0.35" />
              <stop offset="1" stopColor={PAL[k]} stopOpacity="0" />
            </radialGradient>
          ))}
          <radialGradient id={id + 'v'} cx="50%" cy="50%" r="62%">
            <stop offset="0" stopColor="#020617" stopOpacity={center ? 0.82 : 0} />
            <stop offset="0.6" stopColor="#020617" stopOpacity={center ? 0.35 : 0.1} />
            <stop offset="1" stopColor="#020617" stopOpacity={center ? 0 : 0.6} />
          </radialGradient>
        </defs>
        <g mask={`url(#${id}m)`} opacity={dim}>
          <rect width={W} height={H} fill="#94a3b8" opacity="0.15" />
          {bright.map((b, i) => <circle key={'b' + i} cx={b.x} cy={b.y} r={b.r} fill={`url(#${id}gwhite)`} opacity={b.o} />)}
          {sweep.map((b, i) => <circle key={'s' + i} cx={b.x} cy={b.y} r={b.r} fill={`url(#${id}g${b.c})`} opacity={b.o} />)}
          {blobs.map((b, i) => <circle key={'c' + i} cx={b.x} cy={b.y} r={b.r} fill={`url(#${id}g${b.c})`} opacity={b.o} />)}
        </g>
        <g opacity={dim}>
          {particles.map((p, i) => (
            <g key={'q' + i}>
              <circle cx={p.x} cy={p.y} r={p.r * 4} fill={`url(#${id}g${p.c})`} opacity={p.o * 0.45} />
              <circle cx={p.x} cy={p.y} r={p.r} fill={PAL[p.c]} opacity={p.o} />
            </g>
          ))}
        </g>
        <rect width={W} height={H} fill={`url(#${id}v)`} />
      </svg>
    );
  }

  function LiveDotField(props) {
    const [t, setT] = React.useState(0);
    React.useEffect(() => {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      let raf, t0 = performance.now();
      const loop = (now) => { setT((now - t0) / 1000); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, []);
    return <DotField {...props} T={t + (+props.offset || 0)} />;
  }

  window.DotField = DotField;
  window.LiveDotField = LiveDotField;
})();
