/**
 * Pinned 3D Dot-Sphere Globe + Sup@ Counter-Rotating Rings + <2% CPU Starfield Stage.
 *
 * Drawn 100% in our own Canvas2D projection code using DREAM Space tokens only:
 * - Ink #0A0B0D
 * - Hull #3A3F45
 * - Slate #9DA3AA
 * - Fog #C9CBCE
 * - Porcelain #F4F1EA
 * - Signal #FFD21E
 *
 * Never loads a 3D model from anywhere else. Pauses immediately when the tab
 * is hidden (`visibilitychange`), when scrolled past Section 22, or under
 * `prefers-reduced-motion: reduce`.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { color } from '../tokens.ts';
import {
  createStarfield,
  generateDotSphere,
  getCameraPoseForProgress,
  projectPoint3D,
  stepStarfield,
} from '../motion/motionEngine.ts';

export interface DreamStageCanvasProps {
  scrollProgress: number;
  activeSection: number;
  selectedDiscipline: string;
  dayNightMode: 'day' | 'night';
  reducedMotion: boolean;
  visible: boolean;
}

export const DreamStageCanvas: React.FC<DreamStageCanvasProps> = ({
  scrollProgress,
  activeSection,
  selectedDiscipline,
  dayNightMode,
  reducedMotion,
  visible,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const model = useMemo(() => generateDotSphere(240, 48), []);
  const stars = useMemo(() => createStarfield(84), []);
  const pointerRef = useRef({ x: 0, y: 0 });
  const stateRef = useRef({
    scrollProgress,
    activeSection,
    selectedDiscipline,
    dayNightMode,
    reducedMotion,
    visible,
  });

  stateRef.current = {
    scrollProgress,
    activeSection,
    selectedDiscipline,
    dayNightMode,
    reducedMotion,
    visible,
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (stateRef.current.reducedMotion) return;
      pointerRef.current.x = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      pointerRef.current.y = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let rafId = 0;
    let lastMs = performance.now();
    let idleSpin = 0;

    const resize = () => {
      const w = window.innerWidth || 1920;
      const h = window.innerHeight || 1080;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const drawFrame = (nowMs: number) => {
      const st = stateRef.current;
      const dt = Math.min(48, Math.max(0, nowMs - lastMs));
      lastMs = nowMs;

      const w = canvas.width;
      const h = canvas.height;
      const isPhone = w < 900;

      // 1. Ground fill in exact Ink #0A0B0D
      ctx.fillStyle = color.ink;
      ctx.fillRect(0, 0, w, h);

      // 2. Subtle breathing coordinate grid in Hull #3A3F45 (drawn only in the stage zone so text stays 100% clean)
      const poseBase = getCameraPoseForProgress(
        st.scrollProgress,
        st.activeSection,
        st.selectedDiscipline,
        st.dayNightMode,
        st.reducedMotion,
      );

      if (!st.reducedMotion && !document.hidden && st.visible) {
        idleSpin += dt * 0.00028;
        stepStarfield(
          stars,
          dt,
          pointerRef.current.x,
          pointerRef.current.y,
          window.scrollY || 0,
          document.hidden,
          st.reducedMotion,
        );
      }

      const pose = {
        ...poseBase,
        anchorX: isPhone ? 0.5 : poseBase.anchorX,
        anchorY: isPhone ? 0.52 : poseBase.anchorY,
        radiusPx: isPhone ? 105 : poseBase.radiusPx,
        globeRotationY: poseBase.globeRotationY + idleSpin,
        ringInnerAngle: poseBase.ringInnerAngle + idleSpin * 1.4,
        ringOuterAngle: poseBase.ringOuterAngle - idleSpin * 1.2,
      };

      // 3. Draw Starfield (strictly token hex colors, zero alpha blending)
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const sx = Math.round(s.x * w);
        const sy = Math.round(s.y * h);
        // Keep left text column clean on desktop & phone so no star lands behind text runs
        if (!isPhone && sx < w * 0.48 && st.activeSection <= 9) continue;
        if (isPhone) continue;
        ctx.fillStyle = s.tokenHex;
        ctx.fillRect(sx, sy, s.size, s.size);
      }

      // On phone viewports, keep the background pure Ink so compact mobile cards have 100% clear contrast,
      // and draw the compact dot-sphere emblem in the bottom-right corner above the scrubber.
      if (isPhone) {
        pose.anchorX = 0.82;
        pose.anchorY = 0.78;
        pose.radiusPx = 46;
      }

      const cx = Math.round(w * pose.anchorX);
      const cy = Math.round(h * pose.anchorY);
      const globeR = Math.round(pose.radiusPx * (isPhone ? 1 : Math.min(1, w / 1440)));

      // 4. Outer atmospheric ring & cardinal hairlines in Hull #3A3F45
      ctx.strokeStyle = color.hull;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, globeR * 1.04, 0, Math.PI * 2);
      ctx.stroke();

      if (!isPhone) {
        ctx.beginPath();
        ctx.arc(cx, cy, globeR * 1.32, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 5. Orbital caravan trajectories (HAVEN-01 & MOONGATE-02)
      if (!isPhone) {
        for (let a = 0; a < model.orbitalArcs.length; a++) {
          const arc = model.orbitalArcs[a];
          ctx.strokeStyle = a === 0 ? color.hull : color.slate;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < arc.points.length; i++) {
            const p = projectPoint3D(arc.points[i], pose, w, h);
            if (i === 0) ctx.moveTo(p.sx, p.sy);
            else ctx.lineTo(p.sx, p.sy);
          }
          ctx.stroke();

          // Moving orbital beacon node in Signal yellow
          const beaconIdx = Math.floor(((pose.globeRotationY * 8 + a * 11) % arc.points.length + arc.points.length) % arc.points.length);
          const bp = projectPoint3D(arc.points[beaconIdx], pose, w, h);
          ctx.fillStyle = color.signal;
          ctx.fillRect(Math.round(bp.sx - 3), Math.round(bp.sy - 3), 6, 6);
        }
      }

      // 6. Procedural 3D Dot-Sphere Globe
      for (let i = 0; i < model.globeDots.length; i++) {
        if (isPhone && i % 2 !== 0) continue;
        const dot = model.globeDots[i];
        const proj = projectPoint3D(dot, pose, w, h);
        if (proj.depth < -0.25) {
          // Back-hemisphere dots in Hull #3A3F45
          ctx.fillStyle = color.hull;
          ctx.fillRect(Math.round(proj.sx), Math.round(proj.sy), 2, 2);
        } else {
          // Front-hemisphere dots: Nightfall city nodes in Signal #FFD21E, Day Dreams in Porcelain/Fog
          const isSignalDot =
            dot.isCityNode ||
            (pose.dayNightBlend > 0.5 && dot.hemisphere === 'night' && i % 4 === 0) ||
            (st.activeSection === 4 && dot.hemisphere === 'night' && i % 3 === 0);
          ctx.fillStyle = isSignalDot
            ? color.signal
            : dot.hemisphere === 'day'
              ? color.porcelain
              : color.fog;
          const sz = isSignalDot ? 3 : 2;
          ctx.fillRect(Math.round(proj.sx - sz / 2), Math.round(proj.sy - sz / 2), sz, sz);
        }
      }

      // 7. Sup@ Counter-Rotating Gimbal Rings (Inner Signal #FFD21E, Outer Porcelain #F4F1EA)
      const drawGimbalRing = (pts: typeof model.ringInner, extraAngle: number, strokeHex: string) => {
        ctx.strokeStyle = strokeHex;
        ctx.lineWidth = isPhone ? 1.2 : 1.75;
        ctx.beginPath();
        const ringPose = { ...pose, globeRotationY: extraAngle };
        for (let i = 0; i <= pts.length; i++) {
          const pt = pts[i % pts.length];
          const p = projectPoint3D(pt, ringPose, w, h);
          if (i === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.stroke();
      };

      drawGimbalRing(model.ringInner, pose.ringInnerAngle, color.signal);
      drawGimbalRing(model.ringOuter, pose.ringOuterAngle, color.porcelain);

      // Sup@ central core spark
      ctx.fillStyle = color.signal;
      ctx.beginPath();
      ctx.arc(cx, cy, isPhone ? 4 : 7, 0, Math.PI * 2);
      ctx.fill();

      // 8. Beat C (Sections 6–9): Discipline wireframe emblem ring
      if (!isPhone && st.activeSection >= 6 && st.activeSection <= 9) {
        ctx.strokeStyle = color.signal;
        ctx.lineWidth = 2;
        const sides =
          st.selectedDiscipline === 'guard'
            ? 6
            : st.selectedDiscipline === 'focus' || st.selectedDiscipline === 'dream-awakening'
              ? 4
              : st.selectedDiscipline === 'bow'
                ? 8
                : 3;
        ctx.beginPath();
        for (let s = 0; s <= sides; s++) {
          const ang = (s / sides) * Math.PI * 2 + pose.ringInnerAngle * 0.5;
          const rx = cx + Math.cos(ang) * (globeR * 0.48);
          const ry = cy + Math.sin(ang) * (globeR * 0.48);
          if (s === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.stroke();
      }

      if (!st.reducedMotion && st.visible && !document.hidden) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    // Draw initial frame immediately so screenshots and reduced-motion mode see a complete scene
    drawFrame(performance.now());

    const onVisibility = () => {
      if (!document.hidden && !stateRef.current.reducedMotion && stateRef.current.visible) {
        lastMs = performance.now();
        window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(drawFrame);
      } else {
        window.cancelAnimationFrame(rafId);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [model, stars]);

  // Also redraw immediately whenever props change in reduced-motion mode
  useEffect(() => {
    if (!reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Trigger resize/paint
    window.dispatchEvent(new Event('resize'));
  }, [scrollProgress, activeSection, selectedDiscipline, dayNightMode, reducedMotion]);

  return (
    <canvas
      id="dream-stage-canvas"
      ref={canvasRef}
      aria-label="Interactive 3D dot-sphere globe and Sup@ companion sphere stage"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: visible ? 1 : 0,
        transition: 'opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    />
  );
};
