import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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
  const pinnedTimeParam = params.get('t') ? parseFloat(params.get('t')!) : null;
  const initialYawParam = params.get('yaw') ? parseFloat(params.get('yaw')!) : null;
  const initialPitchParam = params.get('pitch') ? parseFloat(params.get('pitch')!) : null;
  const initialDistParam = params.get('dist') ? parseFloat(params.get('dist')!) : null;

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

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x18141c, 0.016);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.15, 220);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.32, // controlled bloom strength
      0.28, // tight radius
      0.88  // high threshold
    );
    composer.addPass(bloomPass);

    // ---------------------------------------------------------------------------
    // 1. REAL TILED CC0 PBR TEXTURES (Verified filenames in public/assets/third_party/textures/)
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

    const flagstoneDiff = loadPbrTex('/assets/third_party/textures/facade/concrete_wall_003_diff_1k.jpg', 7, 7, true);
    const flagstoneNor = loadPbrTex('/assets/third_party/textures/facade/concrete_wall_003_nor_gl_1k.jpg', 7, 7, false);
    const flagstoneArm = loadPbrTex('/assets/third_party/textures/facade/concrete_wall_003_arm_1k.jpg', 7, 7, false);

    const earthDiff = loadPbrTex('/assets/third_party/textures/ground/aerial_grass_rock_diff_1k.jpg', 14, 14, true);
    const earthNor = loadPbrTex('/assets/third_party/textures/ground/aerial_grass_rock_nor_gl_1k.jpg', 14, 14, false);
    const earthRough = loadPbrTex('/assets/third_party/textures/ground/aerial_grass_rock_rough_1k.jpg', 14, 14, false);

    const cragDiff = loadPbrTex('/assets/third_party/textures/rock/rock_face_03_diff_1k.jpg', 6, 6, true);
    const cragNor = loadPbrTex('/assets/third_party/textures/rock/rock_face_03_nor_gl_1k.jpg', 6, 6, false);
    const cragArm = loadPbrTex('/assets/third_party/textures/rock/rock_face_03_arm_1k.jpg', 6, 6, false);

    const dirtDiff = loadPbrTex('/assets/third_party/textures/dirt/dirt_diff_1k.jpg', 6, 6, true);
    const dirtNor = loadPbrTex('/assets/third_party/textures/dirt/dirt_nor_gl_1k.jpg', 6, 6, false);
    const dirtArm = loadPbrTex('/assets/third_party/textures/dirt/dirt_arm_1k.jpg', 6, 6, false);

    const armorMetalDiff = loadPbrTex('/assets/third_party/textures/armor/metal_plate_02_diff_1k.jpg', 3, 3, true);
    const armorMetalNor = loadPbrTex('/assets/third_party/textures/armor/metal_plate_02_nor_gl_1k.jpg', 3, 3, false);

    // ---------------------------------------------------------------------------
    // 2. SKY, HDRI-STYLE IBL ENVIRONMENT, SHADOW KEY LIGHT & RIM LIGHT
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
          vec3 zenith = vec3(0.14, 0.18, 0.30);
          vec3 horizon = vec3(0.82, 0.48, 0.24);
          vec3 ground = vec3(0.16, 0.12, 0.10);
          vec3 col = h >= 0.0
            ? mix(horizon, zenith, pow(h, 0.52))
            : mix(horizon, ground, clamp(-h * 3.0, 0.0, 1.0));
          gl_FragColor = vec4(col * 1.45, 1.0);
        }
      `,
    });
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), envMat));
    scene.environment = pmremGenerator.fromScene(envScene, 0.04).texture;

    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(180, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uSunDir: { value: new THREE.Vector3(0.38, 0.26, -0.88).normalize() },
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
            vec3 zenith = vec3(0.08, 0.11, 0.19);
            vec3 midSky = vec3(0.24, 0.20, 0.28);
            vec3 horizon = vec3(0.72, 0.39, 0.20);
            vec3 ground = vec3(0.09, 0.07, 0.08);
            vec3 col = y > 0.0
              ? mix(horizon, mix(midSky, zenith, clamp(y * 1.4, 0.0, 1.0)), pow(y, 0.45))
              : mix(horizon, ground, clamp(-y * 3.5, 0.0, 1.0));
            float sun = max(dot(normalize(vDir), uSunDir), 0.0);
            col += vec3(0.95, 0.62, 0.32) * pow(sun, 24.0) * 0.42;
            col += vec3(1.0, 0.84, 0.58) * pow(sun, 320.0) * 0.95;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      })
    );
    scene.add(skyDome);

    const hemiLight = new THREE.HemisphereLight(0xffd6ad, 0x2e262e, 1.25);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe2b8, 2.9);
    keyLight.position.set(16, 26, 14);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 85;
    const shadowBounds = 22;
    keyLight.shadow.camera.left = -shadowBounds;
    keyLight.shadow.camera.right = shadowBounds;
    keyLight.shadow.camera.top = shadowBounds;
    keyLight.shadow.camera.bottom = -shadowBounds;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.65);
    rimLight.position.set(-18, 14, -18);
    scene.add(rimLight);

    // ---------------------------------------------------------------------------
    // 3. ONE FILM-SET ARENA: "THE SUNKEN BASTION OF ASHFALL"
    // ---------------------------------------------------------------------------
    const cameraColliders: THREE.Object3D[] = [];

    const outerGroundGeo = new THREE.PlaneGeometry(160, 160, 96, 96);
    outerGroundGeo.rotateX(-Math.PI / 2);
    const gPos = outerGroundGeo.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      const vx = gPos.getX(i);
      const vz = gPos.getZ(i);
      const r = Math.hypot(vx, vz + 1.5);
      const wave =
        Math.sin(vx * 0.18) * Math.cos(vz * 0.16) * 0.18 +
        Math.sin(vx * 0.45 + vz * 0.38) * 0.06;
      const rimLift = r > 13.5 ? Math.min(6.5, Math.pow((r - 13.5) * 0.18, 1.45)) : 0;
      gPos.setY(i, rimLift + (r > 10.5 ? wave : wave * 0.15));
    }
    outerGroundGeo.computeVertexNormals();
    const outerGroundMat = new THREE.MeshStandardMaterial({
      map: earthDiff,
      normalMap: earthNor,
      roughnessMap: earthRough,
      roughness: 0.85,
      metalness: 0.06,
      color: new THREE.Color(0x968b7c),
    });
    const outerGround = new THREE.Mesh(outerGroundGeo, outerGroundMat);
    outerGround.receiveShadow = true;
    scene.add(outerGround);
    cameraColliders.push(outerGround);

    // Sunken Bastion Inner Flagstone Courtyard
    const bastionFloorMat = new THREE.MeshStandardMaterial({
      map: flagstoneDiff,
      normalMap: flagstoneNor,
      aoMap: flagstoneArm,
      roughness: 0.64,
      metalness: 0.18,
      color: new THREE.Color(0x988e86),
    });
    const bastionCourtyard = new THREE.Mesh(
      new THREE.CylinderGeometry(11.2, 11.8, 0.36, 48),
      bastionFloorMat
    );
    bastionCourtyard.position.set(0, 0.08, -1.5);
    bastionCourtyard.receiveShadow = true;
    scene.add(bastionCourtyard);

    // Weathered Stone Flagstone Slabs & Rubble Clusters Across the Courtyard (Zero flat circles!)
    const slabMat = new THREE.MeshStandardMaterial({
      map: cragDiff,
      normalMap: cragNor,
      aoMap: cragArm,
      roughness: 0.82,
      metalness: 0.08,
      color: new THREE.Color(0x887d73),
    });
    const weatheredSlabs = [
      [-3.4, -0.5, 2.2, 1.6, 0.4],
      [3.8, -2.4, 2.5, 1.8, 1.1],
      [-1.8, -4.8, 2.1, 1.5, 2.2],
      [2.4, 2.6, 1.9, 1.4, 0.8],
      [-4.4, 2.9, 2.3, 1.7, 1.7],
    ];
    for (const [sx, sz, sw, sd, rot] of weatheredSlabs) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.09, sd), slabMat);
      slab.rotation.y = rot;
      slab.position.set(sx, 0.25, sz);
      slab.castShadow = true;
      slab.receiveShadow = true;
      scene.add(slab);
    }

    // Scattered Crag Boulders & Rubble Rocks around the Bastion
    const cragRockMat = new THREE.MeshStandardMaterial({
      map: cragDiff,
      normalMap: cragNor,
      aoMap: cragArm,
      roughness: 0.72,
      metalness: 0.12,
      color: new THREE.Color(0x887f76),
    });
    const rockClusters = [
      [-9.8, 0.4, -7.2, 1.8, 1.2, 1.5, 0.4],
      [10.2, 0.4, -6.8, 2.1, 1.4, 1.6, -0.6],
      [-10.5, 0.35, 1.5, 1.5, 1.0, 1.3, 1.1],
      [10.4, 0.35, 2.0, 1.7, 1.1, 1.4, 0.2],
      [-6.5, 0.3, -10.8, 2.4, 1.6, 1.8, 0.8],
      [6.8, 0.3, -10.5, 2.2, 1.5, 1.7, -0.5],
      [-4.2, 0.26, 0.8, 0.55, 0.32, 0.48, 0.9],
      [4.5, 0.26, -0.6, 0.62, 0.35, 0.52, -0.4],
      [-2.4, 0.26, 4.2, 0.48, 0.28, 0.42, 0.3],
      [2.8, 0.26, 3.8, 0.52, 0.30, 0.45, -0.7],
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

    // Torch Point Lights & Soft Flame Sprites on the Bastion Pillars
    const flameSpriteTex = createSoftParticleTexture(
      'rgba(255, 250, 210, 1.0)',
      'rgba(255, 125, 25, 0.78)',
      'rgba(255, 40, 0, 0.0)'
    );
    const torchSpriteMat = new THREE.SpriteMaterial({
      map: flameSpriteTex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const torchPositions = [
      [-7.4, 3.4, -7.8],
      [7.4, 3.4, -7.8],
      [-8.8, 3.4, -1.8],
      [8.8, 3.4, -1.8],
    ];
    const torchSprites: THREE.Sprite[] = [];
    for (const [tx, ty, tz] of torchPositions) {
      const tLight = new THREE.PointLight(0xff8429, 3.4, 14, 1.5);
      tLight.position.set(tx, ty + 0.25, tz);
      scene.add(tLight);

      const sprite = new THREE.Sprite(torchSpriteMat);
      sprite.position.set(tx, ty, tz);
      sprite.scale.set(1.25, 1.65, 1.0);
      scene.add(sprite);
      torchSprites.push(sprite);
    }

    // ---------------------------------------------------------------------------
    // 4. LOAD MODULAR RUINS ARCHITECTURE & TREES
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
                map: cragDiff,
                normalMap: cragNor,
                roughness: 0.62,
                metalness: 0.2,
                color: new THREE.Color(0x9a8f86),
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
      placePiece('Bricks', -4.8, 0.24, -6.2, 0.9, 0.5, true);
      placePiece('Bricks', 5.1, 0.24, -5.8, 0.9, -0.7, true);
      placePiece('Barrel', -6.2, 0.26, -3.2, 1.05, 0.3, false);
      placePiece('Crate', -5.4, 0.26, -3.6, 0.85, 0.8, false);
      placePiece('Barrel', 6.4, 0.26, -2.8, 1.05, -0.4, false);
      placePiece('Chest_Gold_Base', 0, 0.26, -9.6, 0.8, 0, false);
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
    // 5. ANIMATED HERO ("Dreamwarden Vanguard"), POLYGONAL BOSS ("Veynar, the Hollow
    //    Sovereign"), AND DISTINCT ANIMATED MINIONS ("Ashbound Sentinels")
    // ---------------------------------------------------------------------------
    const mixers: THREE.AnimationMixer[] = [];
    const heroRoot = new THREE.Group();
    heroRoot.position.set(0, 0.26, 3.8);
    scene.add(heroRoot);

    const bossRoot = new THREE.Group();
    bossRoot.position.set(0, 0.26, -3.6);
    scene.add(bossRoot);

    // A) Load Animated Hero (`Male_Ranger.gltf` with 1K UV-mapped PBR textures +
    //    Blender-verified post-multiplied rest quaternions so arms are DOWN holding the sword,
    //    never T-posing, and animate smoothly through Run & Sword Slash cycles!)
    const heroBones: Record<string, { bone: THREE.Bone; restQuat: THREE.Quaternion }> = {};
    const heroSwordHolder = new THREE.Group();
    heroRoot.add(heroSwordHolder);
    let heroWeaponTipObj: THREE.Object3D = heroSwordHolder;

    gltfLoader.load('/assets/third_party/quaternius_outfits/Male_Ranger.gltf', (gltf) => {
      const ranger = gltf.scene;
      ranger.scale.set(1.26, 1.26, 1.26);
      ranger.rotation.y = Math.PI;
      ranger.traverse((c) => {
        if ((c as THREE.Bone).isBone) {
          heroBones[c.name] = {
            bone: c as THREE.Bone,
            restQuat: c.quaternion.clone(),
          };
        }
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      heroRoot.add(ranger);

      gltfLoader.load('/assets/models/sovereign-greatsword.glb', (swordGltf) => {
        const blade = swordGltf.scene.clone(true);
        blade.scale.set(0.95, 0.95, 0.95);
        blade.traverse((sc) => {
          if ((sc as THREE.Mesh).isMesh) {
            sc.castShadow = true;
            const mat = (sc as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (mat && mat.emissiveIntensity !== undefined) {
              mat.emissiveIntensity = Math.min(mat.emissiveIntensity, 1.15);
            }
          }
        });
        heroSwordHolder.add(blade);
        const tip = new THREE.Object3D();
        tip.position.set(0, 0, 1.38);
        blade.add(tip);
        heroWeaponTipObj = tip;
      });
    });

    // B) Load Animated Boss ("Veynar, the Hollow Sovereign") + 4 Distinct Animated Minions
    //    Note: UniversalBaseCharacter.glb has an internal 100x FBX scale on its bones,
    //    so all armor/weapons are either placed in bossRoot (scale 1.0) or scaled by 0.01!
    interface MinionActor {
      group: THREE.Group;
      hp: number;
      headBone?: THREE.Object3D;
      chestBone?: THREE.Object3D;
      handRBone?: THREE.Object3D;
      crestMesh?: THREE.Object3D;
      breastplateMesh?: THREE.Object3D;
      spearMesh?: THREE.Object3D;
    }
    const minions: MinionActor[] = [];
    let bossActions: {
      idle?: THREE.AnimationAction;
      attack?: THREE.AnimationAction;
      hit?: THREE.AnimationAction;
    } = {};
    let bossTrackRefs: {
      chestBone?: THREE.Object3D;
      headBone?: THREE.Object3D;
      shoulderLBone?: THREE.Object3D;
      shoulderRBone?: THREE.Object3D;
      handRBone?: THREE.Object3D;
      cuirass?: THREE.Object3D;
      greathelm?: THREE.Object3D;
      pauldronL?: THREE.Object3D;
      pauldronR?: THREE.Object3D;
      polearm?: THREE.Group;
    } = {};

    gltfLoader.load('/assets/third_party/quaternius/UniversalBaseCharacter.glb', (gltf) => {
      const findClip = (namePart: string) =>
        gltf.animations.find((a) => a.name.toLowerCase().includes(namePart.toLowerCase()));

      const idleClip = findClip('Sword_Idle') || findClip('Idle_Loop') || gltf.animations[0];
      const attack1Clip = findClip('Sword_Attack') || idleClip;
      const hitClip = findClip('Hit_Chest') || idleClip;

      // ---- B1) BOSS: MYTH@S (Spiked Black & Crimson Plate + Glowing Red Polearm-Axe per memory-graph) ----
      const bossModel = SkeletonUtils.clone(gltf.scene);
      bossModel.scale.set(2.15, 2.15, 2.15);
      bossModel.rotation.y = 0;

      const bossBodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x1e1822),
        roughness: 0.28,
        metalness: 0.88,
      });

      // No UV map on procedural bmesh armor kit so every beveled facet receives full PBR specular lighting!
      const bossPlateMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x3d1c24),
        emissive: new THREE.Color(0x24070b),
        emissiveIntensity: 0.35,
        roughness: 0.24,
        metalness: 0.88,
      });

      const bossCrimsonBladeMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xef4444),
        emissive: new THREE.Color(0xdc2626),
        emissiveIntensity: 0.85,
        roughness: 0.18,
        metalness: 0.92,
      });

      // Match sanitized Three.js GLTF bone names (dots stripped by PropertyBinding)
      bossModel.traverse((c) => {
        const n = c.name.toLowerCase();
        if (n.includes('def-spine003') || n.includes('def-spine.003') || n.includes('spine_03')) {
          bossTrackRefs.chestBone = c;
        } else if (n === 'def-head' || n.endsWith('head')) {
          bossTrackRefs.headBone = c;
        } else if (n.includes('def-upper_arml') || n.includes('def-upper_arm.l')) {
          bossTrackRefs.shoulderLBone = c;
        } else if (n.includes('def-upper_armr') || n.includes('def-upper_arm.r')) {
          bossTrackRefs.shoulderRBone = c;
        } else if (n.includes('def-handr') || n.includes('def-hand.r')) {
          bossTrackRefs.handRBone = c;
        }
        if ((c as THREE.Mesh).isMesh) {
          (c as THREE.Mesh).material = bossBodyMat;
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      bossRoot.add(bossModel);

      // Place armor & polearm-axe in bossRoot (scale 1.0, immune to 100x bone scale)
      // and track world bone positions every frame!
      const polearmGroup = new THREE.Group();
      polearmGroup.position.set(-0.95, 2.25, 0.55);
      bossRoot.add(polearmGroup);
      bossTrackRefs.polearm = polearmGroup;

      gltfLoader.load('/assets/models/veynar-boss-armor-kit.glb', (kitGltf) => {
        const spawnKitMesh = (
          partName: string,
          parent: THREE.Object3D,
          pos: [number, number, number],
          rot: [number, number, number],
          scale: [number, number, number],
          overrideMat: THREE.Material
        ): THREE.Object3D | undefined => {
          const part = kitGltf.scene.getObjectByName(partName);
          if (!part) return undefined;
          const clone = part.clone(true);
          clone.position.set(...pos);
          clone.rotation.set(...rot);
          clone.scale.set(...scale);
          clone.traverse((pc) => {
            if ((pc as THREE.Mesh).isMesh) {
              (pc as THREE.Mesh).material = overrideMat;
              pc.castShadow = true;
              pc.receiveShadow = true;
            }
          });
          parent.add(clone);
          return clone;
        };

        // Blender GLTF exporter already converts +Z up to +Y up, so rotation is [0, 0, 0]!
        bossTrackRefs.cuirass = spawnKitMesh(
          'BossCuirass',
          bossRoot,
          [0, 2.55, 0.04],
          [0, 0, 0],
          [0.92, 0.92, 0.92],
          bossPlateMat
        );
        bossTrackRefs.greathelm = spawnKitMesh(
          'BossGreathelm',
          bossRoot,
          [0, 3.55, 0.04],
          [0, 0, 0],
          [0.96, 0.96, 0.96],
          bossPlateMat
        );
        bossTrackRefs.pauldronL = spawnKitMesh(
          'BossPauldronL',
          bossRoot,
          [0.72, 3.02, 0.0],
          [0, 0, -0.18],
          [0.92, 0.92, 0.92],
          bossPlateMat
        );
        bossTrackRefs.pauldronR = spawnKitMesh(
          'BossPauldronR',
          bossRoot,
          [-0.72, 3.02, 0.0],
          [0, 0, 0.18],
          [0.92, 0.92, 0.92],
          bossPlateMat
        );
        spawnKitMesh(
          'BossHalberdShaft',
          polearmGroup,
          [0, 0, 0],
          [0.35, 0.1, -0.15],
          [0.88, 0.88, 0.88],
          bossPlateMat
        );
        spawnKitMesh(
          'BossHalberdBlade',
          polearmGroup,
          [0, 0, 0],
          [0.35, 0.1, -0.15],
          [0.88, 0.88, 0.88],
          bossCrimsonBladeMat
        );
      });

      const bossMixer = new THREE.AnimationMixer(bossModel);
      mixers.push(bossMixer);
      bossActions = {
        idle: idleClip ? bossMixer.clipAction(idleClip) : undefined,
        attack: attack1Clip ? bossMixer.clipAction(attack1Clip) : undefined,
        hit: hitClip ? bossMixer.clipAction(hitClip) : undefined,
      };
      if (bossActions.attack) {
        bossActions.attack.timeScale = 0.68;
        bossActions.attack.play();
      }

      // ---- B2) 4 DISTINCT ANIMATED MINIONS ("Ashbound Sentinels") ----
      const minionSpecs = [
        { x: -2.9, z: -1.2, bodyColor: 0x7c3f2c, trimColor: 0xf59e0b },
        { x: 3.0, z: -1.3, bodyColor: 0x334e68, trimColor: 0x38bdf8 },
        { x: -3.9, z: -3.2, bodyColor: 0x4c355c, trimColor: 0xc084fc },
        { x: 3.8, z: -3.1, bodyColor: 0x3f5232, trimColor: 0xa3e635 },
      ];

      minionSpecs.forEach((spec, idx) => {
        const mGroup = new THREE.Group();
        mGroup.position.set(spec.x, 0.26, spec.z);
        mGroup.lookAt(0, 0.26, 2.2);
        scene.add(mGroup);

        const mClone = SkeletonUtils.clone(gltf.scene);
        mClone.scale.set(1.08, 1.08, 1.08);

        const mBodyMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(spec.bodyColor),
          roughness: 0.38,
          metalness: 0.72,
        });
        const mTrimMat = new THREE.MeshStandardMaterial({
          map: armorMetalDiff,
          normalMap: armorMetalNor,
          roughness: 0.25,
          metalness: 0.88,
          color: new THREE.Color(spec.trimColor),
        });

        let headBone: THREE.Object3D | undefined;
        let chestBone: THREE.Object3D | undefined;
        let handRBone: THREE.Object3D | undefined;

        mClone.traverse((c) => {
          const n = c.name.toLowerCase();
          if (n === 'def-head' || n.endsWith('head')) headBone = c;
          else if (n.includes('def-spine002') || n.includes('def-spine003')) chestBone = c;
          else if (n.includes('def-handr') || n.includes('def-hand.r')) handRBone = c;

          if ((c as THREE.Mesh).isMesh) {
            (c as THREE.Mesh).material = mBodyMat;
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        mGroup.add(mClone);

        const crest = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 5), mTrimMat);
        crest.position.set(0, 1.82, 0.02);
        crest.castShadow = true;
        mGroup.add(crest);

        const breastplate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.24), mTrimMat);
        breastplate.position.set(0, 1.25, 0.0);
        breastplate.castShadow = true;
        mGroup.add(breastplate);

        const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.65, 8), mTrimMat);
        spear.position.set(0.35, 1.15, 0.32);
        spear.rotation.x = Math.PI * 0.38;
        spear.castShadow = true;
        mGroup.add(spear);

        const mMixer = new THREE.AnimationMixer(mClone);
        mixers.push(mMixer);
        if (attack1Clip) {
          const action = mMixer.clipAction(attack1Clip);
          action.time = idx * 0.45;
          action.timeScale = 0.88;
          action.play();
        }
        minions.push({
          group: mGroup,
          hp: 400,
          headBone,
          chestBone,
          handRBone,
          crestMesh: crest,
          breastplateMesh: breastplate,
          spearMesh: spear,
        });
      });
    });

    // ---------------------------------------------------------------------------
    // 6. SOFT-TEXTURED PARTICLE SPRITES, RIBBON SLASH TRAILS & IMPACT FLASHES
    // ---------------------------------------------------------------------------
    const emberTex = createSoftParticleTexture(
      'rgba(255, 245, 200, 1.0)',
      'rgba(255, 110, 20, 0.72)',
      'rgba(255, 30, 0, 0.0)'
    );
    const smokeTex = createSoftParticleTexture(
      'rgba(110, 100, 95, 0.32)',
      'rgba(55, 50, 52, 0.14)',
      'rgba(20, 18, 20, 0.0)'
    );

    const emberCount = 180;
    const emberPositions = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      emberPositions[i * 3] = (Math.random() - 0.5) * 22;
      emberPositions[i * 3 + 1] = Math.random() * 8.5;
      emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 22 - 1.5;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    const emberParticles = new THREE.Points(
      emberGeo,
      new THREE.PointsMaterial({
        map: emberTex,
        size: 0.32,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    scene.add(emberParticles);

    for (let i = 0; i < 12; i++) {
      const sMat = new THREE.SpriteMaterial({
        map: smokeTex,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      });
      const sp = new THREE.Sprite(sMat);
      const ang = (i / 12) * Math.PI * 2;
      const rad = 5.2 + (i % 3) * 2.0;
      sp.position.set(Math.cos(ang) * rad, 0.85 + (i % 2) * 0.4, Math.sin(ang) * rad - 1.5);
      sp.scale.set(3.6, 2.0, 1.0);
      scene.add(sp);
    }

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
    // 9. MAIN ANIMATION LOOP & BLENDER-VERIFIED QUATERNION SKELETAL POSE DRIVER
    // ---------------------------------------------------------------------------
    const clock = new THREE.Clock();
    let animId = 0;
    let lastAutoStrikeKey = '';

    // Helper that post-multiplies a local Euler delta onto the bone's rest quaternion
    // (Verified in Blender 5.2.3 LTS: l_sign = -1, r_sign = +1 lowers arms from T-pose!)
    const applyBoneDelta = (boneName: string, rxDeg: number, ryDeg: number, rzDeg: number) => {
      const entry = heroBones[boneName];
      if (!entry) return;
      const d2r = Math.PI / 180;
      const deltaQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rxDeg * d2r, ryDeg * d2r, rzDeg * d2r, 'XYZ')
      );
      entry.bone.quaternion.copy(entry.restQuat).multiply(deltaQ);
    };

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const rawDt = Math.min(clock.getDelta(), 0.05);
      const simTime = pinnedTimeParam !== null ? pinnedTimeParam : clock.getElapsedTime();
      const dt = pinnedTimeParam !== null ? 0.016 : rawDt;

      let isMoving = false;

      // Per memory-graph/DREAM pipeline facts 2026-09-24.md:
      // "The rig natively faces -Z, so no PI flip."
      if (isCaptureMode || pinnedTimeParam !== null) {
        const cycleT = pinnedTimeParam !== null ? pinnedTimeParam : simTime % 7.0;
        if (cycleT < 1.8) {
          const alpha = Math.min(1, cycleT / 1.8);
          heroRoot.position.set(0, 0.26, 4.2 - alpha * 5.2);
          heroRoot.rotation.y = 0;
          isMoving = true;
          setActiveMoveLabel('VANGUARD SPRINT');
        } else if (cycleT < 4.2) {
          heroRoot.position.set(Math.sin((cycleT - 1.8) * 1.6) * 0.55, 0.26, -1.25);
          heroRoot.rotation.y = 0;
          const strikeWindowKey = `combo_${Math.floor(cycleT * 1.4)}`;
          if (strikeWindowKey !== lastAutoStrikeKey) {
            lastAutoStrikeKey = strikeWindowKey;
            startHeroAttack('SUNBREAKER CLEAVE', 340, true);
          }
        } else {
          heroRoot.position.set(0, 0.26, -1.15);
          heroRoot.rotation.y = 0;
          const ultKey = `ult_${Math.floor(cycleT)}`;
          if (ultKey !== lastAutoStrikeKey) {
            lastAutoStrikeKey = ultKey;
            startHeroAttack('SOVEREIGN RECKONING', 580, true);
          }
        }
      } else {
        let moveX = 0;
        let moveZ = 0;
        if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

        if (moveX !== 0 || moveZ !== 0) {
          isMoving = true;
          const moveAngle = Math.atan2(moveX, moveZ) + camYaw;
          const speed = 5.8;
          heroRoot.position.x = Math.max(-9.5, Math.min(9.5, heroRoot.position.x + Math.sin(moveAngle) * speed * dt));
          heroRoot.position.z = Math.max(-8.5, Math.min(8.5, heroRoot.position.z + Math.cos(moveAngle) * speed * dt));
          heroRoot.rotation.y = moveAngle + Math.PI;
        } else if (!activeStrike) {
          const distToBoss = heroRoot.position.distanceTo(bossRoot.position);
          if (distToBoss > 3.1) {
            isMoving = true;
            const dirToBoss = bossRoot.position.clone().sub(heroRoot.position).normalize();
            heroRoot.position.addScaledVector(dirToBoss, 3.2 * dt);
            heroRoot.rotation.y = Math.atan2(-dirToBoss.x, -dirToBoss.z);
          } else {
            const autoSlot = `live_${Math.floor(simTime * 1.0)}`;
            if (autoSlot !== lastAutoStrikeKey) {
              lastAutoStrikeKey = autoSlot;
              startHeroAttack(
                Math.floor(simTime) % 2 === 0 ? 'RIFT SLASH' : 'SUNBREAKER CLEAVE',
                Math.floor(simTime) % 2 === 0 ? 245 : 390,
                Math.floor(simTime) % 2 !== 0
              );
            }
          }
        }
      }

      // Animate Hero Skeleton (`Male_Ranger.gltf`) using Blender-verified rest-pose deltas
      // (Both arms lowered from T-pose & animated in Run / Slash / Idle cadence!)
      const cyclePhase = simTime * (isMoving ? 9.5 : 4.2);
      const swingProgress = activeStrike ? activeStrike.elapsed / activeStrike.duration : 0;
      const swingArcDeg = activeStrike ? Math.sin(swingProgress * Math.PI) * 68 : 0;

      // Left arm lowered (Z = -58 deg) & bent forward
      applyBoneDelta(
        'upperarm_l',
        26 + (isMoving ? Math.sin(cyclePhase) * 22 : Math.sin(cyclePhase) * 6),
        12,
        -58
      );
      applyBoneDelta('lowerarm_l', 46 + Math.cos(cyclePhase) * 10, 0, -18);

      // Right sword arm lowered (Z = +54 deg) & sweeping across in active slash
      applyBoneDelta(
        'upperarm_r',
        36 + swingArcDeg + (isMoving ? -Math.sin(cyclePhase) * 22 : Math.cos(cyclePhase) * 8),
        -16 + swingArcDeg * 0.4,
        54 - swingArcDeg * 0.35
      );
      applyBoneDelta('lowerarm_r', 52 + swingArcDeg * 0.3, 0, 22);

      // Torso twist & forward combat lean
      applyBoneDelta('spine_01', isMoving ? 14 : 9, swingArcDeg * 0.35, 0);
      applyBoneDelta('spine_02', isMoving ? 10 : 6, swingArcDeg * 0.45, 0);

      // Leg stride animation during sprint/combat
      const legStride = isMoving ? 32 : 8;
      applyBoneDelta('thigh_l', Math.sin(cyclePhase) * legStride, 0, 0);
      applyBoneDelta('calf_l', -Math.max(0, Math.sin(cyclePhase)) * (legStride * 1.1), 0, 0);
      applyBoneDelta('thigh_r', -Math.sin(cyclePhase) * legStride, 0, 0);
      applyBoneDelta('calf_r', -Math.max(0, -Math.sin(cyclePhase)) * (legStride * 1.1), 0, 0);

      // Sync Greatsword position & rotation to the animated right hand
      if (heroBones['hand_r']) {
        heroRoot.updateMatrixWorld(true);
        const handWorldPos = new THREE.Vector3();
        heroBones['hand_r'].bone.getWorldPosition(handWorldPos);
        heroRoot.worldToLocal(handWorldPos);
        heroSwordHolder.position.copy(handWorldPos);
      } else {
        heroSwordHolder.position.set(0.32, 1.12, -0.38);
      }
      heroSwordHolder.rotation.set(
        Math.PI * 0.36 + (swingArcDeg * Math.PI) / 180 * 0.5,
        -0.25 + (swingArcDeg * Math.PI) / 180 * 0.85,
        -0.35
      );

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
          if (distBoss <= 4.8) {
            activeStrike.hasConnected = true;
            const hitPos = bossRoot.position
              .clone()
              .lerp(heroRoot.position, 0.38)
              .add(new THREE.Vector3(0, 1.75, 0));
            spawnRealHitImpact(
              hitPos,
              activeStrike.moveName,
              activeStrike.baseDmg,
              activeStrike.isHeavy
            );
          } else {
            for (const m of minions) {
              if (tipWorld.distanceTo(m.group.position) <= 3.4) {
                activeStrike.hasConnected = true;
                spawnRealHitImpact(
                  m.group.position.clone().add(new THREE.Vector3(0, 1.3, 0)),
                  activeStrike.moveName,
                  activeStrike.baseDmg,
                  activeStrike.isHeavy
                );
                break;
              }
            }
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
      const basePos = heroRoot.position.clone().add(new THREE.Vector3(0, 1.25, 0));
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

      const eAttr = emberGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < emberCount; i++) {
        let ey = eAttr.getY(i) + dt * (1.1 + (i % 4) * 0.35);
        const ex = eAttr.getX(i) + Math.sin(simTime * 1.5 + i) * 0.006;
        if (ey > 8.5) ey = 0.25;
        eAttr.setXY(i, ex, ey);
      }
      eAttr.needsUpdate = true;

      torchSprites.forEach((sp, idx) => {
        const flicker = 1.2 + Math.sin(simTime * 11 + idx * 2.3) * 0.14;
        sp.scale.set(flicker, flicker * 1.32, 1);
      });

      mixers.forEach((m) => m.update(dt));

      // Sync Myth@s's polygonal armor & crimson polearm-axe to his animated bones (at 1.0 root scale!)
      bossRoot.updateMatrixWorld(true);
      const syncToBossBone = (
        bone: THREE.Object3D | undefined,
        mesh: THREE.Object3D | undefined,
        offsetY = 0,
        offsetZ = 0
      ) => {
        if (!bone || !mesh) return;
        const wp = new THREE.Vector3();
        bone.getWorldPosition(wp);
        bossRoot.worldToLocal(wp);
        wp.y += offsetY;
        wp.z += offsetZ;
        mesh.position.copy(wp);
      };
      syncToBossBone(bossTrackRefs.chestBone, bossTrackRefs.cuirass, 0.08, 0.04);
      syncToBossBone(bossTrackRefs.headBone, bossTrackRefs.greathelm, 0.22, 0.04);
      syncToBossBone(bossTrackRefs.shoulderLBone, bossTrackRefs.pauldronL, 0.08, 0.0);
      syncToBossBone(bossTrackRefs.shoulderRBone, bossTrackRefs.pauldronR, 0.08, 0.0);
      syncToBossBone(bossTrackRefs.handRBone, bossTrackRefs.polearm, 0.15, 0.12);

      // Sync each minion's helm, breastplate, and war-spear to its animated bones
      for (const m of minions) {
        m.group.updateMatrixWorld(true);
        const syncMinionPart = (
          bone: THREE.Object3D | undefined,
          mesh: THREE.Object3D | undefined,
          oy = 0,
          oz = 0
        ) => {
          if (!bone || !mesh) return;
          const wp = new THREE.Vector3();
          bone.getWorldPosition(wp);
          m.group.worldToLocal(wp);
          wp.y += oy;
          wp.z += oz;
          mesh.position.copy(wp);
        };
        syncMinionPart(m.headBone, m.crestMesh, 0.18, 0.02);
        syncMinionPart(m.chestBone, m.breastplateMesh, 0.05, 0.02);
        syncMinionPart(m.handRBone, m.spearMesh, 0.1, 0.15);
      }

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
  }, []);

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

          {onOpenStudioDrawer && (
            <button
              onClick={onOpenStudioDrawer}
              className="pointer-events-auto px-3 py-1.5 rounded-xl bg-neutral-950/85 border border-white/15 text-neutral-300 hover:text-white text-xs font-bold cursor-pointer"
            >
              Studio Tools ▾
            </button>
          )}
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
            { key: 'LMB', name: 'Rift Slash', dmg: 220, heavy: false, color: 'from-amber-600 to-orange-700' },
            { key: 'RMB', name: 'Sunbreaker', dmg: 380, heavy: true, color: 'from-orange-600 to-red-800' },
            { key: 'Q', name: 'Aegis Ward', dmg: 180, heavy: false, color: 'from-sky-600 to-blue-800' },
            { key: 'E', name: 'Dream Lunge', dmg: 310, heavy: false, color: 'from-amber-500 to-amber-700' },
            { key: 'R', name: 'Reckoning', dmg: 560, heavy: true, color: 'from-purple-600 to-indigo-900' },
            { key: 'F', name: 'Oathcall', dmg: 420, heavy: true, color: 'from-cyan-500 to-sky-800' },
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
