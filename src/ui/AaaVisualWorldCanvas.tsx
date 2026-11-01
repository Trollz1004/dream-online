import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export type VisualBiomeMode = 'inferno' | 'desert' | 'manhattan' | 'oathcall';
export type CameraStyleMode = 'arpg_iso' | 'action_ots' | 'cinematic_orbit';

interface FloatingCrit {
  id: number;
  text: string;
  subtext?: string;
  x: number;
  y: number;
  isMegaCrit: boolean;
}

interface TacticalPingMarker {
  id: number;
  label: string;
  color: string;
  worldX: number;
  worldZ: number;
  createdAt: number;
}

export interface AaaVisualWorldCanvasProps {
  initialBiome?: VisualBiomeMode;
  onOpenStudioDrawer?: () => void;
}

export const AaaVisualWorldCanvas: React.FC<AaaVisualWorldCanvasProps> = ({
  initialBiome,
  onOpenStudioDrawer,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const urlScene = params.get('scene') as VisualBiomeMode | null;
  const urlCam = params.get('cam') as CameraStyleMode | null;
  const urlGear = params.get('gear') === '1';
  const urlCompare = params.get('compare') === '1';
  const urlDreamforge = params.get('dreamforge') === '1';

  const [biome, setBiome] = useState<VisualBiomeMode>(
    urlScene && ['inferno', 'desert', 'manhattan', 'oathcall'].includes(urlScene)
      ? urlScene
      : initialBiome || 'inferno'
  );
  const [cameraStyle, setCameraStyle] = useState<CameraStyleMode>(
    urlCam && ['arpg_iso', 'action_ots', 'cinematic_orbit'].includes(urlCam)
      ? urlCam
      : urlScene === 'desert' || urlScene === 'manhattan'
      ? 'action_ots'
      : 'arpg_iso'
  );
  const [showGearSheet, setShowGearSheet] = useState<boolean>(urlGear);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(urlCompare);
  const [showDreamforgeBar, setShowDreamforgeBar] = useState<boolean>(urlDreamforge);
  const [worldSeedPrompt, setWorldSeedPrompt] = useState<string>(
    'Obsidian Keep over molten Arreat abyss — Whirlwind Tornado Crit Build vs. Awakened Titan'
  );
  const [guiUnlocked, setGuiUnlocked] = useState<boolean>(false);
  const [hudOffset, setHudOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const [bossHpPct, setBossHpPct] = useState<number>(74);
  const [bossName, setBossName] = useState<string>('HELLFIRE BRIDGE COLOSSUS');
  const [bossSubtitle, setBossSubtitle] = useState<string>('ACT III INFERNO · BASTION KEEP CHASM · WHIRLWIND CRIT BUILD');
  const [heroHpPct] = useState<number>(92);
  const [heroFuryPct] = useState<number>(88);
  const [killStreak, setKillStreak] = useState<number>(48);
  const [dpsCounter, setDpsCounter] = useState<number>(364250);
  const [floatingCrits, setFloatingCrits] = useState<FloatingCrit[]>([]);
  const [tacticalPings, setTacticalPings] = useState<TacticalPingMarker[]>([
    { id: 1, label: 'FOCUS BOSS CORE [SHIFT+RMB]', color: '#22d3ee', worldX: 0, worldZ: -4.5, createdAt: Date.now() },
  ]);
  const [oathcallBanner, setOathcallBanner] = useState<string | null>(null);

  const biomeRef = useRef<VisualBiomeMode>(biome);
  const cameraStyleRef = useRef<CameraStyleMode>(cameraStyle);

  useEffect(() => {
    biomeRef.current = biome;
    if (biome === 'inferno') {
      setBossName('HELLFIRE BRIDGE COLOSSUS');
      setBossSubtitle('ACT III INFERNO · BASTION KEEP CHASM · WHIRLWIND CRIT BUILD');
      setOathcallBanner(null);
    } else if (biome === 'desert') {
      setBossName('ANCIENT VALENCIA SANDSTONE TITAN');
      setBossSubtitle('GOLDEN DESERT SANDBOX · OASIS TEMPLE RUINS · AWAKENING CLEAVE');
      setOathcallBanner(null);
    } else if (biome === 'manhattan') {
      setBossName('APEX CYBER-MECH OVERLORD');
      setBossSubtitle('SUNSET MANHATTAN AVENUE · WET ASPHALT REFLECTIONS · HIGH-RISE SIEGE');
      setOathcallBanner(null);
    } else if (biome === 'oathcall') {
      setBossName('MALAKOR THE BULLY WARLORD [LV.55 · 620 GS]');
      setBossSubtitle('OATHCALL ANSWERED: 3 ALLIES INCOMING (2.0S AEGIS SHIELD · +18% VALOR)');
      setOathcallBanner('OATHCALL ANSWERED: 3 GUILD ALLIES INCOMING · CHAMPION BLUE-FLAME SIGIL ACTIVE');
    }
  }, [biome]);

  useEffect(() => {
    cameraStyleRef.current = cameraStyle;
  }, [cameraStyle]);

  useEffect(() => {
    let nextId = 100;
    const sampleCrits = [
      { text: '284,910!', subtext: 'WHIRLWIND CRIT', isMegaCrit: true },
      { text: '192,450!', subtext: 'TORNADO TICK', isMegaCrit: false },
      { text: '412,800!!', subtext: 'OVERPOWER CRIT', isMegaCrit: true },
      { text: '158,320!', subtext: 'INTO THE FRAY', isMegaCrit: false },
      { text: '329,600!', subtext: 'RUTHLESS CLEAVE', isMegaCrit: true },
      { text: '176,900!', subtext: 'SPRINT TORNADO', isMegaCrit: false },
    ];
    // Well-spaced initial crit numbers so they never stack on top of each other
    setFloatingCrits([
      { id: 1, text: '341,820!', subtext: 'CRITICAL HIT', x: 35, y: 26, isMegaCrit: true },
      { id: 2, text: '198,450!', subtext: 'TORNADO CRIT', x: 63, y: 30, isMegaCrit: false },
      { id: 3, text: '412,800!!', subtext: 'OVERPOWER CRIT', x: 50, y: 20, isMegaCrit: true },
    ]);

    const slots = [
      { x: 34, y: 27 },
      { x: 64, y: 28 },
      { x: 49, y: 20 },
      { x: 38, y: 36 },
      { x: 61, y: 37 },
    ];

    const timer = window.setInterval(() => {
      const pick = sampleCrits[nextId % sampleCrits.length];
      const slot = slots[nextId % slots.length];
      nextId += 1;
      setFloatingCrits((prev) => [
        ...prev.slice(-2),
        {
          id: nextId,
          text: pick.text,
          subtext: pick.subtext,
          x: slot.x,
          y: slot.y,
          isMegaCrit: pick.isMegaCrit,
        },
      ]);
      setBossHpPct((hp) => (hp <= 14 ? 88 : Math.max(12, +(hp - 1.4).toFixed(1))));
      setKillStreak((k) => k + 1);
      setDpsCounter(342000 + ((nextId * 7919) % 54000));
    }, 850);

    return () => window.clearInterval(timer);
  }, []);

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
    renderer.toneMappingExposure = 0.96;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x12090d, 0.012);
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 450);

    // Balanced UnrealBloomPass — only true HDR emissives glow, preserving crisp armor & building detail
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.38, // controlled bloom strength
      0.32, // tight bloom radius
      0.86  // high threshold so sandstone, sky, and armor stay razor-sharp
    );
    composer.addPass(bloomPass);

    const texLoader = new THREE.TextureLoader();
    const loadTiledTexture = (url: string, repeatX: number, repeatY: number, isColor = true) => {
      const t = texLoader.load(url);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      if (isColor) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };

    const rockDiff = loadTiledTexture('/assets/third_party/textures/rock/rock_face_03_diff_1k.jpg', 8, 8, true);
    const rockNor = loadTiledTexture('/assets/third_party/textures/rock/rock_face_03_nor_gl_1k.jpg', 8, 8, false);
    const concreteDiff = loadTiledTexture('/assets/third_party/textures/facade/concrete_wall_003_diff_1k.jpg', 6, 6, true);
    const concreteNor = loadTiledTexture('/assets/third_party/textures/facade/concrete_wall_003_nor_gl_1k.jpg', 6, 6, false);
    const metalDiff = loadTiledTexture('/assets/third_party/textures/armor/metal_plate_02_diff_1k.jpg', 4, 4, true);
    const metalNor = loadTiledTexture('/assets/third_party/textures/armor/metal_plate_02_nor_gl_1k.jpg', 4, 4, false);
    const desertDiff = loadTiledTexture('/assets/third_party/textures/dirt/red_laterite_soil_stones_diff_1k.jpg', 14, 14, true);
    const desertNor = loadTiledTexture('/assets/third_party/textures/dirt/red_laterite_soil_stones_nor_gl_1k.jpg', 14, 14, false);
    const grassRockDiff = loadTiledTexture('/assets/third_party/textures/ground/aerial_grass_rock_diff_1k.jpg', 10, 10, true);
    const grassRockNor = loadTiledTexture('/assets/third_party/textures/ground/aerial_grass_rock_nor_gl_1k.jpg', 10, 10, false);
    const asphaltDiff = loadTiledTexture('/assets/third_party/textures/street/asphalt_02_diff_1k.jpg', 8, 22, true);
    const asphaltNor = loadTiledTexture('/assets/third_party/textures/street/asphalt_02_nor_gl_1k.jpg', 8, 22, false);

    // PMREM Environment Map for crisp metallic armor & wet road reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x16192b) },
        horizonColor: { value: new THREE.Color(0xd96b27) },
        bottomColor: { value: new THREE.Color(0x120908) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        void main() {
          float h = normalize(vWorldPos).y;
          vec3 col = mix(horizonColor, topColor, clamp(pow(max(h, 0.0), 0.55), 0.0, 1.0));
          if (h < 0.0) col = mix(horizonColor, bottomColor, clamp(-h * 2.5, 0.0, 1.0));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), envMat));
    scene.environment = pmremGenerator.fromScene(envScene, 0.04).texture;

    // Atmospheric Sky Dome (stays below bloom threshold so horizon is rich, never washed out)
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(280, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(0x09040e) },
          uHorizon: { value: new THREE.Color(0x8a2408) },
          uBottom: { value: new THREE.Color(0x240502) },
          uSunDir: { value: new THREE.Vector3(0.32, 0.22, -0.92).normalize() },
          uSunColor: { value: new THREE.Color(0xff9e44) },
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
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uBottom;
          uniform vec3 uSunDir;
          uniform vec3 uSunColor;
          void main() {
            float y = vDir.y;
            vec3 col = y >= 0.0
              ? mix(uHorizon, uTop, pow(y, 0.45))
              : mix(uHorizon, uBottom, clamp(-y * 3.0, 0.0, 1.0));
            float sunAmt = max(dot(normalize(vDir), uSunDir), 0.0);
            col += uSunColor * pow(sunAmt, 36.0) * 0.45;
            col += uSunColor * pow(sunAmt, 420.0) * 1.15;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      })
    );
    scene.add(skyDome);

    const hemiLight = new THREE.HemisphereLight(0xffcfa3, 0x26120c, 1.1);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffe0b2, 2.65);
    dirLight.position.set(18, 30, 16);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 95;
    const d = 26;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const heroLight = new THREE.PointLight(0xff8c24, 3.2, 14, 1.6);
    heroLight.position.set(0, 2.4, 2.5);
    scene.add(heroLight);

    const bossLight = new THREE.PointLight(0xff3b08, 3.8, 18, 1.5);
    bossLight.position.set(0, 3.8, -5.2);
    scene.add(bossLight);

    const infernoGroup = new THREE.Group();
    const desertGroup = new THREE.Group();
    const manhattanGroup = new THREE.Group();
    const oathcallGroup = new THREE.Group();
    scene.add(infernoGroup, desertGroup, manhattanGroup, oathcallGroup);

    const actorsGroup = new THREE.Group();
    scene.add(actorsGroup);

    const pillarMat = new THREE.MeshStandardMaterial({
      map: rockDiff,
      normalMap: rockNor,
      roughness: 0.55,
      metalness: 0.3,
      color: new THREE.Color(0x5c504d),
    });
    const trimGoldMat = new THREE.MeshStandardMaterial({
      map: metalDiff,
      normalMap: metalNor,
      roughness: 0.26,
      metalness: 0.88,
      color: new THREE.Color(0xc88a32),
    });

    // ---------------------------------------------------------------------------
    // 1. INFERNO KEEP — ARREAT CRATER BRIDGE (Diablo 3 Act 3 Style)
    // ---------------------------------------------------------------------------
    const lavaGeo = new THREE.PlaneGeometry(220, 220, 64, 64);
    lavaGeo.rotateX(-Math.PI / 2);
    const lavaMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vUv = uv * 18.0;
          vec3 p = position;
          p.y += sin(p.x * 0.35 + uTime * 1.8) * 0.25 + cos(p.z * 0.35 + uTime * 1.4) * 0.25;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          float n = sin(vUv.x * 2.5 + uTime) * cos(vUv.y * 2.5 - uTime * 0.8)
                  + 0.5 * sin((vUv.x + vUv.y) * 4.2 - uTime * 1.7);
          vec3 darkCrust = vec3(0.08, 0.02, 0.01);
          vec3 magmaOrange = vec3(0.92, 0.22, 0.02);
          vec3 magmaYellow = vec3(1.25, 0.58, 0.10);
          float vein = smoothstep(0.15, 0.75, n);
          float hotCore = smoothstep(0.65, 0.98, n);
          vec3 col = mix(darkCrust, magmaOrange, vein);
          col = mix(col, magmaYellow, hotCore);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const lavaMesh = new THREE.Mesh(lavaGeo, lavaMat);
    lavaMesh.position.y = -6.5;
    infernoGroup.add(lavaMesh);

    const bridgeMat = new THREE.MeshStandardMaterial({
      map: concreteDiff,
      normalMap: concreteNor,
      roughness: 0.62,
      metalness: 0.22,
      color: new THREE.Color(0x7c7270),
    });
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(18, 2.5, 58), bridgeMat);
    bridgeDeck.position.set(0, -1.25, -6);
    bridgeDeck.receiveShadow = true;
    infernoGroup.add(bridgeDeck);

    const daisMat = new THREE.MeshStandardMaterial({
      map: rockDiff,
      normalMap: rockNor,
      roughness: 0.48,
      metalness: 0.38,
      color: new THREE.Color(0x635552),
    });
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 13.0, 0.55, 48), daisMat);
    dais.position.set(0, 0.12, -3.5);
    dais.receiveShadow = true;
    infernoGroup.add(dais);

    const hellRuneRing = new THREE.Mesh(
      new THREE.RingGeometry(7.2, 7.75, 64),
      new THREE.MeshBasicMaterial({ color: 0xff5500, side: THREE.DoubleSide })
    );
    hellRuneRing.rotation.x = -Math.PI / 2;
    hellRuneRing.position.set(0, 0.41, -3.5);
    infernoGroup.add(hellRuneRing);

    const brazierFireMat = new THREE.MeshBasicMaterial({ color: 0xff771a });
    for (let z = -26; z <= 14; z += 8) {
      for (const side of [-1, 1]) {
        const x = side * 8.6;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 6.2, 16), pillarMat);
        col.position.set(x, 3.1, z);
        col.castShadow = true;
        col.receiveShadow = true;
        infernoGroup.add(col);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 1.9), trimGoldMat);
        cap.position.set(x, 6.3, z);
        infernoGroup.add(cap);

        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.3, 0.45, 12), trimGoldMat);
        bowl.position.set(side * 7.2, 2.2, z);
        infernoGroup.add(bowl);

        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.25, 10), brazierFireMat);
        flame.position.set(side * 7.2, 2.95, z);
        infernoGroup.add(flame);
      }
    }

    for (const side of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.5, 28, 16), pillarMat);
      tower.position.set(side * 12.5, 10, -28);
      tower.castShadow = true;
      infernoGroup.add(tower);

      const spire = new THREE.Mesh(new THREE.ConeGeometry(4.4, 10, 16), trimGoldMat);
      spire.position.set(side * 12.5, 29, -28);
      infernoGroup.add(spire);
    }

    // ---------------------------------------------------------------------------
    // 2. VALENCIA GOLDEN DESERT SANDBOX (Black Desert Online Style)
    // ---------------------------------------------------------------------------
    const sandGeo = new THREE.PlaneGeometry(260, 260, 96, 96);
    sandGeo.rotateX(-Math.PI / 2);
    const posAttr = sandGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const dist = Math.hypot(vx, vz + 2);
      const dune =
        dist < 14
          ? 0.38
          : 0.38 +
            (Math.sin(vx * 0.07) * Math.cos(vz * 0.07) * 3.2 +
              Math.sin(vx * 0.025 - vz * 0.035) * 5.2) *
              Math.min(1, (dist - 14) / 18);
      posAttr.setY(i, dune);
    }
    sandGeo.computeVertexNormals();
    const sandMat = new THREE.MeshStandardMaterial({
      map: desertDiff,
      normalMap: desertNor,
      roughness: 0.72,
      metalness: 0.08,
      color: new THREE.Color(0xd99b52),
    });
    const sandMesh = new THREE.Mesh(sandGeo, sandMat);
    sandMesh.receiveShadow = true;
    desertGroup.add(sandMesh);

    // Carved Ancient Sandstone Temple Dais under the combat arena in Desert Mode
    const sandstoneCourtyardMat = new THREE.MeshStandardMaterial({
      map: grassRockDiff,
      normalMap: grassRockNor,
      roughness: 0.58,
      metalness: 0.18,
      color: new THREE.Color(0xc89d66),
    });
    const desertCourtyard = new THREE.Mesh(
      new THREE.CylinderGeometry(11.5, 12.8, 0.45, 48),
      sandstoneCourtyardMat
    );
    desertCourtyard.position.set(0, 0.2, -2.5);
    desertCourtyard.receiveShadow = true;
    desertGroup.add(desertCourtyard);

    // Golden Solar Ring on the Valencia Courtyard Floor
    const solarRing = new THREE.Mesh(
      new THREE.RingGeometry(6.8, 7.25, 64),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
    );
    solarRing.rotation.x = -Math.PI / 2;
    solarRing.position.set(0, 0.44, -2.5);
    desertGroup.add(solarRing);

    // Sandstone Obelisks & Temple Colonnade Pillars around the Valencia Courtyard
    const sandstonePillarMat = new THREE.MeshStandardMaterial({
      map: rockDiff,
      normalMap: rockNor,
      roughness: 0.62,
      metalness: 0.15,
      color: new THREE.Color(0xc2844f),
    });
    for (const [px, pz, h] of [
      [-9.5, -9.5, 8.5],
      [9.5, -9.5, 8.5],
      [-12.5, -4.5, 7.0],
      [12.5, -4.5, 7.0],
      [-7.0, -14.5, 10.5],
      [7.0, -14.5, 10.5],
    ]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, h, 16), sandstonePillarMat);
      col.position.set(px, h * 0.5, pz);
      col.castShadow = true;
      col.receiveShadow = true;
      desertGroup.add(col);

      const pyramidCap = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.6, 4), trimGoldMat);
      pyramidCap.position.set(px, h + 0.8, pz);
      pyramidCap.rotation.y = Math.PI / 4;
      desertGroup.add(pyramidCap);
    }

    // Distant Red-Rock Canyon Mesas
    for (const [mx, my, mz, sx, sy, sz] of [
      [-32, 11, -48, 14, 24, 12],
      [30, 12, -52, 16, 26, 14],
      [0, 15, -68, 24, 34, 16],
      [-42, 8, -22, 11, 18, 12],
      [40, 9, -24, 12, 19, 12],
    ]) {
      const mesa = new THREE.Mesh(new THREE.CylinderGeometry(sx * 0.65, sx, sy, 12), sandstonePillarMat);
      mesa.position.set(mx, my, mz);
      mesa.scale.set(1, 1, sz / sx);
      mesa.castShadow = true;
      mesa.receiveShadow = true;
      desertGroup.add(mesa);
    }

    // ---------------------------------------------------------------------------
    // 3. SUNSET MANHATTAN METROPOLIS (Spider-Man / GTA V Golden-Hour City Avenue)
    // ---------------------------------------------------------------------------
    const streetMat = new THREE.MeshStandardMaterial({
      map: asphaltDiff,
      normalMap: asphaltNor,
      roughness: 0.22,
      metalness: 0.48,
      color: new THREE.Color(0x2b303c),
    });
    const streetMesh = new THREE.Mesh(new THREE.PlaneGeometry(36, 220), streetMat);
    streetMesh.rotation.x = -Math.PI / 2;
    streetMesh.position.y = 0.4;
    streetMesh.receiveShadow = true;
    manhattanGroup.add(streetMesh);

    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: concreteDiff,
      normalMap: concreteNor,
      roughness: 0.5,
      metalness: 0.2,
      color: new THREE.Color(0x686e78),
    });
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.BoxGeometry(16, 0.32, 220), sidewalkMat);
      walk.position.set(side * 22, 0.56, -20);
      walk.receiveShadow = true;
      manhattanGroup.add(walk);
    }

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
    for (const offset of [-0.22, 0.22]) {
      const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 180), lineMat);
      centerLine.rotation.x = -Math.PI / 2;
      centerLine.position.set(offset, 0.42, -20);
      manhattanGroup.add(centerLine);
    }

    // High-Contrast Architectural Glass Curtain-Wall Skyscraper Shader (never washes out!)
    const buildingMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          if (abs(vNormal.y) > 0.8) {
            gl_FragColor = vec4(0.06, 0.08, 0.12, 1.0);
            return;
          }
          float wx = fract((vWorldPos.x + vWorldPos.z) * 0.65);
          float wy = fract(vWorldPos.y * 0.42);
          float frame = step(0.14, wx) * step(wx, 0.86) * step(0.18, wy) * step(wy, 0.84);
          float cellHash = fract(sin(floor((vWorldPos.x + vWorldPos.z) * 0.65) * 127.1 + floor(vWorldPos.y * 0.42) * 311.7) * 43758.5453);
          vec3 mullion = vec3(0.06, 0.08, 0.12);
          vec3 glassSky = mix(vec3(0.10, 0.18, 0.30), vec3(0.55, 0.28, 0.14), clamp(1.0 - vWorldPos.y * 0.022, 0.0, 1.0));
          vec3 warmOffice = cellHash > 0.68 ? vec3(0.82, 0.58, 0.26) : (cellHash > 0.48 ? vec3(0.18, 0.48, 0.72) : glassSky);
          vec3 col = mix(mullion, warmOffice, frame);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    for (let i = 0; i < 18; i++) {
      const z = -95 + i * 11;
      for (const side of [-1, 1]) {
        const h = 28 + ((i * 13 + (side > 0 ? 7 : 3)) % 38);
        const w = 9 + ((i * 5) % 5);
        const dBldg = 9 + ((i * 7) % 4);
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, dBldg), buildingMat);
        bldg.position.set(side * (19 + w * 0.5), h * 0.5, z);
        bldg.castShadow = true;
        bldg.receiveShadow = true;
        manhattanGroup.add(bldg);

        if (i % 2 === 0 && z > -55 && z < 20) {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 8), trimGoldMat);
          pole.position.set(side * 13.8, 3.0, z);
          manhattanGroup.add(pole);

          const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.24, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
          );
          bulb.position.set(side * 13.2, 5.5, z);
          manhattanGroup.add(bulb);
        }
      }
    }

    for (const side of [-1, 1]) {
      const bridgeTower = new THREE.Mesh(new THREE.BoxGeometry(2.8, 38, 2.8), trimGoldMat);
      bridgeTower.position.set(side * 10.5, 19, -92);
      manhattanGroup.add(bridgeTower);
    }

    // ---------------------------------------------------------------------------
    // 4. OATHCALL + BLUE-FLAME HOLOGRAPHIC CHAMPION SIGIL
    // ---------------------------------------------------------------------------
    const sigilGroup = new THREE.Group();
    sigilGroup.position.set(0, 0.45, 2.2);
    const cyanRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    });
    const cobaltRingMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const outerSigilRing = new THREE.Mesh(new THREE.RingGeometry(2.35, 2.65, 64), cyanRingMat);
    outerSigilRing.rotation.x = -Math.PI / 2;
    const innerSigilRing = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.68, 48), cobaltRingMat);
    innerSigilRing.rotation.x = -Math.PI / 2;
    innerSigilRing.position.y = 0.02;
    sigilGroup.add(outerSigilRing, innerSigilRing);

    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const flamePetal = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.95, 8),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x38bdf8 : 0x7dd3fc })
      );
      flamePetal.position.set(Math.cos(ang) * 2.48, 0.45, Math.sin(ang) * 2.48);
      sigilGroup.add(flamePetal);
    }
    oathcallGroup.add(sigilGroup);

    // ---------------------------------------------------------------------------
    // 5. LOAD REAL 3D GLTF/GLB MODELS & FIX T-POSE WITH DYNAMIC COMBAT BONE RIGGING
    // ---------------------------------------------------------------------------
    const gltfLoader = new GLTFLoader();
    const mixers: THREE.AnimationMixer[] = [];

    const heroRoot = new THREE.Group();
    heroRoot.position.set(0, 0.42, 2.2);
    actorsGroup.add(heroRoot);

    const heroSpinGroup = new THREE.Group();
    heroRoot.add(heroSpinGroup);

    const bossRoot = new THREE.Group();
    bossRoot.position.set(0, 0.42, -5.2);
    actorsGroup.add(bossRoot);

    const whirlwindGroup = new THREE.Group();
    heroRoot.add(whirlwindGroup);

    const tornadoRibbonMat = new THREE.MeshBasicMaterial({
      color: 0xff7b1a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
    });
    const cyanSlashMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
    });

    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.65 + i * 0.42, 0.048, 12, 48, Math.PI * 1.35),
        i % 2 === 0 ? tornadoRibbonMat : cyanSlashMat
      );
      ring.rotation.x = Math.PI / 2 + (i - 1.5) * 0.14;
      ring.rotation.z = i * 1.4;
      ring.position.y = 0.55 + i * 0.28;
      whirlwindGroup.add(ring);
    }

    const energyTornadoes: THREE.Group[] = [];
    for (let t = 0; t < 2; t++) {
      const tGroup = new THREE.Group();
      for (let h = 0; h < 8; h++) {
        const r = 0.24 + h * 0.13;
        const coil = new THREE.Mesh(
          new THREE.TorusGeometry(r, 0.04, 8, 24),
          h % 2 === 0 ? tornadoRibbonMat : cyanSlashMat
        );
        coil.rotation.x = Math.PI / 2;
        coil.position.y = 0.25 + h * 0.34;
        tGroup.add(coil);
      }
      tGroup.position.set(t === 0 ? -3.6 : 3.6, 0.42, -2.0);
      actorsGroup.add(tGroup);
      energyTornadoes.push(tGroup);
    }

    const particleCount = 480;
    const pPositions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 34;
      pPositions[i * 3 + 1] = Math.random() * 14;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 34 - 4;
      const isCyan = i % 3 === 0;
      pColors[i * 3] = isCyan ? 0.22 : 0.95;
      pColors[i * 3 + 1] = isCyan ? 0.75 : 0.45 + Math.random() * 0.35;
      pColors[i * 3 + 2] = isCyan ? 0.98 : 0.08;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    const particleSystem = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({
        size: 0.18,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    scene.add(particleSystem);

    // Store Hero bones so we can animate an aggressive dual-wield combat stance (NO T-POSE!)
    const heroBones: Record<string, THREE.Bone> = {};

    gltfLoader.load('/assets/third_party/quaternius_outfits/Male_Ranger.gltf', (gltf) => {
      const ranger = gltf.scene;
      ranger.scale.set(1.38, 1.38, 1.38);
      ranger.rotation.y = Math.PI;
      ranger.traverse((child) => {
        if ((child as THREE.Bone).isBone) {
          heroBones[child.name] = child as THREE.Bone;
        }
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });

      // Apply immediate combat pose so arms are lowered & bent in battle-ready dual-blade stance
      if (heroBones['upperarm_l']) heroBones['upperarm_l'].rotation.set(0.45, 0.25, -0.78);
      if (heroBones['upperarm_r']) heroBones['upperarm_r'].rotation.set(0.45, -0.25, 0.78);
      if (heroBones['lowerarm_l']) heroBones['lowerarm_l'].rotation.set(0.65, 0.0, 0.0);
      if (heroBones['lowerarm_r']) heroBones['lowerarm_r'].rotation.set(0.65, 0.0, 0.0);
      if (heroBones['spine_01']) heroBones['spine_01'].rotation.x = 0.16;
      if (heroBones['spine_02']) heroBones['spine_02'].rotation.x = 0.12;

      heroSpinGroup.add(ranger);

      gltfLoader.load('/assets/models/sovereign-greatsword.glb', (swordGltf) => {
        // Tone down blade emissive so it looks sharp metallic + glowing fuller
        swordGltf.scene.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (mat && mat.emissiveIntensity !== undefined) {
              mat.emissiveIntensity = Math.min(mat.emissiveIntensity, 1.6);
            }
          }
        });

        const swordR = swordGltf.scene.clone(true);
        swordR.scale.set(1.05, 1.05, 1.05);
        swordR.position.set(0.68, 1.48, -0.45);
        swordR.rotation.set(Math.PI * 0.32, 0.25, -0.52);
        heroSpinGroup.add(swordR);

        const swordL = swordGltf.scene.clone(true);
        swordL.scale.set(1.05, 1.05, 1.05);
        swordL.position.set(-0.68, 1.48, -0.45);
        swordL.rotation.set(Math.PI * 0.32, -0.25, 0.52);
        heroSpinGroup.add(swordL);
      });
    });

    // Load Blender-Forged Boss Titan (`inferno-boss-titan.glb`) and clamp emissive intensity so obsidian armor + gold trim shine crisply
    gltfLoader.load('/assets/models/inferno-boss-titan.glb', (gltf) => {
      const titan = gltf.scene;
      titan.scale.set(1.32, 1.32, 1.32);
      titan.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat) {
            if (mat.name.includes('Obsidian')) {
              mat.color.setHex(0x181622);
              mat.roughness = 0.28;
              mat.metalness = 0.88;
              mat.emissiveIntensity = 0.0;
            } else if (mat.name.includes('Gold')) {
              mat.color.setHex(0xd99b26);
              mat.roughness = 0.22;
              mat.metalness = 0.92;
              mat.emissiveIntensity = 0.15;
            } else if (mat.name.includes('Hellfire') || mat.name.includes('DoomBlade')) {
              mat.emissiveIntensity = 1.35;
            }
          }
        }
      });
      bossRoot.add(titan);
    });

    // Load `UniversalBaseCharacter.glb` with its 45 Skeletal Animations for Enemy Minions & Oathcall Allies
    gltfLoader.load('/assets/third_party/quaternius/UniversalBaseCharacter.glb', (gltf) => {
      const attackClip =
        gltf.animations.find((a) => a.name.includes('Sword_Attack')) || gltf.animations[0];

      const minionCoords = [
        [-2.8, -1.2],
        [2.9, -1.4],
        [-3.6, -4.0],
        [3.5, -3.8],
        [-1.8, -2.9],
        [2.1, -2.7],
      ];
      minionCoords.forEach(([mx, mz], idx) => {
        const clone = SkeletonUtils.clone(gltf.scene);
        clone.scale.set(1.12, 1.12, 1.12);
        clone.position.set(mx, 0.42, mz);
        clone.lookAt(0, 0.42, 2.2);
        const minionMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x28151c),
          roughness: 0.32,
          metalness: 0.82,
          emissive: new THREE.Color(0x520d04),
          emissiveIntensity: 0.35,
        });
        clone.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            (c as THREE.Mesh).material = minionMat;
            c.castShadow = true;
          }
        });
        actorsGroup.add(clone);
        if (attackClip) {
          const mixer = new THREE.AnimationMixer(clone);
          const action = mixer.clipAction(attackClip);
          action.time = idx * 0.35;
          action.play();
          mixers.push(mixer);
        }
      });

      const allyCoords = [
        [-3.2, 1.8],
        [3.2, 1.8],
        [-2.2, 3.4],
      ];
      allyCoords.forEach(([ax, az], idx) => {
        const allyGroup = new THREE.Group();
        allyGroup.position.set(ax, 0.42, az);
        const clone = SkeletonUtils.clone(gltf.scene);
        clone.scale.set(1.22, 1.22, 1.22);
        clone.rotation.y = Math.PI;
        const allyMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xbfdbfe),
          roughness: 0.25,
          metalness: 0.85,
          emissive: new THREE.Color(0x0369a1),
          emissiveIntensity: 0.28,
        });
        clone.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            (c as THREE.Mesh).material = allyMat;
            c.castShadow = true;
          }
        });
        allyGroup.add(clone);

        for (const ry of [0.15, 1.1, 2.15]) {
          const sRing = new THREE.Mesh(
            new THREE.TorusGeometry(ry === 2.15 ? 0.65 : 1.05, 0.035, 10, 32),
            cyanRingMat
          );
          sRing.rotation.x = Math.PI / 2;
          sRing.position.y = ry;
          allyGroup.add(sRing);
        }

        oathcallGroup.add(allyGroup);
        if (attackClip) {
          const mixer = new THREE.AnimationMixer(clone);
          const action = mixer.clipAction(attackClip);
          action.time = idx * 0.45;
          action.play();
          mixers.push(mixer);
        }
      });
    });

    // Load Oasis Trees from `CommonTree.glb` for Valencia Desert
    gltfLoader.load('/assets/third_party/quaternius/CommonTree.glb', (gltf) => {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      const s = 6.5 / Math.max(size.y, 0.01);
      const treeSpots = [
        [-15, -8],
        [-19, -15],
        [15, -10],
        [18, -18],
        [-13, -20],
        [14, -22],
      ];
      for (const [tx, tz] of treeSpots) {
        const tClone = gltf.scene.clone(true);
        tClone.scale.setScalar(s);
        tClone.position.set(tx, 0.35, tz);
        desertGroup.add(tClone);
      }
    });

    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === 'Digit1') setBiome('inferno');
      if (e.code === 'Digit2') setBiome('desert');
      if (e.code === 'Digit3') setBiome('manhattan');
      if (e.code === 'Digit4') setBiome('oathcall');
      if (e.code === 'KeyC') setShowGearSheet((v) => !v);
      if (e.code === 'KeyV') {
        setCameraStyle((prev) =>
          prev === 'arpg_iso' ? 'action_ots' : prev === 'action_ots' ? 'cinematic_orbit' : 'arpg_iso'
        );
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const clock = new THREE.Clock();
    let animId = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      const activeBiome = biomeRef.current;
      infernoGroup.visible = activeBiome === 'inferno' || activeBiome === 'oathcall';
      desertGroup.visible = activeBiome === 'desert';
      manhattanGroup.visible = activeBiome === 'manhattan';
      oathcallGroup.visible = activeBiome === 'oathcall';

      const skyUniforms = (skyDome.material as THREE.ShaderMaterial).uniforms;
      if (activeBiome === 'inferno') {
        skyUniforms.uTop.value.setHex(0x09040c);
        skyUniforms.uHorizon.value.setHex(0x8f2206);
        skyUniforms.uBottom.value.setHex(0x2b0602);
        skyUniforms.uSunColor.value.setHex(0xff7722);
        (scene.fog as THREE.FogExp2).color.setHex(0x160705);
        heroLight.color.setHex(0xff7b1a);
        bossLight.color.setHex(0xff2a00);
      } else if (activeBiome === 'desert') {
        skyUniforms.uTop.value.setHex(0x1e3a8a);
        skyUniforms.uHorizon.value.setHex(0xd97706);
        skyUniforms.uBottom.value.setHex(0x78350f);
        skyUniforms.uSunColor.value.setHex(0xfde68a);
        (scene.fog as THREE.FogExp2).color.setHex(0x45220a);
        heroLight.color.setHex(0xf59e0b);
        bossLight.color.setHex(0xea580c);
      } else if (activeBiome === 'manhattan') {
        skyUniforms.uTop.value.setHex(0x090d16);
        skyUniforms.uHorizon.value.setHex(0xc2410c);
        skyUniforms.uBottom.value.setHex(0x111827);
        skyUniforms.uSunColor.value.setHex(0xfb923c);
        (scene.fog as THREE.FogExp2).color.setHex(0x111827);
        heroLight.color.setHex(0x38bdf8);
        bossLight.color.setHex(0xf43f5e);
      } else {
        skyUniforms.uTop.value.setHex(0x040d1a);
        skyUniforms.uHorizon.value.setHex(0x0369a1);
        skyUniforms.uBottom.value.setHex(0x082f49);
        skyUniforms.uSunColor.value.setHex(0x38bdf8);
        (scene.fog as THREE.FogExp2).color.setHex(0x061524);
        heroLight.color.setHex(0x38bdf8);
        bossLight.color.setHex(0x0ea5e9);
      }

      const moveSpeed = 6.5;
      if (keys['KeyW']) heroRoot.position.z -= moveSpeed * dt;
      if (keys['KeyS']) heroRoot.position.z += moveSpeed * dt;
      if (keys['KeyA']) heroRoot.position.x -= moveSpeed * dt;
      if (keys['KeyD']) heroRoot.position.x += moveSpeed * dt;

      // Animate Hero Dual-Blade Combat Slash & Pose (Never T-Posing!)
      if (heroBones['upperarm_l']) {
        heroBones['upperarm_l'].rotation.set(
          0.55 + Math.sin(elapsed * 6.0) * 0.25,
          0.3,
          -0.82
        );
      }
      if (heroBones['upperarm_r']) {
        heroBones['upperarm_r'].rotation.set(
          0.55 + Math.cos(elapsed * 6.0) * 0.25,
          -0.3,
          0.82
        );
      }
      if (heroBones['spine_02']) {
        heroBones['spine_02'].rotation.y = Math.sin(elapsed * 6.0) * 0.28;
      }

      sigilGroup.position.x = heroRoot.position.x;
      sigilGroup.position.z = heroRoot.position.z;
      outerSigilRing.rotation.z = elapsed * 0.85;
      innerSigilRing.rotation.z = -elapsed * 1.25;

      whirlwindGroup.rotation.y = elapsed * 9.5;
      energyTornadoes.forEach((tGroup, i) => {
        tGroup.rotation.y = elapsed * (7.5 + i);
        const angle = elapsed * 0.95 + i * 3.14;
        tGroup.position.x = Math.cos(angle) * 3.8;
        tGroup.position.z = -1.8 + Math.sin(angle) * 2.5;
      });

      bossRoot.position.y = 0.42 + Math.sin(elapsed * 2.4) * 0.1;
      bossRoot.rotation.y = Math.sin(elapsed * 1.1) * 0.18;

      lavaMat.uniforms.uTime.value = elapsed;
      const pAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        let py = pAttr.getY(i) + dt * (1.8 + (i % 5) * 0.4);
        if (py > 14) py = 0.2;
        pAttr.setY(i, py);
      }
      pAttr.needsUpdate = true;

      mixers.forEach((m) => m.update(dt));

      const camStyle = cameraStyleRef.current;
      if (camStyle === 'arpg_iso') {
        camera.position.set(
          heroRoot.position.x + 0.5,
          heroRoot.position.y + 11.2,
          heroRoot.position.z + 11.8
        );
        camera.lookAt(heroRoot.position.x, heroRoot.position.y + 1.4, heroRoot.position.z - 2.6);
      } else if (camStyle === 'action_ots') {
        camera.position.set(
          heroRoot.position.x + 1.35,
          heroRoot.position.y + 3.4,
          heroRoot.position.z + 6.2
        );
        camera.lookAt(heroRoot.position.x, heroRoot.position.y + 2.1, heroRoot.position.z - 8.0);
      } else {
        const orbitAngle = elapsed * 0.35;
        camera.position.set(
          Math.sin(orbitAngle) * 11.5,
          5.2,
          -1.5 + Math.cos(orbitAngle) * 11.5
        );
        camera.lookAt(0, 2.0, -2.0);
      }

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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.dispose();
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.shiftKey) {
      e.preventDefault();
      const id = Date.now();
      setTacticalPings((prev) => [
        ...prev.slice(-3),
        {
          id,
          label: 'SQUAD FOCUS TARGET [SHIFT+RMB]',
          color: '#f59e0b',
          worldX: Number(((e.clientX / window.innerWidth - 0.5) * 20).toFixed(1)),
          worldZ: Number(((e.clientY / window.innerHeight - 0.5) * 20).toFixed(1)),
          createdAt: id,
        },
      ]);
    }
  };

  const startHudDrag = (e: React.MouseEvent) => {
    if (!guiUnlocked) return;
    e.preventDefault();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: hudOffset.x,
      origY: hudOffset.y,
    };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current?.active) return;
      setHudOffset({
        x: dragRef.current.origX + (me.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (me.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => {
      if (dragRef.current) dragRef.current.active = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-black select-none font-sans"
      onContextMenu={handleContextMenu}
    >
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* DIABLO 3 / BDO FLOATING CRITICAL HIT NUMBERS OVERLAY */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        {floatingCrits.map((c) => (
          <div
            key={c.id}
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300"
          >
            {c.subtext && (
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.98)]">
                {c.subtext}
              </span>
            )}
            <span
              className={`font-black italic tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.98)] ${
                c.isMegaCrit
                  ? 'text-3xl md:text-4xl bg-gradient-to-b from-yellow-100 via-amber-300 to-orange-500 bg-clip-text text-transparent scale-105'
                  : 'text-2xl md:text-3xl text-amber-300'
              }`}
            >
              {c.text}
            </span>
          </div>
        ))}
      </div>

      {/* TOP-LEFT SINGLE-LINE WORLD & CAMERA BAR (ZERO OVERLAP WITH BOSS BAR!) */}
      <div className="absolute top-3 left-4 z-30 flex items-center gap-1.5 flex-nowrap">
        <div className="flex items-center gap-1 bg-neutral-950/90 backdrop-blur-md border border-amber-500/40 rounded-xl p-1 shadow-[0_12px_32px_rgba(0,0,0,0.85)]">
          {(
            [
              { id: 'inferno', label: '1 · Inferno Keep (Diablo 3)' },
              { id: 'desert', label: '2 · Golden Desert (BDO)' },
              { id: 'manhattan', label: '3 · Sunset Manhattan (City)' },
              { id: 'oathcall', label: '4 · Oathcall + Sigil' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setBiome(tab.id);
                if (tab.id === 'desert' || tab.id === 'manhattan') {
                  setCameraStyle('action_ots');
                } else {
                  setCameraStyle('arpg_iso');
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                biome === tab.id
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white shadow-[0_0_16px_rgba(245,158,11,0.55)]'
                  : 'text-neutral-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() =>
            setCameraStyle((prev) =>
              prev === 'arpg_iso' ? 'action_ots' : prev === 'action_ots' ? 'cinematic_orbit' : 'arpg_iso'
            )
          }
          className="px-2.5 py-1.5 rounded-xl bg-neutral-950/90 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/60 text-[11px] font-extrabold tracking-wider uppercase shadow-lg cursor-pointer whitespace-nowrap"
        >
          Cam (V): {cameraStyle === 'arpg_iso' ? 'Isometric' : cameraStyle === 'action_ots' ? '3rd-Person' : 'Orbit'}
        </button>

        <button
          onClick={() => setShowDreamforgeBar((v) => !v)}
          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-extrabold tracking-wider uppercase shadow-lg cursor-pointer whitespace-nowrap ${
            showDreamforgeBar
              ? 'bg-purple-600 border-purple-300 text-white'
              : 'bg-neutral-950/90 border-purple-500/40 text-purple-300 hover:bg-purple-950/60'
          }`}
        >
          ✦ Dreamforge
        </button>

        <button
          onClick={() => setShowCompareModal((v) => !v)}
          className="px-2.5 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-400/60 text-emerald-300 hover:bg-emerald-900/80 text-[11px] font-black tracking-wider uppercase shadow-lg cursor-pointer whitespace-nowrap"
        >
          ⚔ Old vs. New
        </button>

        {onOpenStudioDrawer && (
          <button
            onClick={onOpenStudioDrawer}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-900/85 border border-white/15 text-neutral-300 hover:text-white text-[11px] font-bold cursor-pointer whitespace-nowrap"
          >
            Dev Tools ▾
          </button>
        )}
      </div>

      {/* DREAMFORGE LIVE WORLD SEED DOCK (DOCKED BOTTOM-LEFT SO IT NEVER OVERLAPS THE BOSS BAR!) */}
      {showDreamforgeBar && (
        <div className="absolute bottom-32 left-4 z-30 w-[440px] max-w-[92vw] bg-neutral-950/95 backdrop-blur-xl border-2 border-purple-500/60 rounded-2xl p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-purple-300">
              ✦ DREAMFORGE AI WORLD BUILDER · 43 STYLE TOKENS + BLENDER 5.2 GLB
            </span>
            <button
              onClick={() => setShowDreamforgeBar(false)}
              className="text-neutral-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={worldSeedPrompt}
              onChange={(e) => setWorldSeedPrompt(e.target.value)}
              className="flex-1 bg-neutral-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
              placeholder="Describe world seed (e.g., Valencia desert, Manhattan sunset, Inferno Keep)..."
            />
            <button
              onClick={() => {
                const lower = worldSeedPrompt.toLowerCase();
                if (lower.includes('desert') || lower.includes('bdo') || lower.includes('valencia')) {
                  setBiome('desert');
                  setCameraStyle('action_ots');
                } else if (lower.includes('city') || lower.includes('manhattan') || lower.includes('spider')) {
                  setBiome('manhattan');
                  setCameraStyle('action_ots');
                } else if (lower.includes('oath') || lower.includes('sigil')) {
                  setBiome('oathcall');
                } else {
                  setBiome('inferno');
                  setCameraStyle('arpg_iso');
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Morph
            </button>
          </div>
        </div>
      )}

      {/* TOP-CENTER DIEGETIC BOSS HEALTH BAR & KILL STREAK COUNTER */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-[540px] max-w-[90vw] flex flex-col items-center pointer-events-none">
        {oathcallBanner && (
          <div className="mb-1.5 px-4 py-1 rounded-full bg-gradient-to-r from-sky-950/95 via-cyan-900/95 to-sky-950/95 border border-cyan-300/70 shadow-[0_0_20px_rgba(56,189,248,0.65)] text-cyan-100 text-[10px] font-black tracking-[0.16em] uppercase">
            ⚡ {oathcallBanner}
          </div>
        )}
        <div className="w-full bg-gradient-to-b from-neutral-950/95 to-neutral-900/90 border-2 border-amber-600/70 rounded-xl px-4 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs md:text-sm font-black tracking-[0.14em] text-amber-200 uppercase drop-shadow">
              💀 {bossName}
            </span>
            <span className="text-xs font-black text-amber-400 font-mono">{bossHpPct.toFixed(0)}% HP</span>
          </div>
          <div className="w-full h-3.5 bg-neutral-950 rounded-full overflow-hidden border border-amber-900/80 p-0.5">
            <div
              style={{ width: `${bossHpPct}%` }}
              className="h-full rounded-full bg-gradient-to-r from-red-800 via-red-600 to-amber-500 shadow-[0_0_14px_rgba(239,68,68,0.85)] transition-all duration-300"
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-bold tracking-widest uppercase text-neutral-400">
            <span>{bossSubtitle}</span>
            <span className="text-amber-300">🔥 {killStreak} MASSACRE · {(dpsCounter / 1000).toFixed(1)}K DPS</span>
          </div>
        </div>
      </div>

      {/* TOP-RIGHT SLEEK COMPASS MINIMAP + SHIFT+RIGHT-CLICK PING */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        <div className="w-36 h-36 rounded-full bg-neutral-950/90 border-2 border-amber-500/60 shadow-[0_12px_35px_rgba(0,0,0,0.9)] relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-2 rounded-full border border-amber-500/20" />
          <div className="absolute inset-7 rounded-full border border-amber-500/15" />
          <div className="absolute top-1.5 text-[10px] font-black text-amber-400">N</div>
          <div className="absolute bottom-1.5 text-[9px] font-bold text-neutral-500">S</div>
          <div className="absolute left-2 text-[9px] font-bold text-neutral-500">W</div>
          <div className="absolute right-2 text-[9px] font-bold text-neutral-500">E</div>
          <div className="w-3.5 h-3.5 rounded-full bg-red-500 border border-yellow-200 shadow-[0_0_10px_#ef4444] absolute top-10" />
          <div className="w-3 h-3 rounded-full bg-cyan-400 border border-white shadow-[0_0_8px_#38bdf8]" />
          <div className="w-7 h-7 rounded-full border-2 border-amber-400 animate-ping absolute top-9" />
          <div className="absolute bottom-3.5 px-2 py-0.5 rounded bg-black/80 text-[9px] font-black text-amber-300 uppercase tracking-wider">
            {biome.toUpperCase()}
          </div>
        </div>
        <div className="bg-neutral-950/90 border border-amber-500/35 rounded-lg px-2.5 py-1 text-[10px] font-bold text-amber-200 shadow">
          🎯 {tacticalPings[tacticalPings.length - 1]?.label}
        </div>
      </div>

      {/* DIABLO 3 / BDO CHARACTER GEAR & CRIT STATS PANEL */}
      {showGearSheet && (
        <div className="absolute right-4 top-48 z-30 w-80 bg-gradient-to-b from-neutral-950/98 via-stone-950/98 to-neutral-950/98 border-2 border-amber-600/80 rounded-2xl p-4 shadow-[0_24px_60px_rgba(0,0,0,0.95)] text-amber-100">
          <div className="flex items-center justify-between border-b border-amber-700/40 pb-2 mb-3">
            <div>
              <div className="text-[10px] font-black tracking-[0.2em] uppercase text-amber-400">
                CHAMPION EQUIPPED BUILD
              </div>
              <div className="text-xs font-black text-white">
                LV.60 SOVEREIGN WHIRLWIND BARBARIAN
              </div>
            </div>
            <button
              onClick={() => setShowGearSheet(false)}
              className="text-amber-400 hover:text-white text-sm font-black cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-black/60 border border-amber-500/30 rounded-lg p-2">
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Sheet DPS</div>
              <div className="text-base font-black text-amber-300">{dpsCounter.toLocaleString()}</div>
            </div>
            <div className="bg-black/60 border border-amber-500/30 rounded-lg p-2">
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Crit Chance / Dmg</div>
              <div className="text-base font-black text-orange-400">64.5% / +485%</div>
            </div>
            <div className="bg-black/60 border border-amber-500/30 rounded-lg p-2">
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Attack Speed</div>
              <div className="text-xs font-black text-cyan-300">2.84 APS (Dual Wield)</div>
            </div>
            <div className="bg-black/60 border border-amber-500/30 rounded-lg p-2">
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Life Steal / LoH</div>
              <div className="text-xs font-black text-emerald-400">5.8% + 1,840 LoH</div>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between bg-amber-950/30 border border-amber-500/30 rounded px-2.5 py-1.5">
              <span className="font-bold text-amber-300">⚔ Main-Hand:</span>
              <span className="font-black text-orange-300">Sovereign Echoing Runeblade</span>
            </div>
            <div className="flex justify-between bg-amber-950/30 border border-amber-500/30 rounded px-2.5 py-1.5">
              <span className="font-bold text-amber-300">⚔ Off-Hand:</span>
              <span className="font-black text-orange-300">Dragon-Fang Tornado Reaver</span>
            </div>
            <div className="flex justify-between bg-sky-950/40 border border-cyan-400/40 rounded px-2.5 py-1.5">
              <span className="font-bold text-cyan-300">👑 Regalia:</span>
              <span className="font-black text-cyan-200">Blue-Flame Sigil (0-Stat Earned)</span>
            </div>
          </div>
        </div>
      )}

      {/* DIABLO 3 / PATH OF EXILE 2 / BDO DIEGETIC ORB & ACTION BAR DOCK */}
      <div
        onMouseDown={startHudDrag}
        style={{ transform: `translate(${hudOffset.x}px, ${hudOffset.y}px)` }}
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-end gap-3 ${
          guiUnlocked ? 'ring-2 ring-amber-400 rounded-2xl p-2 cursor-move bg-black/50' : ''
        }`}
      >
        {/* LEFT CRIMSON LIFE ORB */}
        <div className="relative w-24 h-24 rounded-full bg-neutral-950 border-4 border-amber-600/80 shadow-[0_0_30px_rgba(220,38,38,0.65)] overflow-hidden flex items-center justify-center">
          <div
            style={{ height: `${heroHpPct}%` }}
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-red-950 via-red-600 to-rose-400 transition-all duration-300"
          />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.45),transparent_55%)]" />
          <div className="relative z-10 text-center">
            <div className="text-xs font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              64,820
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-rose-200">LIFE</div>
          </div>
        </div>

        {/* CENTER CARVED-STONE & GOLD 6-SLOT ACTION BAR */}
        <div className="bg-gradient-to-b from-stone-900/95 via-neutral-950/98 to-black border-2 border-amber-600/75 rounded-2xl px-4 py-2.5 shadow-[0_18px_45px_rgba(0,0,0,0.95)] flex flex-col items-center gap-2">
          <div className="w-full flex items-center justify-between text-[10px] font-extrabold tracking-widest uppercase text-amber-300/90 px-1">
            <span>
              ⚔{' '}
              {biome === 'inferno'
                ? 'INFERNO WHIRLWIND CRIT BUILD'
                : biome === 'desert'
                ? 'VALENCIA AWAKENING GREATSWORD'
                : biome === 'manhattan'
                ? 'MANHATTAN URBAN VANGUARD'
                : 'OATHCALL SOVEREIGN CHAMPION'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGearSheet((v) => !v)}
                className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-200 hover:bg-amber-500/40 cursor-pointer"
              >
                Stats & Gear (C)
              </button>
              <button
                onClick={() => setGuiUnlocked((v) => !v)}
                className="px-2 py-0.5 rounded bg-neutral-800 border border-white/20 text-neutral-300 hover:text-white cursor-pointer"
              >
                {guiUnlocked ? '🔒 Lock Bar' : '✥ Move GUI'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[
              { key: 'LMB', name: 'Whirlwind', sub: 'SPIN CRIT', color: 'from-orange-600 to-red-700', glow: 'border-amber-400' },
              { key: 'RMB', name: 'Tornado', sub: 'WIND RUSH', color: 'from-amber-500 to-orange-600', glow: 'border-amber-300' },
              { key: '1', name: 'Battle Rage', sub: 'FRAY +30%', color: 'from-red-700 to-rose-900', glow: 'border-red-400' },
              { key: '2', name: 'Berserker', sub: 'WRATH 100%', color: 'from-purple-600 to-indigo-800', glow: 'border-purple-400' },
              { key: '3', name: 'Cleave', sub: 'AWAKEN', color: 'from-amber-600 to-yellow-700', glow: 'border-yellow-400' },
              { key: 'R', name: 'Oathcall', sub: '3 ALLIES', color: 'from-sky-500 to-blue-700', glow: 'border-cyan-300' },
            ].map((skill) => (
              <button
                key={skill.key}
                onClick={() => {
                  if (skill.key === 'R') setBiome('oathcall');
                  setFloatingCrits((prev) => [
                    ...prev.slice(-2),
                    {
                      id: Date.now(),
                      text: '468,900!!',
                      subtext: `${skill.name.toUpperCase()} CRIT`,
                      x: 49,
                      y: 24,
                      isMegaCrit: true,
                    },
                  ]);
                }}
                className={`w-[72px] h-[68px] rounded-xl bg-gradient-to-br ${skill.color} border-2 ${skill.glow} shadow-lg flex flex-col items-center justify-between px-1.5 py-1.5 hover:scale-105 active:scale-95 transition-transform cursor-pointer`}
              >
                <span className="self-start px-1.5 py-0.2 rounded bg-black/75 text-[9px] font-black text-amber-200 leading-tight">
                  {skill.key}
                </span>
                <span className="text-[11px] font-black text-white leading-none text-center drop-shadow">
                  {skill.name}
                </span>
                <span className="text-[8px] font-extrabold text-amber-100/90 uppercase tracking-tight leading-none">
                  {skill.sub}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT MOLTEN FURY ORB */}
        <div className="relative w-24 h-24 rounded-full bg-neutral-950 border-4 border-amber-600/80 shadow-[0_0_30px_rgba(245,158,11,0.65)] overflow-hidden flex items-center justify-center">
          <div
            style={{ height: `${heroFuryPct}%` }}
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-amber-950 via-orange-500 to-yellow-300 transition-all duration-300"
          />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.45),transparent_55%)]" />
          <div className="relative z-10 text-center">
            <div className="text-xs font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              140/140
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-amber-100">FURY</div>
          </div>
        </div>
      </div>

      {/* SIDE-BY-SIDE OLD N64 PROTOTYPE VS. NEW AAA VISUAL OVERHAUL MODAL */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-5xl w-full bg-neutral-950 border-2 border-amber-500/70 rounded-2xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-wider text-amber-300">
                  Visual Proof: Old Untextured Prototype vs. New PBR + Blender 5.2 + GLTF + Unreal Bloom
                </h2>
                <p className="text-xs text-neutral-400">
                  Left: The old flat grey checkerboard & untextured box capsules. Right: Real normal-mapped PBR materials, rigged GLTF Ranger, Blender 5.2 Inferno Titan, Gothic Ruins, and Unreal Bloom.
                </p>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black font-black text-xs uppercase cursor-pointer"
              >
                Close & Play Live 3D
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-red-500/50 rounded-xl overflow-hidden bg-neutral-900">
                <div className="bg-red-950/80 px-3 py-1.5 text-xs font-black text-red-200 uppercase">
                  ❌ BEFORE: Untextured Grey Grid & Capsule Primitives
                </div>
                <img
                  src="/captures/oathcall_part1_knockout_and_mark.png"
                  alt="Old Prototype"
                  className="w-full h-64 object-cover"
                />
              </div>
              <div className="border border-emerald-500/60 rounded-xl overflow-hidden bg-neutral-900">
                <div className="bg-emerald-950/80 px-3 py-1.5 text-xs font-black text-emerald-200 uppercase">
                  ✅ NOW: Real GLTF/GLB Models + 1K PBR Normal Maps + Unreal Bloom
                </div>
                <img
                  src="/captures/aaa_scene1_inferno_diablo3_whirlwind_crit.png"
                  alt="New AAA Inferno Scene"
                  className="w-full h-64 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
