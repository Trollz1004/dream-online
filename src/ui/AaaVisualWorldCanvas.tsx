import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  buildHeroCharacterRig,
  buildMythosBossRig,
  updateCharacterRigAnimation,
  type BuiltCharacterRig,
} from '../engine/characters/hero-and-boss-builder.ts';
import {
  generateInHouseStoneFlaggingPbrMaps,
  buildWornStoneFlaggingGround,
  buildThreePointMoodLightingRig,
  buildContactAndCastShadowGroup,
  tuneCharacterMaterialsForLighting,
  buildBrokenMasonryAndBandedBarrels,
  buildAtmosphereHazeLightShaftsAndLitEmbers,
  updateLookPass2Atmosphere,
  LOOK_PASS_2_TONE_MAPPING_CONFIG,
  type LookQualityPreset,
  type ShadowAnchorSpec,
} from '../engine/scene/look-pass-2-light-shadow-ground.ts';
import {
  UnifiedAntigravityWorkspaceShell,
  type WorkspaceCenterView,
} from './UnifiedAntigravityWorkspaceShell.tsx';

interface RealHitNumber {
  id: number;
  damage: number;
  label: string;
  isCrit: boolean;
  screenX: number;
  screenY: number;
}

export interface AaaVisualWorldCanvasProps {
  onOpenStudioDrawer?: () => void;
}

/**
 * Generates a soft radial-gradient canvas texture for embers, sparks, and smoke sprites
 * so particles are soft-textured sprites — never hard squares or wire-rings.
 */
function createSoftParticleTexture(
  innerRgba: string,
  midRgba: string,
  outerRgba = 'rgba(0,0,0,0)'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0.0, innerRgba);
  grad.addColorStop(0.42, midRgba);
  grad.addColorStop(1.0, outerRgba);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export const AaaVisualWorldCanvas: React.FC<AaaVisualWorldCanvasProps> = ({
  onOpenStudioDrawer,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const isCaptureMode = params.get('capture') === '1';
  const initialWorkspaceMode = params.get('workspace') === '1';
  const initialWorkspaceView = (params.get('view') as WorkspaceCenterView) || 'repos-models';
  const [isUnifiedWorkspaceOpen, setIsUnifiedWorkspaceOpen] = useState<boolean>(initialWorkspaceMode);
  const pinnedTimeParam = params.get('t') ? parseFloat(params.get('t')!) : null;
  const initialYawParam = params.get('yaw') ? parseFloat(params.get('yaw')!) : null;
  const initialPitchParam = params.get('pitch') ? parseFloat(params.get('pitch')!) : null;
  const initialDistParam = params.get('dist') ? parseFloat(params.get('dist')!) : null;
  const rawQualityParam = params.get('quality');
  const initialQuality: LookQualityPreset =
    rawQualityParam === 'balanced' || rawQualityParam === 'performance' ? rawQualityParam : 'high';
  const [qualityPreset, setQualityPreset] = useState<LookQualityPreset>(initialQuality);

  const [bossHp, setBossHp] = useState<number>(2400);
  const maxBossHp = 2400;
  const [heroHp] = useState<number>(1250);
  const [heroResolve, setHeroResolve] = useState<number>(85);
  const [hitNumbers, setHitNumbers] = useState<RealHitNumber[]>([]);
  const [cameraHudReadout, setCameraHudReadout] = useState<{
    yawDeg: number;
    pitchDeg: number;
    dist: number;
  }>({ yawDeg: 0, pitchDeg: 24, dist: 7.6 });
  const [activeMoveLabel, setActiveMoveLabel] = useState<string>('READY');
  const [mirethMemories, setMirethMemories] = useState<string[]>([
    'Mireth will remember: Vanguard entered the Sunken Bastion',
    'Party Aura Active: Knight Empower (+30% Party DMG)',
    'Priest Obli (60% DR) + Chrono Reset armed',
  ]);
  const [activePartyBuff, setActivePartyBuff] = useState<'EMPOWER (+30% DMG)' | 'OBLI (60% DR)' | 'CHRONO (INSTANT CD)'>('EMPOWER (+30% DMG)');

  const triggerAttackRef = useRef<((moveName: string, baseDmg: number, isHeavy: boolean) => void) | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({
      antialias: qualityPreset !== 'performance',
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    const maxDpr = qualityPreset === 'high' ? 2 : qualityPreset === 'balanced' ? 1.5 : 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = LOOK_PASS_2_TONE_MAPPING_CONFIG.toneMapping;
    renderer.toneMappingExposure = LOOK_PASS_2_TONE_MAPPING_CONFIG.exposure;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.15, 220);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      LOOK_PASS_2_TONE_MAPPING_CONFIG.bloomStrength,
      LOOK_PASS_2_TONE_MAPPING_CONFIG.bloomRadius,
      LOOK_PASS_2_TONE_MAPPING_CONFIG.bloomThreshold
    );
    composer.addPass(bloomPass);

    // ---------------------------------------------------------------------------
    // 1. PBR TEXTURES (In-House Stone Flagging + CC0 Crag Rock & Ruin Architecture)
    // ---------------------------------------------------------------------------
    const texLoader = new THREE.TextureLoader();
    const loadPbrTex = (url: string, rx: number, ry: number, isColor = true) => {
      const t = texLoader.load(url);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (isColor) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };

    const _archFacadeDiff = loadPbrTex('/assets/third_party/textures/facade/concrete_wall_003_diff_1k.jpg', 7, 7, true);
    const cragDiff = loadPbrTex('/assets/third_party/textures/rock/rock_face_03_diff_1k.jpg', 6, 6, true);
    const cragNor = loadPbrTex('/assets/third_party/textures/rock/rock_face_03_nor_gl_1k.jpg', 6, 6, false);
    const cragArm = loadPbrTex('/assets/third_party/textures/rock/rock_face_03_arm_1k.jpg', 6, 6, false);

    // ---------------------------------------------------------------------------
    // 2. SKY, CALIBRATED IBL ENVIRONMENT & THREE-POINT MOOD LIGHTING RIG (Look Pass 2)
    // ---------------------------------------------------------------------------
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        void main() {
          vec3 d = normalize(vPos);
          float h = d.y;
          vec3 zenith = vec3(0.03, 0.05, 0.11);
          vec3 horizon = vec3(0.24, 0.15, 0.10);
          vec3 ground = vec3(0.02, 0.02, 0.03);
          vec3 col = h >= 0.0
            ? mix(horizon, zenith, pow(h, 0.55))
            : mix(horizon, ground, clamp(-h * 3.0, 0.0, 1.0));
          gl_FragColor = vec4(col * 0.46, 1.0);
        }
      `,
    });
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), envMat));
    scene.environment = pmremGenerator.fromScene(envScene, 0.04).texture;

    const lightingRig = buildThreePointMoodLightingRig(qualityPreset);
    scene.add(lightingRig.root);
    const torchSprites = lightingRig.torchSprites;

    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(180, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uSunDir: { value: lightingRig.keyLight.position.clone().normalize() },
        },
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vDir;
          uniform vec3 uSunDir;
          void main() {
            float y = vDir.y;
            vec3 zenith = vec3(0.025, 0.04, 0.09);
            vec3 midSky = vec3(0.06, 0.09, 0.16);
            vec3 horizon = vec3(0.22, 0.13, 0.09);
            vec3 ground = vec3(0.02, 0.02, 0.035);
            vec3 col = y > 0.0
              ? mix(horizon, mix(midSky, zenith, clamp(y * 1.5, 0.0, 1.0)), pow(y, 0.48))
              : mix(horizon, ground, clamp(-y * 3.5, 0.0, 1.0));
            float sun = max(dot(normalize(vDir), uSunDir), 0.0);
            col += vec3(0.85, 0.48, 0.20) * pow(sun, 18.0) * 0.28;
            col += vec3(1.0, 0.78, 0.46) * pow(sun, 240.0) * 0.55;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      })
    );
    scene.add(skyDome);

    // ---------------------------------------------------------------------------
    // 3. IN-HOUSE WORN STONE FLAGGING GROUND (Cracks, Moss & Puddles — Zero Flat Squares)
    // ---------------------------------------------------------------------------
    const cameraColliders: THREE.Object3D[] = [];
    const stoneMaps = generateInHouseStoneFlaggingPbrMaps(qualityPreset === 'performance' ? 128 : 256);
    const groundResult = buildWornStoneFlaggingGround(stoneMaps);
    scene.add(groundResult.root);
    cameraColliders.push(groundResult.outerGroundMesh);

    // Scattered Crag Boulders around the outer rim of the Bastion
    const cragRockMat = new THREE.MeshStandardMaterial({
      map: cragDiff,
      normalMap: cragNor,
      aoMap: cragArm,
      roughness: 0.78,
      metalness: 0.1,
      color: new THREE.Color(0x4a505e),
    });
    const rockClusters = [
      [-9.8, 0.4, -7.2, 1.8, 1.2, 1.5, 0.4],
      [10.2, 0.4, -6.8, 2.1, 1.4, 1.6, -0.6],
      [-10.5, 0.35, 1.5, 1.5, 1.0, 1.3, 1.1],
      [10.4, 0.35, 2.0, 1.7, 1.1, 1.4, 0.2],
      [-6.5, 0.3, -10.8, 2.4, 1.6, 1.8, 0.8],
      [6.8, 0.3, -10.5, 2.2, 1.5, 1.7, -0.5],
    ];
    for (const [bx, by, bz, sx, sy, sz, ry] of rockClusters) {
      const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
      const rAttr = rockGeo.attributes.position;
      for (let i = 0; i < rAttr.count; i++) {
        const vx = rAttr.getX(i);
        const vy = rAttr.getY(i);
        const vz = rAttr.getZ(i);
        const n = 1.0 + 0.16 * Math.sin(vx * 3.7 + vy * 2.3) * Math.cos(vz * 3.1);
        rAttr.setXYZ(i, vx * sx * n, vy * sy * n, vz * sz * n);
      }
      rockGeo.computeVertexNormals();
      const rock = new THREE.Mesh(rockGeo, cragRockMat);
      rock.position.set(bx, by, bz);
      rock.rotation.y = ry;
      rock.castShadow = true;
      rock.receiveShadow = true;
      scene.add(rock);
      if (sx > 1.2) cameraColliders.push(rock);
    }

    // Broken Gothic Masonry Rubble Clusters & Banded Wood-Grain Barrels (Look Pass 2)
    const propsResult = buildBrokenMasonryAndBandedBarrels(lightingRig.keyLight.position);
    scene.add(propsResult.root);
    cameraColliders.push(...propsResult.colliders);

    // ---------------------------------------------------------------------------
    // 4. LOAD MODULAR RUINS GOTHIC ARCHES, COLUMNS & TREES
    // ---------------------------------------------------------------------------
    const gltfLoader = new GLTFLoader();

    gltfLoader.load('/assets/third_party/quaternius/ModularRuinsPack.glb', (gltf) => {
      const findMeshObj = (exactOrPartial: string): THREE.Object3D | null => {
        let exact: THREE.Object3D | null = null;
        let partial: THREE.Object3D | null = null;
        gltf.scene.traverse((child) => {
          if (child.name === exactOrPartial) exact = child;
          else if (!partial && child.name.toLowerCase().includes(exactOrPartial.toLowerCase())) {
            partial = child;
          }
        });
        return exact || partial;
      };

      const placePiece = (
        nodeName: string,
        x: number,
        y: number,
        z: number,
        targetHeight: number,
        yawRad = 0,
        applyStonePbr = true
      ) => {
        const src = findMeshObj(nodeName);
        if (!src) return;
        const clone = src.clone(true);
        clone.position.set(0, 0, 0);
        clone.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(clone);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const scaleFactor = targetHeight / Math.max(size.y, 0.01);
        const holder = new THREE.Group();
        const inner = new THREE.Group();
        inner.add(clone);
        inner.scale.setScalar(scaleFactor);
        inner.position.set(-center.x * scaleFactor, -box.min.y * scaleFactor, -center.z * scaleFactor);

        clone.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const m = c as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            if (applyStonePbr) {
              m.material = new THREE.MeshStandardMaterial({
                map: cragDiff || _archFacadeDiff,
                normalMap: cragNor,
                roughness: 0.72,
                metalness: 0.14,
                color: new THREE.Color(0x5a6270),
              });
            }
          }
        });

        holder.add(inner);
        holder.position.set(x, y, z);
        holder.rotation.y = yawRad;
        scene.add(holder);
        if (targetHeight >= 2.5) cameraColliders.push(holder);
      };

      placePiece('Arch_Gothic_RoundColumn', 0, 0.24, -10.2, 6.8, 0, true);
      placePiece('Arch_Gothic_RoundColumn', -5.6, 0.24, -8.8, 5.8, 0.48, true);
      placePiece('Arch_Gothic_RoundColumn', 5.6, 0.24, -8.8, 5.8, -0.48, true);
      placePiece('Wall_ArchRound_Broken', -9.2, 0.24, -4.8, 4.8, 1.05, true);
      placePiece('Wall_ArchRound_Broken', 9.2, 0.24, -4.8, 4.8, -1.05, true);
      placePiece('Column_Round', -7.4, 0.24, -7.8, 3.2, 0, true);
      placePiece('Column_Round', 7.4, 0.24, -7.8, 3.2, 0, true);
      placePiece('Column_Round', -8.8, 0.24, -1.8, 3.2, 0, true);
      placePiece('Column_Round', 8.8, 0.24, -1.8, 3.2, 0, true);
      placePiece('Column_Round_Short', -6.8, 0.24, 2.8, 1.9, 0.2, true);
      placePiece('Column_Round_Short', 6.8, 0.24, 2.8, 1.9, -0.3, true);
    });

    for (const treeUrl of [
      '/assets/third_party/quaternius/CommonTree.glb',
      '/assets/third_party/quaternius/TwistedTree.glb',
    ]) {
      gltfLoader.load(treeUrl, (gltf) => {
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const s = 7.2 / Math.max(size.y, 0.01);
        const coords = treeUrl.includes('Twisted')
          ? [
              [-13.5, 0.4, -12.5],
              [13.8, 0.4, -12.0],
              [-15.2, 0.5, -5.5],
              [15.4, 0.5, -5.0],
            ]
          : [
              [-9.5, 0.5, -14.5],
              [9.8, 0.5, -14.2],
              [-4.2, 0.6, -15.8],
              [4.5, 0.6, -15.5],
            ];
        for (const [tx, ty, tz] of coords) {
          const tClone = gltf.scene.clone(true);
          tClone.scale.setScalar(s);
          tClone.position.set(tx, ty, tz);
          tClone.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });
          scene.add(tClone);
        }
      });
    }

    // ---------------------------------------------------------------------------
    // 5. FOUR IN-HOUSE SCULPTED HEROES & BOSS + PASS 2 MATERIAL & SHADOW CALIBRATION
    // ---------------------------------------------------------------------------
    const heroRoot = new THREE.Group();
    heroRoot.position.set(0.328, 0.26, -1.25);
    scene.add(heroRoot);

    const bossRoot = new THREE.Group();
    bossRoot.position.set(0, 0.22, -1.62);
    bossRoot.rotation.y = 0.04; // Faces +Z directly toward the party & camera
    scene.add(bossRoot);

    const bossRig: BuiltCharacterRig = buildMythosBossRig();
    tuneCharacterMaterialsForLighting(bossRig);
    bossRoot.add(bossRig.root);

    // Build all 4 Hero Classes with distinct silhouettes, layered armor/cloth, capes & weapons
    const knightRig = buildHeroCharacterRig('knight');
    tuneCharacterMaterialsForLighting(knightRig);
    knightRig.root.position.set(-2.72, 0.26, 0.42);
    knightRig.root.rotation.y = 0.56;
    scene.add(knightRig.root);

    const archerRig = buildHeroCharacterRig('elf-archer');
    tuneCharacterMaterialsForLighting(archerRig);
    archerRig.root.position.set(-1.55, 0.26, -0.58);
    archerRig.root.rotation.y = 0.52;
    scene.add(archerRig.root);

    const mageRig = buildHeroCharacterRig('mage');
    tuneCharacterMaterialsForLighting(mageRig);
    mageRig.root.position.set(1.55, 0.26, -0.58);
    mageRig.root.rotation.y = -0.52;
    scene.add(mageRig.root);

    const darkKnightRig = buildHeroCharacterRig('dark-knight');
    tuneCharacterMaterialsForLighting(darkKnightRig);
    darkKnightRig.root.position.set(2.72, 0.26, 0.42);
    darkKnightRig.root.rotation.y = -0.58;
    scene.add(darkKnightRig.root);

    const partyHeroRigs: BuiltCharacterRig[] = [
      knightRig,
      archerRig,
      mageRig,
      darkKnightRig,
    ];
    const heroWeaponTipObj: THREE.Object3D = knightRig.parts.weaponTip;

    // Contact Ambient Occlusion & Directional Cast Shadows under all figures, props, and walls
    const allShadowAnchors: ShadowAnchorSpec[] = [
      { x: -2.72, z: 0.42, radiusX: 0.72, radiusZ: 0.68, height: 1.98, isBipedal: true, yawRad: 0.56 },
      { x: -1.55, z: -0.58, radiusX: 0.65, radiusZ: 0.62, height: 1.88, isBipedal: true, yawRad: 0.52 },
      { x: 1.55, z: -0.58, radiusX: 0.74, radiusZ: 0.72, height: 1.92, isBipedal: true, yawRad: -0.52 },
      { x: 2.72, z: 0.42, radiusX: 0.78, radiusZ: 0.72, height: 2.12, isBipedal: true, yawRad: -0.58 },
      { x: 0, z: -1.62, radiusX: 1.38, radiusZ: 1.25, height: 3.35, isBipedal: true, yawRad: 0.04 },
      ...propsResult.shadowAnchors,
      // Column & Gothic Arch base occlusion
      { x: -7.4, z: -7.8, radiusX: 0.95, radiusZ: 0.95, height: 3.2 },
      { x: 7.4, z: -7.8, radiusX: 0.95, radiusZ: 0.95, height: 3.2 },
      { x: -8.8, z: -1.8, radiusX: 0.95, radiusZ: 0.95, height: 3.2 },
      { x: 8.8, z: -1.8, radiusX: 0.95, radiusZ: 0.95, height: 3.2 },
      { x: -6.8, z: 2.8, radiusX: 0.82, radiusZ: 0.82, height: 1.9 },
      { x: 6.8, z: 2.8, radiusX: 0.82, radiusZ: 0.82, height: 1.9 },
      { x: 0, z: -10.2, radiusX: 2.2, radiusZ: 1.2, height: 6.8 },
      { x: -5.6, z: -8.8, radiusX: 1.8, radiusZ: 1.1, height: 5.8 },
      { x: 5.6, z: -8.8, radiusX: 1.8, radiusZ: 1.1, height: 5.8 },
    ];
    const shadowGroundGroup = buildContactAndCastShadowGroup(
      lightingRig.keyLight.position,
      allShadowAnchors,
      0.262
    );
    scene.add(shadowGroundGroup);

    // ---------------------------------------------------------------------------
    // 6. ATMOSPHERE: HEIGHT FOG, ARCH LIGHT SHAFTS, 3D LIT EMBERS & SLASH TRAILS
    // ---------------------------------------------------------------------------
    const atmosphereResult = buildAtmosphereHazeLightShaftsAndLitEmbers(
      lightingRig.keyLight.position,
      qualityPreset
    );
    scene.fog = atmosphereResult.fog;
    scene.add(atmosphereResult.root);

    const emberTex = createSoftParticleTexture(
      'rgba(255, 245, 200, 1.0)',
      'rgba(255, 110, 20, 0.72)',
      'rgba(255, 30, 0, 0.0)'
    );

    // Tapered Ribbon Slash Trail
    const trailSegments = 16;
    const trailPositions = new Float32Array(trailSegments * 2 * 3);
    const trailColors = new Float32Array(trailSegments * 2 * 4);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 4));
    const trailIndices: number[] = [];
    for (let i = 0; i < trailSegments - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      trailIndices.push(a, b, c, b, d, c);
    }
    trailGeo.setIndex(trailIndices);
    const slashTrailMesh = new THREE.Mesh(
      trailGeo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    slashTrailMesh.frustumCulled = false;
    scene.add(slashTrailMesh);
    const trailHistory: Array<{ tip: THREE.Vector3; base: THREE.Vector3 }> = [];

    const impactLight = new THREE.PointLight(0xffaa33, 0, 9, 1.8);
    scene.add(impactLight);

    const impactFlashSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: emberTex,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    impactFlashSprite.scale.set(2.2, 2.2, 1.0);
    scene.add(impactFlashSprite);

    interface BurstSpark {
      sprite: THREE.Sprite;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
    }
    const burstSparks: BurstSpark[] = [];
    for (let i = 0; i < 24; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: emberTex,
          blending: THREE.AdditiveBlending,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
      sp.scale.set(0.32, 0.32, 1);
      scene.add(sp);
      burstSparks.push({
        sprite: sp,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.42,
      });
    }

    // ---------------------------------------------------------------------------
    // 7. REAL HIT DETECTION & DAMAGE POPUPS (Numbers Come From Real Hits Only!)
    // ---------------------------------------------------------------------------
    let activeStrike: {
      moveName: string;
      baseDmg: number;
      isHeavy: boolean;
      elapsed: number;
      duration: number;
      hasConnected: boolean;
    } | null = null;
    let hitIdCounter = 1;

    const projectWorldToScreenPct = (worldPos: THREE.Vector3) => {
      const projected = worldPos.clone().project(camera);
      const sx = Math.min(82, Math.max(18, (projected.x * 0.5 + 0.5) * 100));
      const sy = Math.min(78, Math.max(18, (-projected.y * 0.5 + 0.5) * 100));
      return { sx, sy };
    };

    const spawnRealHitImpact = (
      impactPos: THREE.Vector3,
      moveName: string,
      baseDmg: number,
      isHeavy: boolean
    ) => {
      impactLight.position.copy(impactPos);
      impactLight.intensity = isHeavy ? 6.5 : 4.2;
      impactFlashSprite.position.copy(impactPos);
      impactFlashSprite.material.opacity = 0.82;
      impactFlashSprite.scale.setScalar(isHeavy ? 2.4 : 1.7);

      burstSparks.forEach((bs, i) => {
        bs.sprite.position.copy(impactPos);
        const angle = (i / burstSparks.length) * Math.PI * 2 + Math.random() * 0.4;
        const speed = (isHeavy ? 5.2 : 3.4) + Math.random() * 3.2;
        bs.vel.set(Math.cos(angle) * speed, 2.0 + Math.random() * 3.5, Math.sin(angle) * speed);
        bs.life = 0.001;
        bs.maxLife = 0.32 + Math.random() * 0.22;
        bs.sprite.material.opacity = 1.0;
      });

      const variance = Math.floor((Math.sin(hitIdCounter * 19.7) * 0.5 + 0.5) * 42);
      const finalDamage = baseDmg + variance;
      const { sx, sy } = projectWorldToScreenPct(impactPos.clone().add(new THREE.Vector3(0, 1.1, 0)));
      const newHitId = hitIdCounter++;

      // Spread hit numbers cleanly so they never overlap each other
      const spreadOffsets = [
        [-7, -4],
        [7, -2],
        [0, -9],
      ];
      const [ox, oy] = spreadOffsets[newHitId % spreadOffsets.length];

      setBossHp((prev) => (prev - finalDamage <= 120 ? maxBossHp : prev - finalDamage));
      setHeroResolve((prev) => Math.min(100, prev + (isHeavy ? 12 : 6)));
      setMirethMemories((prev) => [
        `Mireth will remember: ${moveName} struck Myth@s (${finalDamage})`,
        ...prev.slice(0, 2),
      ]);
      setHitNumbers((prev) => [
        ...prev.slice(-2),
        {
          id: newHitId,
          damage: finalDamage,
          label: moveName,
          isCrit: isHeavy,
          screenX: sx + ox,
          screenY: sy + oy,
        },
      ]);
    };

    const startHeroAttack = (moveName: string, baseDmg: number, isHeavy: boolean) => {
      setActiveMoveLabel(moveName);
      activeStrike = {
        moveName,
        baseDmg,
        isHeavy,
        elapsed: 0,
        duration: isHeavy ? 0.65 : 0.48,
        hasConnected: false,
      };
    };
    triggerAttackRef.current = startHeroAttack;

    // ---------------------------------------------------------------------------
    // 8. MOUSE ORBIT + SCROLL WHEEL ZOOM + SMOOTH FOLLOW + RAYCAST WALL COLLISION
    // ---------------------------------------------------------------------------
    let camYaw = initialYawParam !== null ? initialYawParam : 0.0;
    let camPitch = initialPitchParam !== null ? initialPitchParam : 0.42;
    let camDist = initialDistParam !== null ? initialDistParam : 7.6;
    const smoothFocus = new THREE.Vector3(0, 1.65, 1.5);
    const raycaster = new THREE.Raycaster();

    let isDraggingCamera = false;
    let dragButton = -1;
    let dragStartX = 0;
    let dragStartY = 0;
    let totalDragPixels = 0;

    const canvasEl = renderer.domElement;
    canvasEl.style.touchAction = 'none';
    canvasEl.style.cursor = 'grab';

    const onPointerDown = (e: PointerEvent) => {
      isDraggingCamera = true;
      dragButton = e.button;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      totalDragPixels = 0;
      canvasEl.style.cursor = 'grabbing';
      try {
        canvasEl.setPointerCapture(e.pointerId);
      } catch {
        // Ignore synthetic event pointer capture errors
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingCamera) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      totalDragPixels += Math.hypot(dx, dy);

      camYaw -= dx * 0.0075;
      camPitch = Math.max(0.14, Math.min(1.25, camPitch + dy * 0.0065));
      setCameraHudReadout({
        yawDeg: Math.round(((camYaw * 180) / Math.PI) % 360),
        pitchDeg: Math.round((camPitch * 180) / Math.PI),
        dist: Number(camDist.toFixed(1)),
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDraggingCamera) return;
      isDraggingCamera = false;
      canvasEl.style.cursor = 'grab';
      try {
        canvasEl.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore synthetic event pointer capture errors
      }
      if (totalDragPixels < 5 && !isCaptureMode) {
        if (dragButton === 2) {
          startHeroAttack('SUNBREAKER CLEAVE', 380, true);
        } else if (dragButton === 0) {
          startHeroAttack('RIFT SLASH', 220, false);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camDist = Math.max(3.2, Math.min(16.5, camDist + e.deltaY * 0.005));
      setCameraHudReadout({
        yawDeg: Math.round(((camYaw * 180) / Math.PI) % 360),
        pitchDeg: Math.round((camPitch * 180) / Math.PI),
        dist: Number(camDist.toFixed(1)),
      });
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    canvasEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('wheel', onWheel, { passive: false });
    canvasEl.addEventListener('contextmenu', onContextMenu);

    (window as unknown as Record<string, unknown>).__dreamCamera = {
      getState: () => ({
        yaw: camYaw,
        pitch: camPitch,
        dist: camDist,
        pos: camera.position.toArray(),
      }),
      setOrbit: (yaw: number, pitch: number, dist: number) => {
        camYaw = yaw;
        camPitch = Math.max(0.14, Math.min(1.25, pitch));
        camDist = Math.max(3.2, Math.min(16.5, dist));
      },
    };

    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === 'KeyE') startHeroAttack('DREAM LUNGE', 310, false);
      if (e.code === 'KeyR') startHeroAttack('SOVEREIGN RECKONING', 540, true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ---------------------------------------------------------------------------
    // 9. MAIN ANIMATION LOOP & IN-HOUSE ARTICULATED RIG POSE DRIVER
    // ---------------------------------------------------------------------------
    const clock = new THREE.Clock();
    let animId = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const rawDt = Math.min(clock.getDelta(), 0.05);
      const simTime =
        pinnedTimeParam !== null
          ? pinnedTimeParam
          : prefersReducedMotion
          ? 2.2
          : clock.getElapsedTime();
      const dt = pinnedTimeParam !== null || prefersReducedMotion ? 0.016 : rawDt;

      if (isCaptureMode || pinnedTimeParam !== null || prefersReducedMotion) {
        const cycleT = pinnedTimeParam !== null ? pinnedTimeParam : prefersReducedMotion ? 2.2 : simTime % 7.0;
        if (cycleT < 1.8) {
          const alpha = Math.min(1, cycleT / 1.8);
          heroRoot.position.set(0, 0.26, 4.2 - alpha * 5.2);
        } else if (cycleT < 4.2) {
          heroRoot.position.set(Math.sin((cycleT - 1.8) * 1.6) * 0.55, 0.26, -1.25);
        } else {
          heroRoot.position.set(0, 0.26, -1.15);
        }
      } else {
        let moveX = 0;
        let moveZ = 0;
        if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

        if (moveX !== 0 || moveZ !== 0) {
          const moveAngle = Math.atan2(moveX, moveZ) + camYaw;
          const speed = 5.8;
          heroRoot.position.x = Math.max(-9.5, Math.min(9.5, heroRoot.position.x + Math.sin(moveAngle) * speed * dt));
          heroRoot.position.z = Math.max(-8.5, Math.min(8.5, heroRoot.position.z + Math.cos(moveAngle) * speed * dt));
        }
      }

      const swingProgress = activeStrike ? activeStrike.elapsed / activeStrike.duration : 0;
      const swingAngleRad = activeStrike ? Math.sin(swingProgress * Math.PI) * 1.15 : 0;

      // Drive procedural breathing, cape billowing, spell rings, bow draw & halberd poise on all 4 Heroes + Myth@s
      for (const rig of partyHeroRigs) {
        updateCharacterRigAnimation(rig, simTime, dt, swingAngleRad);
      }
      updateCharacterRigAnimation(bossRig, simTime, dt, swingAngleRad * 0.4);

      // Resolve Real Hit Detection on Active Swing Frame
      if (activeStrike) {
        activeStrike.elapsed += dt;
        const progress = activeStrike.elapsed / activeStrike.duration;
        if (!activeStrike.hasConnected && progress >= 0.35 && progress <= 0.78) {
          const tipWorld = new THREE.Vector3();
          heroWeaponTipObj.getWorldPosition(tipWorld);
          const distBoss = tipWorld.distanceTo(
            bossRoot.position.clone().add(new THREE.Vector3(0, 1.6, 0))
          );
          if (distBoss <= 5.6) {
            activeStrike.hasConnected = true;
            const hitPos = bossRoot.position
              .clone()
              .add(new THREE.Vector3(0, 1.75, 0));
            spawnRealHitImpact(
              hitPos,
              activeStrike.moveName,
              activeStrike.baseDmg,
              activeStrike.isHeavy
            );
          }
        }
        if (activeStrike.elapsed >= activeStrike.duration) {
          activeStrike = null;
          setActiveMoveLabel('READY');
        }
      }

      // Update Tapered Weapon Slash Ribbon Trail
      const tipPos = new THREE.Vector3();
      heroWeaponTipObj.getWorldPosition(tipPos);
      const basePos = knightRig.root.position.clone().add(new THREE.Vector3(0, 1.25, 0));
      const ribbonBase = basePos.clone().lerp(tipPos, 0.45);

      trailHistory.unshift({ tip: tipPos.clone(), base: ribbonBase });
      if (trailHistory.length > trailSegments) trailHistory.pop();

      const tPosAttr = trailGeo.attributes.position as THREE.BufferAttribute;
      const tColAttr = trailGeo.attributes.color as THREE.BufferAttribute;
      const trailAlphaScale = activeStrike ? 0.78 : 0.0;
      for (let i = 0; i < trailSegments; i++) {
        const sample = trailHistory[Math.min(i, trailHistory.length - 1)] || {
          tip: basePos,
          base: basePos,
        };
        const fade = Math.pow(1.0 - i / (trailSegments - 1), 1.7) * trailAlphaScale;
        tPosAttr.setXYZ(i * 2, sample.base.x, sample.base.y, sample.base.z);
        tPosAttr.setXYZ(i * 2 + 1, sample.tip.x, sample.tip.y, sample.tip.z);
        tColAttr.setXYZW(i * 2, 1.0, 0.58, 0.16, fade * 0.3);
        tColAttr.setXYZW(i * 2 + 1, 1.0, 0.86, 0.48, fade);
      }
      tPosAttr.needsUpdate = true;
      tColAttr.needsUpdate = true;

      if (impactLight.intensity > 0.05) {
        impactLight.intensity *= Math.pow(0.04, dt);
      } else {
        impactLight.intensity = 0;
      }
      if (impactFlashSprite.material.opacity > 0.02) {
        impactFlashSprite.material.opacity *= Math.pow(0.03, dt);
      } else {
        impactFlashSprite.material.opacity = 0;
      }

      for (const bs of burstSparks) {
        if (bs.life > 0) {
          bs.life += dt;
          if (bs.life >= bs.maxLife) {
            bs.life = 0;
            bs.sprite.material.opacity = 0;
          } else {
            bs.sprite.position.addScaledVector(bs.vel, dt);
            bs.vel.y -= 9.8 * dt;
            bs.sprite.material.opacity = 1.0 - bs.life / bs.maxLife;
          }
        }
      }

      updateLookPass2Atmosphere(atmosphereResult, simTime, dt, prefersReducedMotion);

      torchSprites.forEach((sp, idx) => {
        const flicker = prefersReducedMotion ? 1.15 : 1.15 + Math.sin(simTime * 11 + idx * 2.3) * 0.12;
        sp.scale.set(flicker, flicker * 1.32, 1);
      });

      // Update Camera Position with Smooth Follow & Raycast Wall/Ground Collision
      const desiredFocus = new THREE.Vector3(
        heroRoot.position.x * 0.65,
        heroRoot.position.y + 1.55,
        heroRoot.position.z * 0.55 - 0.8
      );
      smoothFocus.lerp(desiredFocus, Math.min(1, dt * 8.0));

      let effectiveYaw = camYaw;
      let effectivePitch = camPitch;
      let effectiveDist = camDist;

      if ((isCaptureMode || pinnedTimeParam !== null) && initialYawParam === null) {
        effectiveYaw = 0.0;
        effectivePitch = 0.36;
        effectiveDist = 7.4;
      }

      const offset = new THREE.Vector3(
        Math.sin(effectiveYaw) * Math.cos(effectivePitch) * effectiveDist,
        Math.sin(effectivePitch) * effectiveDist,
        Math.cos(effectiveYaw) * Math.cos(effectivePitch) * effectiveDist
      );
      const desiredCamPos = smoothFocus.clone().add(offset);

      const rayDir = desiredCamPos.clone().sub(smoothFocus);
      const maxRayDist = rayDir.length();
      if (maxRayDist > 0.01 && cameraColliders.length > 0) {
        raycaster.set(smoothFocus, rayDir.normalize());
        raycaster.far = maxRayDist;
        const hits = raycaster.intersectObjects(cameraColliders, true);
        if (hits.length > 0 && hits[0].distance < maxRayDist) {
          const safeDist = Math.max(2.2, hits[0].distance - 0.35);
          desiredCamPos.copy(smoothFocus).addScaledVector(rayDir, safeDist);
        }
      }
      desiredCamPos.y = Math.max(0.85, desiredCamPos.y);

      camera.position.copy(desiredCamPos);
      camera.lookAt(smoothFocus);

      composer.render();
    };
    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.dispose();
    };
  }, [qualityPreset]);

  const bossHpPct = Math.max(0, Math.min(100, (bossHp / maxBossHp) * 100));

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none font-sans">
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* REAL COMBAT HIT DAMAGE NUMBERS */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        {hitNumbers.map((h) => (
          <div
            key={h.id}
            style={{ left: `${h.screenX}%`, top: `${h.screenY}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          >
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              {h.label}
            </span>
            <span
              className={`font-black italic tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.98)] ${
                h.isCrit
                  ? 'text-3xl md:text-4xl bg-gradient-to-b from-amber-100 via-amber-300 to-orange-500 bg-clip-text text-transparent'
                  : 'text-2xl md:text-3xl text-amber-200'
              }`}
            >
              {h.damage}
            </span>
          </div>
        ))}
      </div>

      {/* NON-CAPTURE INTERACTIVE HEADER & OBSIDIAN MEMORY-GRAPH WITNESS (Hidden in ?capture=1 per Requirement 8) */}
      {!isCaptureMode && (
        <div className="absolute top-3 left-4 right-4 z-30 flex items-start justify-between pointer-events-none">
          <div className="flex flex-col gap-1.5 pointer-events-auto">
            <div className="flex items-center gap-2 bg-neutral-950/88 backdrop-blur-md border border-amber-500/35 rounded-xl px-3.5 py-2 shadow-xl">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <div>
                <div className="text-xs font-black tracking-wider uppercase text-amber-100">
                  DREAM ONLINE · SUNKEN BASTION OF ASHFALL
                </div>
                <div className="text-[10px] text-neutral-400 font-medium">
                  Drag Mouse: Orbit Camera ({cameraHudReadout.yawDeg}°, {cameraHudReadout.pitchDeg}°) · Scroll: Zoom ({cameraHudReadout.dist}m) · WASD: Move · Click: Slash
                </div>
              </div>
            </div>

            {/* Live Obsidian Memory-Graph & Mireth Witness Feed + Party Aura Rules */}
            <div className="bg-neutral-950/85 backdrop-blur-md border border-purple-500/35 rounded-xl px-3 py-1.5 shadow-lg max-w-[390px]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-purple-300">
                  OBSIDIAN MEMORY-GRAPH · MIRETH WITNESS
                </span>
                <button
                  onClick={() =>
                    setActivePartyBuff((prev) =>
                      prev === 'EMPOWER (+30% DMG)'
                        ? 'OBLI (60% DR)'
                        : prev === 'OBLI (60% DR)'
                        ? 'CHRONO (INSTANT CD)'
                        : 'EMPOWER (+30% DMG)'
                    )
                  }
                  className="px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-400/40 text-[9px] font-bold text-amber-200 cursor-pointer"
                >
                  Party Call: {activePartyBuff}
                </button>
              </div>
              <div className="space-y-0.5">
                {mirethMemories.map((mem, idx) => (
                  <div key={idx} className="text-[10px] text-neutral-300 truncate">
                    • {mem}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() =>
                setQualityPreset((prev) =>
                  prev === 'high' ? 'balanced' : prev === 'balanced' ? 'performance' : 'high'
                )
              }
              className="px-2.5 py-1.5 rounded-xl bg-neutral-950/88 border border-amber-500/35 text-amber-200 text-[11px] font-bold cursor-pointer shadow-lg uppercase"
              title="Cycle 60 FPS Render Quality Preset (High / Balanced / Performance)"
            >
              Quality: {qualityPreset}
            </button>
            <button
              onClick={() => setIsUnifiedWorkspaceOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-sky-950/90 hover:bg-sky-900 border border-sky-400/60 text-sky-100 text-xs font-bold cursor-pointer shadow-lg"
            >
              ⊞ Unified 3-Pane Dashboard &amp; 5h Model Switcher
            </button>
            {onOpenStudioDrawer && (
              <button
                onClick={onOpenStudioDrawer}
                className="px-3 py-1.5 rounded-xl bg-neutral-950/85 border border-white/15 text-neutral-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                Studio Tools ▾
              </button>
            )}
          </div>
        </div>
      )}

      {isUnifiedWorkspaceOpen && (
        <div className="fixed inset-0 z-50">
          <UnifiedAntigravityWorkspaceShell
            initialView={initialWorkspaceView}
            initialModelPickerOpen={params.get('picker') === '1'}
            onReturnToFull3dViewport={() => setIsUnifiedWorkspaceOpen(false)}
          />
        </div>
      )}

      {/* TOP-CENTER BOSS HEALTH BAR */}
      <div
        className={`absolute ${
          isCaptureMode ? 'top-5' : 'top-16'
        } left-1/2 -translate-x-1/2 z-20 w-[500px] max-w-[90vw] pointer-events-none`}
      >
        <div className="bg-gradient-to-b from-neutral-950/92 to-stone-950/88 border border-amber-600/65 rounded-xl px-4 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.88)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs md:text-sm font-black tracking-[0.14em] text-amber-200 uppercase">
              ⚔ MYTH@S · THE CRIMSON SOVEREIGN
            </span>
            <span className="text-xs font-bold text-amber-400 font-mono">
              {bossHp} / {maxBossHp} HP
            </span>
          </div>
          <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden border border-amber-900/75 p-0.5">
            <div
              style={{ width: `${bossHpPct}%` }}
              className="h-full rounded-full bg-gradient-to-r from-red-800 via-red-600 to-amber-500 transition-all duration-200"
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase text-neutral-400">
            <span>SUNKEN BASTION SANCTUARY · PARTY AURA: {activePartyBuff}</span>
            <span className="text-amber-300">{activeMoveLabel}</span>
          </div>
        </div>
      </div>

      {/* BOTTOM DIEGETIC DREAMWARDEN ACTION BAR */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-end gap-3">
        <div className="relative w-20 h-20 rounded-full bg-neutral-950 border-2 border-amber-600/75 shadow-[0_0_24px_rgba(220,38,38,0.55)] overflow-hidden flex items-center justify-center">
          <div className="absolute bottom-0 inset-x-0 h-[92%] bg-gradient-to-t from-red-950 via-red-600 to-rose-400" />
          <div className="relative z-10 text-center">
            <div className="text-xs font-black text-white drop-shadow">{heroHp}</div>
            <div className="text-[8px] font-black uppercase tracking-widest text-rose-200">VITALITY</div>
          </div>
        </div>

        <div className="bg-neutral-950/92 border border-amber-600/65 rounded-2xl px-3.5 py-2 shadow-2xl flex items-center gap-2">
          {[
            { key: 'LMB', name: 'Shadow Fang', dmg: 245, heavy: false, color: 'from-sky-600 to-blue-800' },
            { key: 'RMB', name: 'Twin Viper', dmg: 395, heavy: true, color: 'from-cyan-500 to-indigo-800' },
            { key: 'Q', name: 'Whirlwind', dmg: 310, heavy: false, color: 'from-emerald-600 to-teal-800' },
            { key: 'E', name: 'Dream Lunge', dmg: 340, heavy: false, color: 'from-amber-500 to-amber-700' },
            { key: 'R', name: 'Mythos Flame', dmg: 610, heavy: true, color: 'from-blue-500 to-purple-900' },
            { key: 'F', name: 'Oathcall', dmg: 440, heavy: true, color: 'from-rose-600 to-red-900' },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => triggerAttackRef.current?.(s.name.toUpperCase(), s.dmg, s.heavy)}
              className={`w-16 h-14 rounded-xl bg-gradient-to-br ${s.color} border border-amber-300/60 flex flex-col items-center justify-between p-1.5 hover:scale-105 active:scale-95 transition-transform cursor-pointer`}
            >
              <span className="self-start px-1 rounded bg-black/75 text-[8px] font-black text-amber-200">
                {s.key}
              </span>
              <span className="text-[10px] font-black text-white leading-tight text-center drop-shadow">
                {s.name}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-20 h-20 rounded-full bg-neutral-950 border-2 border-amber-600/75 shadow-[0_0_24px_rgba(245,158,11,0.55)] overflow-hidden flex items-center justify-center">
          <div
            style={{ height: `${heroResolve}%` }}
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-amber-950 via-orange-500 to-yellow-300 transition-all duration-300"
          />
          <div className="relative z-10 text-center">
            <div className="text-xs font-black text-white drop-shadow">{heroResolve}%</div>
            <div className="text-[8px] font-black uppercase tracking-widest text-amber-100">RESOLVE</div>
          </div>
        </div>
      </div>
    </div>
  );
};
