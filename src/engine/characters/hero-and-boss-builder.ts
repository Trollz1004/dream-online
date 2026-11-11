/**
 * DREAM Engine — In-House Sculpted 3D Hero Classes & Myth@s Boss Builder (Look Pass 1)
 *
 * Builds the four distinct playable hero classes and the boss (Myth@s, the Crimson Sovereign)
 * from 100% in-house procedural 3D geometry and physically-based materials:
 *  1. Knight: Silver plate armor, feathered winged helm, Lion Kite Shield, royal blue cape, broadsword.
 *  2. Elf Archer: Sculpted face with pointed elf ears & blonde braid, green hooded cloak, stitched
 *     leather jerkin & baldric, quiver of feathered arrows, ornate recurve longbow with glowing cyan string/arrow.
 *  3. Mage: Sculpted face with dark hair & arcane circlet, layered dark-purple robes with flared sleeves,
 *     glowing rune-inscribed front tabard & hem, twisted arcane orb staff, concentric glowing blue spell rings.
 *  4. Dark Knight: Spiked crimson-and-black plate armor, horned visor helm, tattered crimson cape,
 *     and glowing red war-halberd.
 *  5. Boss (Myth@s, the Crimson Sovereign): Towering colossus in multi-tiered spiked crimson-and-black
 *     sovereign plate, 4-horned crown greathelm with glowing crimson visor, wide tattered crimson mantle,
 *     and colossal glowing red executioner halberd casting real crimson light.
 */

import * as THREE from 'three';

export type HeroClassId = 'knight' | 'elf-archer' | 'mage' | 'dark-knight';

export const HERO_CLASS_IDS: readonly HeroClassId[] = [
  'knight',
  'elf-archer',
  'mage',
  'dark-knight',
] as const;

export interface CharacterMaterialSet {
  primaryMetal: THREE.MeshStandardMaterial;
  secondaryMetal: THREE.MeshStandardMaterial;
  capeCloth: THREE.MeshStandardMaterial;
  leather?: THREE.MeshStandardMaterial;
  emissiveAccent: THREE.MeshStandardMaterial;
}

export interface CharacterRigParts {
  headpiece: THREE.Object3D;
  capeOrCloak: THREE.Object3D;
  torsoArmorOrRobe: THREE.Object3D;
  weapon: THREE.Object3D;
  weaponTip: THREE.Object3D;
  shield?: THREE.Object3D;
  quiver?: THREE.Object3D;
  spellRings?: THREE.Object3D;
}

export interface CharacterJoints {
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  elbowL: THREE.Group;
  handL: THREE.Group;
  shoulderR: THREE.Group;
  elbowR: THREE.Group;
  handR: THREE.Group;
  hipL: THREE.Group;
  kneeL: THREE.Group;
  hipR: THREE.Group;
  kneeR: THREE.Group;
  capePivot: THREE.Group;
}

export interface BuiltCharacterRig {
  id: HeroClassId | 'mythos-boss';
  root: THREE.Group;
  joints: CharacterJoints;
  parts: CharacterRigParts;
  materials: CharacterMaterialSet;
  weaponLight?: THREE.PointLight;
  baseRestPose: {
    shoulderL: [number, number, number];
    elbowL: [number, number, number];
    shoulderR: [number, number, number];
    elbowR: [number, number, number];
    torsoY: number;
  };
}

/**
 * Generates procedural RGBA DataTextures for cloth weave, leather grain, fluted armor,
 * and glowing arcane runes so materials work identically in both browser WebGL and headless Node tests.
 */
function createProceduralSurfaceTexture(
  kind: 'plate' | 'cloth' | 'leather' | 'chainmail' | 'runes',
  size = 64
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let v = 128;
      if (kind === 'plate') {
        const brushed = Math.sin(x * 0.9) * 10 + Math.cos(y * 0.25) * 8;
        const seam = y % 16 === 0 ? -28 : 0;
        v = Math.max(40, Math.min(245, 190 + brushed + seam));
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
        data[idx + 3] = 255;
      } else if (kind === 'cloth') {
        const warp = ((x + y) % 4 === 0 ? 18 : -12) + Math.sin(x * 0.5) * 8;
        v = Math.max(30, Math.min(240, 155 + warp));
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
        data[idx + 3] = 255;
      } else if (kind === 'leather') {
        const pebble = Math.sin(x * 1.3 + Math.cos(y * 1.1) * 2.0) * 22;
        const stitch = x === 4 || x === size - 5 ? (y % 6 < 3 ? 45 : -25) : 0;
        v = Math.max(30, Math.min(240, 150 + pebble + stitch));
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
        data[idx + 3] = 255;
      } else if (kind === 'chainmail') {
        const ring = Math.sin(x * 1.57) * Math.cos(y * 1.57) * 55;
        v = Math.max(20, Math.min(245, 135 + ring));
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
        data[idx + 3] = 255;
      } else {
        // Arcane rune stole pattern: dark violet cloth with bright cyan/violet vertical rune glyphs
        const cx = Math.abs(x - size / 2);
        const border = cx > size * 0.34 && cx < size * 0.42;
        const glyphBand = cx < size * 0.22 && y % 14 >= 3 && y % 14 <= 11;
        const glyphStroke =
          glyphBand &&
          ((x + y) % 5 === 0 || cx < 3 || y % 14 === 3 || y % 14 === 7 || y % 14 === 11);
        if (glyphStroke || border) {
          data[idx] = 110;
          data[idx + 1] = 225;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        } else {
          data[idx] = 42;
          data[idx + 1] = 22;
          data[idx + 2] = 68;
          data[idx + 3] = 255;
        }
      }
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Creates a pleated, billowing cape or cloak geometry with vertical cloth waves,
 * curved shoulder drape, and optional jagged/tattered bottom hem for Dark Knight & Myth@s.
 */
function createSculptedCapeGeometry(
  topWidth: number,
  bottomWidth: number,
  length: number,
  pleatCount: number,
  tattered: boolean
): THREE.BufferGeometry {
  const segX = 28;
  const segY = 20;
  const geo = new THREE.PlaneGeometry(1, 1, segX, segY);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5; // 0..1 across width
    const v = 0.5 - pos.getY(i); // 0..1 from shoulder top to bottom hem
    const centeredU = (u - 0.5) * 2; // -1..1

    const widthAtV = topWidth + (bottomWidth - topWidth) * Math.pow(v, 0.85);
    const x = centeredU * widthAtV * 0.5;

    // Natural cloth drape curve + vertical pleat folds that deepen toward the hem
    const pleat = Math.sin(centeredU * Math.PI * pleatCount) * (0.015 + v * 0.055);
    const billow = Math.pow(v, 1.35) * 0.22 + Math.sin(v * Math.PI) * 0.06;
    const shoulderWrap = (1 - Math.pow(centeredU, 2)) * 0.04;
    const z = -(billow + pleat - shoulderWrap);

    let yDrop = -v * length;
    if (tattered && v > 0.65) {
      // Deep jagged battle-torn strips at the lower hem
      const tearWave =
        Math.abs(Math.sin(centeredU * Math.PI * 3.5)) * 0.24 +
        Math.cos(centeredU * Math.PI * 7.0) * 0.08;
      const vFactor = (v - 0.65) / 0.35;
      yDrop += tearWave * vFactor * length * 0.42;
    }

    pos.setXYZ(i, x, yDrop, z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a feathered wing geometry for the Knight's Winged Greathelm.
 */
function createFeatheredHelmWingGeometry(side: 1 | -1): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.06 * side, 0.14, 0.22 * side, 0.36);
  shape.lineTo(0.15 * side, 0.31);
  shape.lineTo(0.25 * side, 0.26);
  shape.lineTo(0.16 * side, 0.21);
  shape.lineTo(0.24 * side, 0.16);
  shape.lineTo(0.14 * side, 0.12);
  shape.lineTo(0.19 * side, 0.07);
  shape.quadraticCurveTo(0.08 * side, 0.02, 0, -0.02);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.008,
    bevelThickness: 0.008,
  });
  geo.rotateY(side * -0.42);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a curved, swept horn geometry for the Dark Knight and Boss Myth@s helms/pauldrons.
 */
function createSweptHornGeometry(
  baseRadius: number,
  length: number,
  curveX: number,
  curveY: number,
  curveZ: number
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(curveX * 0.35, curveY * 0.4, curveZ * 0.35),
    new THREE.Vector3(curveX * 0.78, curveY * 0.82, curveZ * 0.75),
    new THREE.Vector3(curveX, length, curveZ),
  ]);
  const radialSegs = 10;
  const tubularSegs = 14;
  const geo = new THREE.TubeGeometry(curve, tubularSegs, baseRadius, radialSegs, false);
  const pos = geo.attributes.position;
  const center = new THREE.Vector3();

  // Taper radius smoothly from baseRadius to a sharp point at t = 1
  for (let i = 0; i <= tubularSegs; i++) {
    const t = i / tubularSegs;
    curve.getPointAt(t, center);
    const taper = Math.max(0.04, 1 - Math.pow(t, 0.85));
    const ridge = 1 + Math.sin(t * Math.PI * 8) * 0.08;
    for (let j = 0; j <= radialSegs; j++) {
      const idx = i * (radialSegs + 1) + j;
      if (idx < pos.count) {
        const vx = pos.getX(idx);
        const vy = pos.getY(idx);
        const vz = pos.getZ(idx);
        pos.setXYZ(
          idx,
          center.x + (vx - center.x) * taper * ridge,
          center.y + (vy - center.y) * taper * ridge,
          center.z + (vz - center.z) * taper * ridge
        );
      }
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a sculpted humanoid face with brow ridge, nose, eyes (sclera + iris), lips,
 * and optional pointed elf ears so unhelmeted classes (Elf Archer, Mage) never look like blank balls.
 */
function createSculptedFaceGroup(
  skinColorHex: number,
  eyeColorHex: number,
  isElf: boolean
): THREE.Group {
  const faceGroup = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColorHex,
    roughness: 0.54,
    metalness: 0.04,
  });

  // Cranium + sculpted jawline
  const headGeo = new THREE.SphereGeometry(0.125, 20, 16);
  const hPos = headGeo.attributes.position;
  for (let i = 0; i < hPos.count; i++) {
    let x = hPos.getX(i);
    const y = hPos.getY(i);
    let z = hPos.getZ(i);
    if (y < 0) {
      // Taper jaw and chin forward
      const jawTaper = 1.0 + y * 2.1;
      x *= Math.max(0.52, jawTaper);
      z *= Math.max(0.68, jawTaper + 0.15);
    }
    hPos.setXYZ(i, x, y * 1.12, z);
  }
  headGeo.computeVertexNormals();
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  faceGroup.add(headMesh);

  // Sculpted nose bridge
  const noseGeo = new THREE.ConeGeometry(0.022, 0.058, 6);
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.position.set(0, 0.005, 0.122);
  nose.rotation.x = Math.PI * 0.38;
  faceGroup.add(nose);

  // Eyes (white sclera + glowing/colored iris + dark brows)
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
  const irisMat = new THREE.MeshStandardMaterial({
    color: eyeColorHex,
    emissive: eyeColorHex,
    emissiveIntensity: 0.45,
    roughness: 0.15,
  });
  const browMat = new THREE.MeshStandardMaterial({
    color: isElf ? 0x92622a : 0x1e1b2e,
    roughness: 0.7,
  });

  for (const side of [-1, 1]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 8), scleraMat);
    sclera.scale.set(1.25, 0.82, 0.65);
    sclera.position.set(side * 0.044, 0.026, 0.108);
    faceGroup.add(sclera);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), irisMat);
    iris.position.set(side * 0.044, 0.026, 0.118);
    faceGroup.add(iris);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.008, 0.012), browMat);
    brow.position.set(side * 0.045, 0.046, 0.114);
    brow.rotation.z = side * -0.14;
    faceGroup.add(brow);
  }

  // Lips
  const lipMat = new THREE.MeshStandardMaterial({ color: 0xb85d68, roughness: 0.45 });
  const lips = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.011, 0.014), lipMat);
  lips.position.set(0, -0.044, 0.112);
  faceGroup.add(lips);

  // Long pointed Elf ears
  if (isElf) {
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.026, 0.135, 8);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.145, 0.028, -0.005);
      ear.rotation.z = side * -1.12;
      ear.rotation.x = -0.25;
      ear.castShadow = true;
      faceGroup.add(ear);
    }
  }

  return faceGroup;
}

/**
 * Creates the base articulated skeletal joint tree for a character so every armor piece,
 * cloth layer, cape, shield, and weapon attaches cleanly in 1:1 local meter coordinates.
 */
function createArticulatedJointHierarchy(scale = 1.0): {
  root: THREE.Group;
  joints: CharacterJoints;
} {
  const root = new THREE.Group();
  root.scale.setScalar(scale);

  const hips = new THREE.Group();
  hips.position.set(0, 0.94, 0);
  root.add(hips);

  const torso = new THREE.Group();
  torso.position.set(0, 0.12, 0);
  hips.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 0.56, 0.02);
  torso.add(head);

  const capePivot = new THREE.Group();
  capePivot.position.set(0, 0.46, -0.14);
  torso.add(capePivot);

  const shoulderL = new THREE.Group();
  shoulderL.position.set(0.27, 0.42, 0);
  torso.add(shoulderL);

  const elbowL = new THREE.Group();
  elbowL.position.set(0.04, -0.28, 0);
  shoulderL.add(elbowL);

  const handL = new THREE.Group();
  handL.position.set(0.02, -0.26, 0.04);
  elbowL.add(handL);

  const shoulderR = new THREE.Group();
  shoulderR.position.set(-0.27, 0.42, 0);
  torso.add(shoulderR);

  const elbowR = new THREE.Group();
  elbowR.position.set(-0.04, -0.28, 0);
  shoulderR.add(elbowR);

  const handR = new THREE.Group();
  handR.position.set(-0.02, -0.26, 0.04);
  elbowR.add(handR);

  const hipL = new THREE.Group();
  hipL.position.set(0.14, -0.04, 0);
  hips.add(hipL);

  const kneeL = new THREE.Group();
  kneeL.position.set(0.02, -0.44, 0);
  hipL.add(kneeL);

  const hipR = new THREE.Group();
  hipR.position.set(-0.14, -0.04, 0);
  hips.add(hipR);

  const kneeR = new THREE.Group();
  kneeR.position.set(-0.02, -0.44, 0);
  hipR.add(kneeR);

  return {
    root,
    joints: {
      hips,
      torso,
      head,
      shoulderL,
      elbowL,
      handL,
      shoulderR,
      elbowR,
      handR,
      hipL,
      kneeL,
      hipR,
      kneeR,
      capePivot,
    },
  };
}

function enableShadowsRecursive(obj: THREE.Object3D): void {
  obj.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
}

// ============================================================================
// 1. KNIGHT BUILDER (Silver Plate, Winged Helm, Lion Kite Shield, Blue Cape, Broadsword)
// ============================================================================
function buildKnightHero(): BuiltCharacterRig {
  const { root, joints } = createArticulatedJointHierarchy(1.04);
  const plateTex = createProceduralSurfaceTexture('plate');
  const chainTex = createProceduralSurfaceTexture('chainmail');
  const clothTex = createProceduralSurfaceTexture('cloth');
  const leatherTex = createProceduralSurfaceTexture('leather');

  const silverPlateMat = new THREE.MeshStandardMaterial({
    color: 0x9fb0c7,
    roughnessMap: plateTex,
    bumpMap: plateTex,
    bumpScale: 0.014,
    roughness: 0.22,
    metalness: 0.9,
    envMapIntensity: 1.35,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x273244,
    roughness: 0.34,
    metalness: 0.86,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.24,
    metalness: 0.9,
    envMapIntensity: 1.4,
  });
  const chainmailMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    bumpMap: chainTex,
    bumpScale: 0.024,
    roughness: 0.46,
    metalness: 0.82,
  });
  const blueCapeMat = new THREE.MeshStandardMaterial({
    color: 0x1e40af,
    bumpMap: clothTex,
    bumpScale: 0.018,
    roughness: 0.86,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const leatherBeltMat = new THREE.MeshStandardMaterial({
    color: 0x4a2810,
    bumpMap: leatherTex,
    bumpScale: 0.018,
    roughness: 0.62,
    metalness: 0.08,
  });
  const steelBladeMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.22,
    roughness: 0.14,
    metalness: 0.95,
    envMapIntensity: 1.5,
  });

  // ---- Torso: Layered Silver Breastplate, Plackart, Gold Sun Medallion, Chainmail Skirt & Tassets ----
  const torsoGroup = new THREE.Group();
  joints.torso.add(torsoGroup);

  const cuirassProfile = [
    new THREE.Vector2(0.16, 0.0),
    new THREE.Vector2(0.21, 0.14),
    new THREE.Vector2(0.25, 0.32),
    new THREE.Vector2(0.22, 0.46),
    new THREE.Vector2(0.13, 0.52),
  ];
  const cuirassGeo = new THREE.LatheGeometry(cuirassProfile, 20);
  cuirassGeo.scale(1.12, 1.0, 0.78);
  const cuirassMesh = new THREE.Mesh(cuirassGeo, silverPlateMat);
  torsoGroup.add(cuirassMesh);

  // Articulated V-Fluted Plackart Lames & Dark Steel Recessed Trim (matches class examples.jpg)
  for (const side of [-1, 1]) {
    for (let lame = 0; lame < 3; lame++) {
      const chestLame = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.055, 0.045),
        lame === 1 ? darkSteelMat : silverPlateMat
      );
      chestLame.position.set(side * 0.085, 0.16 + lame * 0.075, 0.165 + lame * 0.008);
      chestLame.rotation.z = side * 0.28;
      chestLame.rotation.y = side * -0.22;
      torsoGroup.add(chestLame);
    }
  }

  // Raised Golden Sun/Crest Medallion on Breastplate + Gold Gorget Collar
  const chestCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 1), goldTrimMat);
  chestCrest.scale.set(1.2, 1.35, 0.42);
  chestCrest.position.set(0, 0.34, 0.195);
  torsoGroup.add(chestCrest);

  const gorget = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.026, 10, 20), goldTrimMat);
  gorget.rotation.x = Math.PI * 0.52;
  gorget.position.set(0, 0.48, 0.01);
  torsoGroup.add(gorget);

  // Leather War-Belt + Golden Buckle + Chainmail Hauberk Skirt + Layered Steel Tassets
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.205, 0.07, 18), leatherBeltMat);
  belt.scale.set(1.12, 1.0, 0.82);
  belt.position.set(0, 0.03, 0);
  torsoGroup.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.085, 0.035), goldTrimMat);
  buckle.position.set(0, 0.03, 0.175);
  torsoGroup.add(buckle);

  const mailSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.25, 0.26, 20, 3, false),
    chainmailMat
  );
  mailSkirt.scale.set(1.12, 1.0, 0.84);
  mailSkirt.position.set(0, -0.11, 0);
  torsoGroup.add(mailSkirt);

  for (const side of [-1, 1]) {
    for (let lame = 0; lame < 3; lame++) {
      const tasset = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.075, 0.04),
        lame === 2 ? goldTrimMat : silverPlateMat
      );
      tasset.position.set(side * 0.135, -0.03 - lame * 0.068, 0.13 - lame * 0.008);
      tasset.rotation.z = side * -0.15;
      tasset.rotation.x = -0.12;
      torsoGroup.add(tasset);
    }
  }

  // ---- Headpiece: Winged Silver Greathelm with T-Visor & Tall Feathered Wings ----
  const helmGroup = new THREE.Group();
  joints.head.add(helmGroup);

  const helmDome = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.145, 0.26, 18), silverPlateMat);
  helmDome.position.set(0, 0.06, 0);
  helmGroup.add(helmDome);

  const helmCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    silverPlateMat
  );
  helmCrown.position.set(0, 0.18, 0);
  helmGroup.add(helmCrown);

  // Golden Central Crest Ridge & Cross-Visor Trim
  const helmCrest = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.28, 0.27), goldTrimMat);
  helmCrest.position.set(0, 0.12, 0.01);
  helmGroup.add(helmCrest);

  const visorDarkMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.9,
  });
  const visorHorizontal = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.032, 0.04), visorDarkMat);
  visorHorizontal.position.set(0, 0.095, 0.132);
  helmGroup.add(visorHorizontal);

  const visorVertical = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.14, 0.04), visorDarkMat);
  visorVertical.position.set(0, 0.035, 0.134);
  helmGroup.add(visorVertical);

  // Iconic Left & Right Swept Feathered Helm Wings
  for (const side of [-1, 1] as const) {
    const wingMesh = new THREE.Mesh(createFeatheredHelmWingGeometry(side), silverPlateMat);
    wingMesh.position.set(side * 0.125, 0.11, -0.02);
    helmGroup.add(wingMesh);

    const wingGoldBase = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), goldTrimMat);
    wingGoldBase.position.set(side * 0.13, 0.12, 0.01);
    helmGroup.add(wingGoldBase);
  }

  // ---- Layered Pauldrons, Arms, Gauntlets & Greaves ----
  const buildArmWithPlate = (shoulder: THREE.Group, elbow: THREE.Group, side: 1 | -1) => {
    for (let i = 0; i < 3; i++) {
      const pauldronLame = new THREE.Mesh(
        new THREE.SphereGeometry(0.135 - i * 0.012, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
        silverPlateMat
      );
      pauldronLame.position.set(side * (0.02 + i * 0.015), 0.05 - i * 0.045, 0);
      pauldronLame.rotation.z = side * (-0.38 - i * 0.12);
      shoulder.add(pauldronLame);
    }
    const trimRim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.014, 8, 16), goldTrimMat);
    trimRim.rotation.x = Math.PI * 0.5;
    trimRim.rotation.y = side * -0.4;
    shoulder.add(trimRim);

    const upperArmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.06, 0.26, 12),
      chainmailMat
    );
    upperArmMesh.position.set(side * 0.02, -0.14, 0);
    shoulder.add(upperArmMesh);

    const couter = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), goldTrimMat);
    elbow.add(couter);

    const vambrace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.066, 0.054, 0.24, 14),
      silverPlateMat
    );
    vambrace.position.set(0, -0.13, 0.02);
    elbow.add(vambrace);
  };
  buildArmWithPlate(joints.shoulderL, joints.elbowL, 1);
  buildArmWithPlate(joints.shoulderR, joints.elbowR, -1);

  const buildLegWithGreaves = (hip: THREE.Group, knee: THREE.Group) => {
    const cuisse = new THREE.Mesh(
      new THREE.CylinderGeometry(0.098, 0.082, 0.42, 14),
      silverPlateMat
    );
    cuisse.position.set(0, -0.22, 0);
    hip.add(cuisse);

    const poleyn = new THREE.Mesh(new THREE.OctahedronGeometry(0.088, 1), goldTrimMat);
    poleyn.scale.set(0.95, 1.15, 0.85);
    poleyn.position.set(0, 0, 0.04);
    knee.add(poleyn);

    const greave = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.064, 0.42, 14),
      silverPlateMat
    );
    greave.position.set(0, -0.22, 0);
    knee.add(greave);

    const sabaton = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.085, 0.24), silverPlateMat);
    sabaton.position.set(0, -0.44, 0.05);
    knee.add(sabaton);
  };
  buildLegWithGreaves(joints.hipL, joints.kneeL);
  buildLegWithGreaves(joints.hipR, joints.kneeR);

  // ---- Royal Blue Pleated Cloth Cape ----
  const capeMesh = new THREE.Mesh(
    createSculptedCapeGeometry(0.46, 0.88, 1.18, 5, false),
    blueCapeMat
  );
  joints.capePivot.add(capeMesh);

  // ---- Left Forearm: Curved Lion Kite Shield ----
  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(0.14, -0.06, 0.14);
  shieldGroup.rotation.set(0.08, -0.18, -0.06);
  joints.elbowL.add(shieldGroup);

  const kiteShape = new THREE.Shape();
  kiteShape.moveTo(0, 0.4);
  kiteShape.lineTo(0.28, 0.34);
  kiteShape.quadraticCurveTo(0.3, -0.06, 0, -0.48);
  kiteShape.quadraticCurveTo(-0.3, -0.06, -0.28, 0.34);
  kiteShape.closePath();

  const shieldBodyGeo = new THREE.ExtrudeGeometry(kiteShape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.016,
  });
  const shieldFieldMat = new THREE.MeshStandardMaterial({
    color: 0x172554,
    roughness: 0.36,
    metalness: 0.72,
  });
  const shieldBody = new THREE.Mesh(shieldBodyGeo, [shieldFieldMat, silverPlateMat]);
  shieldGroup.add(shieldBody);

  // Raised Golden Rampant Lion Relief on Kite Shield Front
  const lionGroup = new THREE.Group();
  lionGroup.position.set(0, -0.02, 0.052);
  shieldGroup.add(lionGroup);

  const lionMane = new THREE.Mesh(new THREE.OctahedronGeometry(0.115, 1), goldTrimMat);
  lionMane.scale.set(1.05, 1.2, 0.42);
  lionMane.position.set(0.01, 0.14, 0);
  lionGroup.add(lionMane);

  const lionTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.05, 0.25, 10), goldTrimMat);
  lionTorso.scale.set(1.0, 1.0, 0.45);
  lionTorso.rotation.z = -0.18;
  lionTorso.position.set(0, -0.02, 0);
  lionGroup.add(lionTorso);

  for (const [lx, ly, rz] of [
    [-0.1, 0.12, 0.65],
    [0.1, 0.16, -0.55],
    [-0.08, -0.16, 0.35],
    [0.08, -0.18, -0.35],
  ]) {
    const limb = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.14, 0.03), goldTrimMat);
    limb.position.set(lx, ly, 0.012);
    limb.rotation.z = rz;
    lionGroup.add(limb);
  }

  // ---- Right Hand: Knight's Steel Broadsword with Golden Crossguard & Pommel ----
  const swordGroup = new THREE.Group();
  swordGroup.rotation.set(-0.42, 0.12, -0.16);
  joints.handR.add(swordGroup);

  const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.048, 1), goldTrimMat);
  pommel.position.set(0, 0, -0.16);
  swordGroup.add(pommel);

  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.18, 10), leatherBeltMat);
  grip.rotation.x = Math.PI * 0.5;
  grip.position.set(0, 0, -0.06);
  swordGroup.add(grip);

  const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.038, 0.048), goldTrimMat);
  crossguard.position.set(0, 0, 0.04);
  swordGroup.add(crossguard);

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.048, 0.06);
  bladeShape.lineTo(0.038, 0.92);
  bladeShape.lineTo(0, 1.12);
  bladeShape.lineTo(-0.038, 0.92);
  bladeShape.lineTo(-0.048, 0.06);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.016,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.008,
    bevelThickness: 0.008,
  });
  bladeGeo.rotateX(Math.PI * 0.5);
  const bladeMesh = new THREE.Mesh(bladeGeo, steelBladeMat);
  bladeMesh.position.set(0, 0.008, 0.05);
  swordGroup.add(bladeMesh);

  const weaponTip = new THREE.Object3D();
  weaponTip.position.set(0, 0, 1.16);
  swordGroup.add(weaponTip);

  const swordLight = new THREE.PointLight(0x93c5fd, 0.55, 3.8, 1.6);
  swordLight.position.set(0, 0.1, 0.72);
  swordGroup.add(swordLight);

  // Heroic Combat Stance (Shield raised on left facing forward, Broadsword poised on right)
  const baseRestPose = {
    shoulderL: [-0.42, 0.18, 0.24] as [number, number, number],
    elbowL: [-0.48, 0.12, 0.0] as [number, number, number],
    shoulderR: [-0.48, -0.28, -0.38] as [number, number, number],
    elbowR: [-0.42, 0.0, -0.14] as [number, number, number],
    torsoY: 0.12,
  };
  joints.shoulderL.rotation.set(...baseRestPose.shoulderL);
  joints.elbowL.rotation.set(...baseRestPose.elbowL);
  joints.shoulderR.rotation.set(...baseRestPose.shoulderR);
  joints.elbowR.rotation.set(...baseRestPose.elbowR);
  joints.hipL.rotation.set(-0.14, 0, 0.08);
  joints.kneeL.rotation.set(0.22, 0, 0);
  joints.hipR.rotation.set(0.16, 0, -0.08);
  joints.kneeR.rotation.set(0.14, 0, 0);

  enableShadowsRecursive(root);

  return {
    id: 'knight',
    root,
    joints,
    parts: {
      headpiece: helmGroup,
      capeOrCloak: capeMesh,
      torsoArmorOrRobe: torsoGroup,
      weapon: swordGroup,
      weaponTip,
      shield: shieldGroup,
    },
    materials: {
      primaryMetal: silverPlateMat,
      secondaryMetal: goldTrimMat,
      capeCloth: blueCapeMat,
      leather: leatherBeltMat,
      emissiveAccent: steelBladeMat,
    },
    weaponLight: swordLight,
    baseRestPose,
  };
}

// ============================================================================
// 2. ELF ARCHER BUILDER (Green Hooded Cloak, Stitched Leather, Blonde Braid, Quiver, Longbow)
// ============================================================================
function buildElfArcherHero(): BuiltCharacterRig {
  const { root, joints } = createArticulatedJointHierarchy(1.0);
  const clothTex = createProceduralSurfaceTexture('cloth');
  const leatherTex = createProceduralSurfaceTexture('leather');

  const greenCloakMat = new THREE.MeshStandardMaterial({
    color: 0x1f4d2b,
    bumpMap: clothTex,
    bumpScale: 0.016,
    roughness: 0.87,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });
  const oliveTunicMat = new THREE.MeshStandardMaterial({
    color: 0x3f6234,
    bumpMap: clothTex,
    bumpScale: 0.012,
    roughness: 0.82,
    metalness: 0.04,
  });
  const stitchedLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x6b3e1e,
    bumpMap: leatherTex,
    bumpScale: 0.022,
    roughness: 0.58,
    metalness: 0.08,
  });
  const darkLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x3e2412,
    bumpMap: leatherTex,
    bumpScale: 0.018,
    roughness: 0.54,
    metalness: 0.1,
  });
  const bronzeTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd99b26,
    roughness: 0.25,
    metalness: 0.88,
  });
  const blondeHairMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.46,
    metalness: 0.14,
  });
  const cyanBowGlowMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.35,
    roughness: 0.14,
    metalness: 0.2,
  });

  // ---- Torso: Stitched Brown Leather Jerkin/Corset, Olive Tunic Skirt, Cross-Baldric & Belt ----
  const torsoGroup = new THREE.Group();
  joints.torso.add(torsoGroup);

  const jerkinProfile = [
    new THREE.Vector2(0.14, 0.0),
    new THREE.Vector2(0.18, 0.16),
    new THREE.Vector2(0.21, 0.34),
    new THREE.Vector2(0.18, 0.45),
    new THREE.Vector2(0.11, 0.5),
  ];
  const jerkinGeo = new THREE.LatheGeometry(jerkinProfile, 18);
  jerkinGeo.scale(1.06, 1.0, 0.76);
  const jerkinMesh = new THREE.Mesh(jerkinGeo, stitchedLeatherMat);
  torsoGroup.add(jerkinMesh);

  // Front Olive Cloth Panel + Cross-Stitched Corset Lacing
  const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.03), oliveTunicMat);
  frontPanel.position.set(0, 0.26, 0.145);
  torsoGroup.add(frontPanel);

  for (let i = 0; i < 4; i++) {
    const lace = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.015), bronzeTrimMat);
    lace.position.set(0, 0.16 + i * 0.06, 0.162);
    lace.rotation.z = i % 2 === 0 ? 0.32 : -0.32;
    torsoGroup.add(lace);
  }

  // Diagonal Archer's Baldric Strap + Waist Belt + Brass Ring Buckle + Tunic Skirt & Leather Tassets
  const baldric = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.022, 8, 20), darkLeatherMat);
  baldric.scale.set(0.95, 1.35, 0.72);
  baldric.rotation.z = 0.58;
  baldric.position.set(0, 0.28, 0);
  torsoGroup.add(baldric);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.175, 0.065, 16), darkLeatherMat);
  belt.scale.set(1.08, 1.0, 0.8);
  belt.position.set(0, 0.04, 0);
  torsoGroup.add(belt);

  const buckleRing = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.009, 8, 14), bronzeTrimMat);
  buckleRing.position.set(0, 0.04, 0.148);
  torsoGroup.add(buckleRing);

  const tunicSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.24, 0.28, 18, 2, false),
    oliveTunicMat
  );
  tunicSkirt.scale.set(1.08, 1.0, 0.82);
  tunicSkirt.position.set(0, -0.11, 0);
  torsoGroup.add(tunicSkirt);

  // Layered Leather Hip Tassets & Ranger Pouches (matches class examples.jpg)
  for (const side of [-1, 1]) {
    const hipTasset = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.2, 0.035),
      stitchedLeatherMat
    );
    hipTasset.position.set(side * 0.15, -0.08, 0.09);
    hipTasset.rotation.z = side * -0.22;
    hipTasset.rotation.y = side * 0.35;
    torsoGroup.add(hipTasset);

    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.085, 0.055), darkLeatherMat);
    pouch.position.set(side * 0.175, -0.02, 0.05);
    pouch.rotation.z = side * -0.15;
    torsoGroup.add(pouch);
  }

  // ---- Headpiece: Sculpted Elf Face, Pointed Ears, Blonde Locks/Braid & Forest-Green Ranger Hood ----
  const headGroup = new THREE.Group();
  joints.head.add(headGroup);

  const elfFace = createSculptedFaceGroup(0xfcd9b8, 0x34d399, true);
  elfFace.position.set(0, 0.08, 0);
  headGroup.add(elfFace);

  // Blonde Hair Crown + Side Framing Locks + Long Back Braid
  const hairCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.132, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    blondeHairMat
  );
  hairCrown.position.set(0, 0.1, -0.01);
  headGroup.add(hairCrown);

  for (const side of [-1, 1]) {
    const sideLock = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.22, 8), blondeHairMat);
    sideLock.position.set(side * 0.105, 0.01, 0.065);
    sideLock.rotation.z = side * 0.15;
    sideLock.rotation.x = 0.22;
    headGroup.add(sideLock);
  }

  const braidGroup = new THREE.Group();
  braidGroup.position.set(0.04, 0.02, -0.12);
  braidGroup.rotation.x = 0.35;
  headGroup.add(braidGroup);
  for (let b = 0; b < 5; b++) {
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.036 - b * 0.004, 10, 8), blondeHairMat);
    knot.scale.set(1.0, 1.3, 0.85);
    knot.position.set(0, -b * 0.058, -b * 0.015);
    braidGroup.add(knot);
  }

  // Draped Forest-Green Ranger Hood Cowl
  const hoodCowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.152, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    greenCloakMat
  );
  hoodCowl.position.set(0, 0.1, -0.035);
  hoodCowl.rotation.x = -0.35;
  headGroup.add(hoodCowl);

  const hoodPeak = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.24, 10), greenCloakMat);
  hoodPeak.position.set(0, 0.12, -0.18);
  hoodPeak.rotation.x = -1.18;
  headGroup.add(hoodPeak);

  // ---- Green Cloak & Quiver of Feathered Arrows ----
  const cloakMantle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.26, 0.14, 16),
    greenCloakMat
  );
  cloakMantle.scale.set(1.15, 1.0, 0.85);
  cloakMantle.position.set(0, 0.44, 0);
  torsoGroup.add(cloakMantle);

  const cloakMesh = new THREE.Mesh(
    createSculptedCapeGeometry(0.42, 0.82, 1.12, 5, false),
    greenCloakMat
  );
  joints.capePivot.add(cloakMesh);

  // Angled Leather Quiver + 6 Feathered Arrows projecting above shoulder silhouette
  const quiverGroup = new THREE.Group();
  quiverGroup.position.set(-0.14, 0.28, -0.17);
  quiverGroup.rotation.z = -0.46;
  quiverGroup.rotation.x = -0.15;
  torsoGroup.add(quiverGroup);

  const quiverTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.058, 0.048, 0.48, 12),
    darkLeatherMat
  );
  quiverGroup.add(quiverTube);

  const featherMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
  for (let a = 0; a < 5; a++) {
    const ang = (a / 5) * Math.PI * 2;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.34, 6),
      stitchedLeatherMat
    );
    shaft.position.set(Math.cos(ang) * 0.025, 0.26, Math.sin(ang) * 0.025);
    quiverGroup.add(shaft);

    const fletch = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.08, 4), featherMat);
    fletch.position.set(Math.cos(ang) * 0.025, 0.41, Math.sin(ang) * 0.025);
    quiverGroup.add(fletch);
  }

  // ---- Arms, Bracers, Leather Trousers & Tall Folded Boots ----
  const buildArcherArm = (shoulder: THREE.Group, elbow: THREE.Group, side: 1 | -1) => {
    const pad = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      stitchedLeatherMat
    );
    pad.rotation.z = side * -0.45;
    shoulder.add(pad);

    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.048, 0.25, 10),
      oliveTunicMat
    );
    sleeve.position.set(0, -0.13, 0);
    shoulder.add(sleeve);

    const bracer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.054, 0.044, 0.23, 12),
      darkLeatherMat
    );
    bracer.position.set(0, -0.12, 0.01);
    elbow.add(bracer);
  };
  buildArcherArm(joints.shoulderL, joints.elbowL, 1);
  buildArcherArm(joints.shoulderR, joints.elbowR, -1);

  const buildArcherLeg = (hip: THREE.Group, knee: THREE.Group) => {
    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.086, 0.072, 0.42, 12),
      stitchedLeatherMat
    );
    thigh.position.set(0, -0.22, 0);
    hip.add(thigh);

    const bootCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.074, 0.1, 12), darkLeatherMat);
    bootCuff.position.set(0, -0.04, 0);
    knee.add(bootCuff);

    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.058, 0.38, 12), darkLeatherMat);
    boot.position.set(0, -0.23, 0);
    knee.add(boot);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.075, 0.22), darkLeatherMat);
    foot.position.set(0, -0.43, 0.045);
    knee.add(foot);
  };
  buildArcherLeg(joints.hipL, joints.kneeL);
  buildArcherLeg(joints.hipR, joints.kneeR);

  // ---- Left Hand: Tall Ornate Recurve Longbow + Glowing Cyan Bowstring & Nocked Arrow ----
  const bowGroup = new THREE.Group();
  joints.handL.add(bowGroup);

  const bowWoodMat = new THREE.MeshStandardMaterial({
    color: 0x4a2c16,
    roughness: 0.48,
    metalness: 0.15,
  });

  // Upper & lower curved recurve limbs (~1.58m full bow span for unmistakable silhouette!)
  const bowCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.78, -0.26),
    new THREE.Vector3(0, -0.52, -0.06),
    new THREE.Vector3(0, -0.18, 0.08),
    new THREE.Vector3(0, 0, 0.04),
    new THREE.Vector3(0, 0.18, 0.08),
    new THREE.Vector3(0, 0.52, -0.06),
    new THREE.Vector3(0, 0.78, -0.26),
  ]);
  const bowLimbGeo = new THREE.TubeGeometry(bowCurve, 28, 0.024, 10, false);
  const bowLimbMesh = new THREE.Mesh(bowLimbGeo, bowWoodMat);
  bowGroup.add(bowLimbMesh);

  // Ornate Bronze/Gold Riser & Recurve Tips + Glowing Cyan Gems
  const bowRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.28, 10), bronzeTrimMat);
  bowRiser.position.set(0, 0, 0.05);
  bowGroup.add(bowRiser);

  for (const dirY of [-1, 1]) {
    const tipOrnament = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.16, 8), bronzeTrimMat);
    tipOrnament.position.set(0, dirY * 0.76, -0.24);
    tipOrnament.rotation.x = dirY * -0.45;
    bowGroup.add(tipOrnament);

    const bowGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 0), cyanBowGlowMat);
    bowGem.position.set(0, dirY * 0.42, 0.0);
    bowGroup.add(bowGem);
  }

  // Drawn Glowing Cyan Bowstring (two taut segments pulled back to nock point)
  const stringCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.76, -0.25),
    new THREE.Vector3(0, 0.04, -0.46),
    new THREE.Vector3(0, -0.76, -0.25),
  ]);
  const bowStringMesh = new THREE.Mesh(
    new THREE.TubeGeometry(stringCurve, 12, 0.007, 6, false),
    cyanBowGlowMat
  );
  bowGroup.add(bowStringMesh);

  // Nocked Arrow with Glowing Cyan Broadhead aimed forward (+Z)
  const arrowShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.009, 0.88, 8),
    cyanBowGlowMat
  );
  arrowShaft.rotation.x = Math.PI * 0.5;
  arrowShaft.position.set(0, 0.04, -0.02);
  bowGroup.add(arrowShaft);

  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.16, 6), cyanBowGlowMat);
  arrowHead.rotation.x = Math.PI * 0.5;
  arrowHead.position.set(0, 0.04, 0.46);
  bowGroup.add(arrowHead);

  const weaponTip = new THREE.Object3D();
  weaponTip.position.set(0, 0.04, 0.52);
  bowGroup.add(weaponTip);

  const bowLight = new THREE.PointLight(0x38bdf8, 1.05, 5.2, 1.6);
  bowLight.position.set(0, 0.08, 0.35);
  bowGroup.add(bowLight);

  // Drawn-Bow Action Stance (Left arm extended holding bow, Right arm drawn back to cheek)
  const baseRestPose = {
    shoulderL: [-1.42, 0.18, 0.12] as [number, number, number],
    elbowL: [-0.08, 0, 0] as [number, number, number],
    shoulderR: [-1.25, -0.45, -0.52] as [number, number, number],
    elbowR: [-1.15, 0.35, 0.25] as [number, number, number],
    torsoY: 0.12,
  };
  joints.shoulderL.rotation.set(...baseRestPose.shoulderL);
  joints.elbowL.rotation.set(...baseRestPose.elbowL);
  joints.shoulderR.rotation.set(...baseRestPose.shoulderR);
  joints.elbowR.rotation.set(...baseRestPose.elbowR);
  joints.hipL.rotation.set(-0.18, 0, 0.1);
  joints.kneeL.rotation.set(0.24, 0, 0);
  joints.hipR.rotation.set(0.2, 0, -0.1);
  joints.kneeR.rotation.set(0.18, 0, 0);

  enableShadowsRecursive(root);

  return {
    id: 'elf-archer',
    root,
    joints,
    parts: {
      headpiece: headGroup,
      capeOrCloak: cloakMesh,
      torsoArmorOrRobe: torsoGroup,
      weapon: bowGroup,
      weaponTip,
      quiver: quiverGroup,
    },
    materials: {
      primaryMetal: bronzeTrimMat,
      secondaryMetal: bronzeTrimMat,
      capeCloth: greenCloakMat,
      leather: stitchedLeatherMat,
      emissiveAccent: cyanBowGlowMat,
    },
    weaponLight: bowLight,
    baseRestPose,
  };
}

// ============================================================================
// 3. MAGE BUILDER (Dark Purple Robes, Glowing Runes, Orb Staff & Concentric Blue Spell Rings)
// ============================================================================
function buildMageHero(): BuiltCharacterRig {
  const { root, joints } = createArticulatedJointHierarchy(1.0);
  const clothTex = createProceduralSurfaceTexture('cloth');
  const runeTex = createProceduralSurfaceTexture('runes');

  const purpleRobeMat = new THREE.MeshStandardMaterial({
    color: 0x26163d,
    bumpMap: clothTex,
    bumpScale: 0.016,
    roughness: 0.84,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });
  const innerVioletRobeMat = new THREE.MeshStandardMaterial({
    color: 0x3b1f5e,
    bumpMap: clothTex,
    bumpScale: 0.014,
    roughness: 0.8,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  const silverTrimMat = new THREE.MeshStandardMaterial({
    color: 0xa8b8cc,
    roughness: 0.24,
    metalness: 0.88,
  });
  const runeTabardMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    map: runeTex,
    emissive: 0x38bdf8,
    emissiveMap: runeTex,
    emissiveIntensity: 0.88,
    roughness: 0.65,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const arcaneGlowMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.25,
    roughness: 0.15,
    metalness: 0.2,
  });
  const violetGlowMat = new THREE.MeshStandardMaterial({
    color: 0x6b21a8,
    emissive: 0x9333ea,
    emissiveIntensity: 1.05,
    roughness: 0.18,
    metalness: 0.25,
  });
  const darkHairMat = new THREE.MeshStandardMaterial({
    color: 0x131124,
    roughness: 0.42,
    metalness: 0.18,
  });

  // ---- Torso & Skirt: Dark Purple Bodice, Flared Collar, Pleated Bell Robe Skirt & Glowing Rune Stole ----
  const robeGroup = new THREE.Group();
  joints.torso.add(robeGroup);

  const bodiceProfile = [
    new THREE.Vector2(0.135, 0.0),
    new THREE.Vector2(0.175, 0.18),
    new THREE.Vector2(0.2, 0.34),
    new THREE.Vector2(0.17, 0.46),
    new THREE.Vector2(0.11, 0.5),
  ];
  const bodiceGeo = new THREE.LatheGeometry(bodiceProfile, 18);
  bodiceGeo.scale(1.04, 1.0, 0.76);
  robeGroup.add(new THREE.Mesh(bodiceGeo, purpleRobeMat));

  // Silver Lapel Trim & High Flared Arcane Collar + Silver-and-Amethyst Waist Clasp
  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.32, 0.025), silverTrimMat);
    lapel.position.set(side * 0.065, 0.28, 0.145);
    lapel.rotation.z = side * -0.24;
    robeGroup.add(lapel);
  }

  const highCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.13, 0.15, 16, 1, true, Math.PI * 0.3, Math.PI * 1.4),
    purpleRobeMat
  );
  highCollar.position.set(0, 0.52, -0.02);
  robeGroup.add(highCollar);

  const waistBelt = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.022, 8, 20), silverTrimMat);
  waistBelt.rotation.x = Math.PI * 0.5;
  waistBelt.scale.set(1.06, 0.8, 1.0);
  waistBelt.position.set(0, 0.04, 0);
  robeGroup.add(waistBelt);

  const beltJewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), violetGlowMat);
  beltJewel.position.set(0, 0.04, 0.145);
  robeGroup.add(beltJewel);

  // Sweeping Floor-Length Pleated Robe Skirt + Parted Overskirt Panels (A-Line Silhouette!)
  const skirtGeo = new THREE.CylinderGeometry(0.155, 0.46, 0.88, 24, 6, false);
  const sPos = skirtGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const x = sPos.getX(i);
    const y = sPos.getY(i);
    const z = sPos.getZ(i);
    const ang = Math.atan2(z, x);
    const v = (0.44 - y) / 0.88;
    const pleat = 1 + Math.sin(ang * 10) * 0.06 * v;
    sPos.setXYZ(i, x * pleat * 1.06, y, z * pleat * 0.92);
  }
  skirtGeo.computeVertexNormals();
  const robeSkirt = new THREE.Mesh(skirtGeo, innerVioletRobeMat);
  robeSkirt.position.set(0, -0.4, 0);
  robeGroup.add(robeSkirt);

  const overSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.165, 0.48, 0.86, 20, 4, true, Math.PI * 0.22, Math.PI * 1.56),
    purpleRobeMat
  );
  overSkirt.position.set(0, -0.39, 0);
  robeGroup.add(overSkirt);

  // Glowing Bottom Robe Hem Ring + Front Glowing Rune Tabard/Stole
  const hemGlowRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.014, 8, 28), violetGlowMat);
  hemGlowRing.rotation.x = Math.PI * 0.5;
  hemGlowRing.scale.set(1.06, 0.92, 1.0);
  hemGlowRing.position.set(0, -0.83, 0);
  robeGroup.add(hemGlowRing);

  const runeStole = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.78, 4, 12), runeTabardMat);
  runeStole.position.set(0, -0.36, 0.31);
  runeStole.rotation.x = -0.22;
  robeGroup.add(runeStole);

  // ---- Headpiece: Sculpted Face, Long Flowing Dark Hair & Silver/Cyan Arcane Circlet ----
  const headGroup = new THREE.Group();
  joints.head.add(headGroup);

  const mageFace = createSculptedFaceGroup(0xfde2c8, 0x38bdf8, true);
  mageFace.position.set(0, 0.08, 0);
  headGroup.add(mageFace);

  const hairTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.135, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
    darkHairMat
  );
  hairTop.position.set(0, 0.1, -0.01);
  headGroup.add(hairTop);

  // Flowing Dark Hair Back Curtain + Front Shoulder Tresses
  const backHair = new THREE.Mesh(
    createSculptedCapeGeometry(0.24, 0.34, 0.48, 4, false),
    darkHairMat
  );
  backHair.position.set(0, 0.08, -0.1);
  headGroup.add(backHair);

  for (const side of [-1, 1]) {
    const tress = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.28, 8), darkHairMat);
    tress.position.set(side * 0.105, -0.02, 0.06);
    tress.rotation.z = side * 0.12;
    headGroup.add(tress);
  }

  // Silver Forehead Circlet + Glowing Cyan Star Jewel
  const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.01, 8, 20), silverTrimMat);
  circlet.rotation.x = Math.PI * 0.46;
  circlet.position.set(0, 0.13, 0.01);
  headGroup.add(circlet);

  const circletGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.026, 0), arcaneGlowMat);
  circletGem.position.set(0, 0.14, 0.135);
  headGroup.add(circletGem);

  // ---- Silver-and-Amethyst Shoulder Mantles, Wide Flared Wizard Sleeves & Flowing Arcane Cloak ----
  const buildMageArm = (shoulder: THREE.Group, elbow: THREE.Group, side: 1 | -1) => {
    const mantle = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      silverTrimMat
    );
    mantle.rotation.z = side * -0.42;
    shoulder.add(mantle);

    const shoulderGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 0), violetGlowMat);
    shoulderGem.position.set(side * 0.09, 0.04, 0);
    shoulder.add(shoulderGem);

    const upperSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.068, 0.25, 12),
      purpleRobeMat
    );
    upperSleeve.position.set(0, -0.13, 0);
    shoulder.add(upperSleeve);

    // Wide Flared Bell Sleeve hanging from forearm
    const bellSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.155, 0.28, 16, 1, false),
      purpleRobeMat
    );
    bellSleeve.position.set(0, -0.14, 0);
    elbow.add(bellSleeve);

    const sleeveRim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.01, 8, 18), violetGlowMat);
    sleeveRim.rotation.x = Math.PI * 0.5;
    sleeveRim.position.set(0, -0.27, 0);
    elbow.add(sleeveRim);
  };
  buildMageArm(joints.shoulderL, joints.elbowL, 1);
  buildMageArm(joints.shoulderR, joints.elbowR, -1);

  const mageCloak = new THREE.Mesh(
    createSculptedCapeGeometry(0.42, 0.86, 1.15, 6, false),
    purpleRobeMat
  );
  joints.capePivot.add(mageCloak);

  // ---- Right Hand: Tall Twisted Arcane Staff with Crescent Cradle & Glowing Blue Orb ----
  const staffGroup = new THREE.Group();
  staffGroup.rotation.set(0.46, 0.08, 0.28);
  joints.handR.add(staffGroup);

  const staffShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.018, 1.82, 10),
    silverTrimMat
  );
  staffShaft.position.set(0, 0.14, 0);
  staffGroup.add(staffShaft);

  const staffNeck = new THREE.Mesh(
    new THREE.ConeGeometry(0.055, 0.16, 10),
    silverTrimMat
  );
  staffNeck.position.set(0, 1.02, 0);
  staffGroup.add(staffNeck);

  // Spiraling Crescent Staff Head Cradle
  const cradleRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.135, 0.024, 10, 20, Math.PI * 1.55),
    silverTrimMat
  );
  cradleRing.rotation.z = Math.PI * 0.22;
  cradleRing.position.set(0, 1.16, 0);
  staffGroup.add(cradleRing);

  const staffOrb = new THREE.Mesh(new THREE.SphereGeometry(0.072, 16, 16), arcaneGlowMat);
  staffOrb.position.set(0, 1.16, 0);
  staffGroup.add(staffOrb);

  const orbHaloRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 8, 20), arcaneGlowMat);
  orbHaloRing.position.set(0, 1.16, 0);
  orbHaloRing.rotation.x = 0.65;
  staffGroup.add(orbHaloRing);

  const weaponTip = new THREE.Object3D();
  weaponTip.position.set(0, 1.24, 0);
  staffGroup.add(weaponTip);

  // ---- Left Hand: Crisp Concentric Glowing Blue Arcane Spell Rings (Matches mythosbossfightcity.jpg!) ----
  const spellRingsGroup = new THREE.Group();
  spellRingsGroup.position.set(0.08, -0.04, 0.22);
  joints.handL.add(spellRingsGroup);

  const outerSpellRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.009, 8, 32), arcaneGlowMat);
  spellRingsGroup.add(outerSpellRing);

  const midSpellRing = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.008, 8, 28), violetGlowMat);
  midSpellRing.rotation.z = Math.PI * 0.18;
  spellRingsGroup.add(midSpellRing);

  const innerSpellRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 8, 24), arcaneGlowMat);
  innerSpellRing.rotation.z = Math.PI * 0.35;
  spellRingsGroup.add(innerSpellRing);

  for (let r = 0; r < 6; r++) {
    const ang = (r / 6) * Math.PI * 2;
    const runeNode = new THREE.Mesh(new THREE.OctahedronGeometry(0.02, 0), arcaneGlowMat);
    runeNode.position.set(Math.cos(ang) * 0.245, Math.sin(ang) * 0.245, 0);
    outerSpellRing.add(runeNode);
  }

  const spellCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 0), arcaneGlowMat);
  spellRingsGroup.add(spellCore);

  const mageLight = new THREE.PointLight(0x38bdf8, 0.95, 5.2, 1.6);
  mageLight.position.set(0.1, 0.08, 0.28);
  spellRingsGroup.add(mageLight);

  // Spellcasting Stance (Left arm raised outward projecting spell rings, Right hand holding tall Orb Staff)
  const baseRestPose = {
    shoulderL: [-0.96, 0.42, 0.56] as [number, number, number],
    elbowL: [-0.32, 0, 0] as [number, number, number],
    shoulderR: [-0.48, -0.22, -0.32] as [number, number, number],
    elbowR: [-0.46, 0, 0] as [number, number, number],
    torsoY: 0.12,
  };
  joints.shoulderL.rotation.set(...baseRestPose.shoulderL);
  joints.elbowL.rotation.set(...baseRestPose.elbowL);
  joints.shoulderR.rotation.set(...baseRestPose.shoulderR);
  joints.elbowR.rotation.set(...baseRestPose.elbowR);

  enableShadowsRecursive(root);

  return {
    id: 'mage',
    root,
    joints,
    parts: {
      headpiece: headGroup,
      capeOrCloak: mageCloak,
      torsoArmorOrRobe: robeGroup,
      weapon: staffGroup,
      weaponTip,
      spellRings: spellRingsGroup,
    },
    materials: {
      primaryMetal: silverTrimMat,
      secondaryMetal: silverTrimMat,
      capeCloth: purpleRobeMat,
      emissiveAccent: arcaneGlowMat,
    },
    weaponLight: mageLight,
    baseRestPose,
  };
}

// ============================================================================
// 4 & 5. DARK KNIGHT HERO & BOSS MYTH@S (THE CRIMSON SOVEREIGN) BUILDER
//    Spiked Crimson-and-Black Plate, Horned Helm, Torn Red Cape, Glowing Red Halberd
// ============================================================================
function buildCrimsonSovereignRig(isBoss: boolean): BuiltCharacterRig {
  const scale = isBoss ? 1.64 : 1.03;
  const { root, joints } = createArticulatedJointHierarchy(scale);
  const plateTex = createProceduralSurfaceTexture('plate');
  const chainTex = createProceduralSurfaceTexture('chainmail');
  const clothTex = createProceduralSurfaceTexture('cloth');

  const obsidianPlateMat = new THREE.MeshStandardMaterial({
    color: 0x1e202c,
    roughnessMap: plateTex,
    bumpMap: plateTex,
    bumpScale: 0.016,
    roughness: 0.24,
    metalness: 0.88,
    envMapIntensity: 1.5,
  });
  const crimsonPlateMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughnessMap: plateTex,
    bumpMap: plateTex,
    bumpScale: 0.015,
    roughness: 0.26,
    metalness: 0.84,
    envMapIntensity: 1.45,
  });
  const tornCrimsonCapeMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    bumpMap: clothTex,
    bumpScale: 0.018,
    roughness: 0.88,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const crimsonScaleMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    bumpMap: chainTex,
    bumpScale: 0.025,
    roughness: 0.34,
    metalness: 0.8,
  });
  const moltenRedBladeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff2424,
    emissiveIntensity: isBoss ? 1.55 : 1.35,
    roughness: 0.16,
    metalness: 0.82,
  });

  // ---- Torso: Blackened Steel Core + Angled V-Chevron Crimson Breastplate Lames + Scale Fauld & Spiked Tassets ----
  const torsoGroup = new THREE.Group();
  joints.torso.add(torsoGroup);

  const coreProfile = [
    new THREE.Vector2(0.165, 0.0),
    new THREE.Vector2(0.22, 0.15),
    new THREE.Vector2(0.265, 0.34),
    new THREE.Vector2(0.23, 0.48),
    new THREE.Vector2(0.14, 0.54),
  ];
  const coreGeo = new THREE.LatheGeometry(coreProfile, 20);
  coreGeo.scale(isBoss ? 1.28 : 1.14, 1.0, 0.84);
  torsoGroup.add(new THREE.Mesh(coreGeo, obsidianPlateMat));

  // Interlocking Angled V-Chevron Crimson Dragon-Plate Chest Lames (Matches Dark Knight in class examples.jpg!)
  for (const side of [-1, 1]) {
    for (let r = 0; r < 4; r++) {
      const chevronLame = new THREE.Mesh(
        new THREE.BoxGeometry(isBoss ? 0.19 : 0.165, 0.052, 0.055),
        r % 2 === 0 ? crimsonPlateMat : obsidianPlateMat
      );
      chevronLame.position.set(
        side * (isBoss ? 0.105 : 0.092),
        0.13 + r * 0.082,
        0.168 + r * 0.008
      );
      chevronLame.rotation.z = side * 0.36;
      chevronLame.rotation.y = side * -0.26;
      torsoGroup.add(chevronLame);
    }
  }

  // Central Sternum Spine Ridge + Glowing Crimson Dragon-Heart Core
  const sternumSpine = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.38, 0.065),
    crimsonPlateMat
  );
  sternumSpine.position.set(0, 0.27, 0.19);
  torsoGroup.add(sternumSpine);

  const sternumCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.058, 0), moltenRedBladeMat);
  sternumCore.scale.set(0.85, 1.45, 0.45);
  sternumCore.position.set(0, 0.33, 0.22);
  torsoGroup.add(sternumCore);

  // Crimson Scale-Mail Central Fauld Tabard + Spiked Thigh Tassets
  const scaleTabard = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.38, 0.035),
    crimsonScaleMat
  );
  scaleTabard.position.set(0, -0.16, 0.165);
  scaleTabard.rotation.x = -0.12;
  torsoGroup.add(scaleTabard);

  for (const side of [-1, 1]) {
    for (let t = 0; t < 3; t++) {
      const tasset = new THREE.Mesh(
        new THREE.ConeGeometry(0.095, 0.16, 5),
        t % 2 === 0 ? crimsonPlateMat : obsidianPlateMat
      );
      tasset.rotation.z = Math.PI + side * 0.22;
      tasset.position.set(side * 0.165, -0.04 - t * 0.085, 0.11 - t * 0.01);
      torsoGroup.add(tasset);
    }
  }

  // ---- Headpiece: Spiked Crimson-and-Black Horned Sovereign Greathelm + Glowing Red Visor ----
  const helmGroup = new THREE.Group();
  joints.head.add(helmGroup);

  const helmSkull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.145, 0.27, 16),
    obsidianPlateMat
  );
  helmSkull.position.set(0, 0.08, 0);
  helmGroup.add(helmSkull);

  // Jagged Crimson Faceplate Mask + Glowing Crimson V-Visor Slits
  const faceplate = new THREE.Mesh(new THREE.ConeGeometry(0.135, 0.24, 6), crimsonPlateMat);
  faceplate.rotation.x = Math.PI;
  faceplate.position.set(0, 0.06, 0.045);
  helmGroup.add(faceplate);

  for (const side of [-1, 1]) {
    const eyeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.018, 0.03), moltenRedBladeMat);
    eyeSlit.position.set(side * 0.048, 0.1, 0.138);
    eyeSlit.rotation.z = side * -0.28;
    helmGroup.add(eyeSlit);
  }

  // Central Jagged Crown Spike + Swept Dragon Horns (4 Horns on Boss Myth@s, 2 Main + 2 Cheek on Dark Knight)
  const centerCrownHorn = new THREE.Mesh(
    createSweptHornGeometry(0.034, isBoss ? 0.3 : 0.24, 0, isBoss ? 0.3 : 0.24, -0.05),
    crimsonPlateMat
  );
  centerCrownHorn.position.set(0, 0.19, 0.06);
  helmGroup.add(centerCrownHorn);

  for (const side of [-1, 1]) {
    const mainHorn = new THREE.Mesh(
      createSweptHornGeometry(
        isBoss ? 0.046 : 0.038,
        isBoss ? 0.42 : 0.34,
        side * (isBoss ? 0.24 : 0.18),
        isBoss ? 0.42 : 0.34,
        -0.12
      ),
      crimsonPlateMat
    );
    mainHorn.position.set(side * 0.1, 0.16, 0);
    helmGroup.add(mainHorn);

    const lowerHorn = new THREE.Mesh(
      createSweptHornGeometry(
        0.028,
        isBoss ? 0.26 : 0.19,
        side * (isBoss ? 0.22 : 0.15),
        isBoss ? 0.2 : 0.15,
        0.04
      ),
      obsidianPlateMat
    );
    lowerHorn.position.set(side * 0.11, 0.08, 0.03);
    helmGroup.add(lowerHorn);
  }

  // ---- Multi-Tiered Spiked Pauldrons, Vambraces & Clawed Greaves ----
  const buildSpikedArm = (shoulder: THREE.Group, elbow: THREE.Group, side: 1 | -1) => {
    for (let p = 0; p < 3; p++) {
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.15 - p * 0.014, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
        p % 2 === 0 ? crimsonPlateMat : obsidianPlateMat
      );
      pauldron.position.set(side * (0.03 + p * 0.018), 0.06 - p * 0.048, 0);
      pauldron.rotation.z = side * (-0.42 - p * 0.14);
      shoulder.add(pauldron);
    }

    // Swept Demonic Pauldron Spikes
    const spikeCount = isBoss ? 3 : 2;
    for (let s = 0; s < spikeCount; s++) {
      const pSpike = new THREE.Mesh(
        createSweptHornGeometry(
          0.032,
          isBoss ? 0.26 - s * 0.04 : 0.2 - s * 0.03,
          side * (0.16 + s * 0.05),
          0.2,
          (s - 0.5) * 0.06
        ),
        crimsonPlateMat
      );
      pSpike.position.set(side * (0.08 + s * 0.03), 0.06 - s * 0.03, 0);
      shoulder.add(pSpike);
    }

    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.062, 0.26, 12),
      obsidianPlateMat
    );
    upperArm.position.set(0, -0.14, 0);
    shoulder.add(upperArm);

    const vambrace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.056, 0.25, 12),
      crimsonPlateMat
    );
    vambrace.position.set(0, -0.13, 0.01);
    elbow.add(vambrace);

    const gauntletSpike = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.14, 5), obsidianPlateMat);
    gauntletSpike.position.set(side * 0.065, -0.12, 0);
    gauntletSpike.rotation.z = side * -0.55;
    elbow.add(gauntletSpike);
  };
  buildSpikedArm(joints.shoulderL, joints.elbowL, 1);
  buildSpikedArm(joints.shoulderR, joints.elbowR, -1);

  const buildSpikedLeg = (hip: THREE.Group, knee: THREE.Group, side: 1 | -1) => {
    const cuisse = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.086, 0.42, 14),
      obsidianPlateMat
    );
    cuisse.position.set(0, -0.22, 0);
    hip.add(cuisse);

    // Articulated Crimson Thigh Lames over Obsidian Cuisse
    for (let cl = 0; cl < 3; cl++) {
      const thighPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.065, 0.09),
        crimsonPlateMat
      );
      thighPlate.position.set(side * 0.015, -0.12 - cl * 0.09, 0.055);
      thighPlate.rotation.z = side * -0.18;
      hip.add(thighPlate);
    }

    const kneeSpike = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.22, 5), crimsonPlateMat);
    kneeSpike.position.set(0, 0.02, 0.08);
    kneeSpike.rotation.x = 0.45;
    knee.add(kneeSpike);

    const greave = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.068, 0.42, 14),
      obsidianPlateMat
    );
    greave.position.set(0, -0.22, 0);
    knee.add(greave);

    const shinGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.36, 0.065),
      crimsonPlateMat
    );
    shinGuard.position.set(0, -0.22, 0.055);
    knee.add(shinGuard);

    const sabaton = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.26, 5), crimsonPlateMat);
    sabaton.rotation.x = Math.PI * 0.48;
    sabaton.position.set(side * 0.01, -0.44, 0.06);
    knee.add(sabaton);
  };
  buildSpikedLeg(joints.hipL, joints.kneeL, 1);
  buildSpikedLeg(joints.hipR, joints.kneeR, -1);

  // ---- Tattered / Torn Crimson Sovereign Cape ----
  const tornCapeMesh = new THREE.Mesh(
    createSculptedCapeGeometry(
      isBoss ? 0.56 : 0.46,
      isBoss ? 1.12 : 0.9,
      isBoss ? 1.24 : 1.16,
      isBoss ? 7 : 5,
      true
    ),
    tornCrimsonCapeMat
  );
  joints.capePivot.add(tornCapeMesh);

  // ---- Glowing Red War-Halberd (Crescent Executioner Axe Blade + Top Pike Spike + Back Fluke) ----
  const halberdGroup = new THREE.Group();
  joints.handR.add(halberdGroup);

  const shaftLength = isBoss ? 2.15 : 1.95;
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.024, shaftLength, 12),
    obsidianPlateMat
  );
  shaft.position.set(0, 0.24, 0);
  halberdGroup.add(shaft);

  const headY = 0.24 + shaftLength * 0.42;
  const halberdHeadGroup = new THREE.Group();
  halberdHeadGroup.position.set(0, headY, 0);
  halberdGroup.add(halberdHeadGroup);

  // Crescent Executioner Axe Blade (Extruded with glowing molten red edge bevel!)
  const axeShape = new THREE.Shape();
  axeShape.moveTo(0, -0.14);
  axeShape.lineTo(0.12, -0.08);
  axeShape.quadraticCurveTo(0.28, -0.22, 0.24, -0.38);
  axeShape.quadraticCurveTo(0.38, -0.04, 0.34, 0.28);
  axeShape.quadraticCurveTo(0.2, 0.12, 0.11, 0.11);
  axeShape.lineTo(0, 0.14);
  axeShape.closePath();

  const axeBladeGeo = new THREE.ExtrudeGeometry(axeShape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.014,
    bevelThickness: 0.012,
  });
  const axeBladeMesh = new THREE.Mesh(axeBladeGeo, [obsidianPlateMat, moltenRedBladeMat]);
  axeBladeMesh.position.set(0, 0, -0.012);
  halberdHeadGroup.add(axeBladeMesh);

  // Rear Fluke Hook / Counter-Blade
  const flukeShape = new THREE.Shape();
  flukeShape.moveTo(0, 0.12);
  flukeShape.quadraticCurveTo(-0.26, 0.18, -0.34, -0.08);
  flukeShape.quadraticCurveTo(-0.18, -0.02, 0, -0.1);
  flukeShape.closePath();
  const flukeGeo = new THREE.ExtrudeGeometry(flukeShape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.01,
    bevelThickness: 0.01,
  });
  const flukeMesh = new THREE.Mesh(flukeGeo, [crimsonPlateMat, moltenRedBladeMat]);
  flukeMesh.position.set(0, 0, -0.01);
  halberdHeadGroup.add(flukeMesh);

  // Top Spear Pike Tip
  const pikeTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.048, isBoss ? 0.52 : 0.42, 6),
    moltenRedBladeMat
  );
  pikeTip.position.set(0, isBoss ? 0.36 : 0.3, 0);
  halberdHeadGroup.add(pikeTip);

  // Pommel Spike
  const pommelSpike = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.22, 6), moltenRedBladeMat);
  pommelSpike.rotation.x = Math.PI;
  pommelSpike.position.set(0, 0.24 - shaftLength * 0.52, 0);
  halberdGroup.add(pommelSpike);

  const weaponTip = new THREE.Object3D();
  weaponTip.position.set(0, headY + 0.35, 0);
  halberdGroup.add(weaponTip);

  const halberdLight = new THREE.PointLight(
    0xff2424,
    isBoss ? 2.1 : 1.45,
    isBoss ? 7.5 : 5.2,
    1.5
  );
  halberdLight.position.set(0.25, headY, 0.15);
  halberdGroup.add(halberdLight);

  // Imposing Halberd Stance: Boss holds halberd angled outward on his right so full blade & helm silhouette read cleanly below HUD!
  if (isBoss) {
    halberdGroup.rotation.set(0.28, 0.12, -0.38);
  } else {
    halberdGroup.rotation.set(0.35, 0.1, -0.24);
  }

  const baseRestPose = isBoss
    ? {
        shoulderL: [-0.45, 0.28, 0.38] as [number, number, number],
        elbowL: [-0.52, 0.18, 0.0] as [number, number, number],
        shoulderR: [-0.46, -0.22, -0.44] as [number, number, number],
        elbowR: [-0.38, 0.0, -0.12] as [number, number, number],
        torsoY: 0.12,
      }
    : {
        shoulderL: [-0.52, 0.22, 0.28] as [number, number, number],
        elbowL: [-0.58, 0.15, 0.0] as [number, number, number],
        shoulderR: [-0.68, -0.18, -0.32] as [number, number, number],
        elbowR: [-0.45, 0.0, 0.0] as [number, number, number],
        torsoY: 0.12,
      };

  joints.shoulderL.rotation.set(...baseRestPose.shoulderL);
  joints.elbowL.rotation.set(...baseRestPose.elbowL);
  joints.shoulderR.rotation.set(...baseRestPose.shoulderR);
  joints.elbowR.rotation.set(...baseRestPose.elbowR);
  joints.hipL.rotation.set(-0.14, 0, 0.12);
  joints.kneeL.rotation.set(0.2, 0, 0);
  joints.hipR.rotation.set(0.14, 0, -0.12);
  joints.kneeR.rotation.set(0.16, 0, 0);

  enableShadowsRecursive(root);

  return {
    id: isBoss ? 'mythos-boss' : 'dark-knight',
    root,
    joints,
    parts: {
      headpiece: helmGroup,
      capeOrCloak: tornCapeMesh,
      torsoArmorOrRobe: torsoGroup,
      weapon: halberdGroup,
      weaponTip,
    },
    materials: {
      primaryMetal: obsidianPlateMat,
      secondaryMetal: crimsonPlateMat,
      capeCloth: tornCrimsonCapeMat,
      emissiveAccent: moltenRedBladeMat,
    },
    weaponLight: halberdLight,
    baseRestPose,
  };
}

/**
 * Builds any of the four hero classes (`knight`, `elf-archer`, `mage`, `dark-knight`).
 */
export function buildHeroCharacterRig(classId: HeroClassId): BuiltCharacterRig {
  switch (classId) {
    case 'knight':
      return buildKnightHero();
    case 'elf-archer':
      return buildElfArcherHero();
    case 'mage':
      return buildMageHero();
    case 'dark-knight':
      return buildCrimsonSovereignRig(false);
  }
}

/**
 * Builds the Boss (`Myth@s, the Crimson Sovereign`) as the largest figure in the scene.
 */
export function buildMythosBossRig(): BuiltCharacterRig {
  return buildCrimsonSovereignRig(true);
}

/**
 * Measures the world-space bounding box and triangle count of a built character rig.
 */
export function measureRigBounds(root: THREE.Object3D): {
  height: number;
  width: number;
  depth: number;
  triangles: number;
} {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);

  let triangles = 0;
  root.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      const geo = (c as THREE.Mesh).geometry;
      if (geo.index) {
        triangles += geo.index.count / 3;
      } else if (geo.attributes.position) {
        triangles += geo.attributes.position.count / 3;
      }
    }
  });

  return {
    height: size.y,
    width: size.x,
    depth: size.z,
    triangles: Math.round(triangles),
  };
}

/**
 * Updates breathing, cape billowing, spell-ring rotation, bow poise, and combat swing animations
 * deterministically at 60 FPS.
 */
export function updateCharacterRigAnimation(
  rig: BuiltCharacterRig,
  timeSec: number,
  _dt: number,
  swingAngleRad = 0
): void {
  const phaseOffset =
    rig.id === 'knight'
      ? 0.0
      : rig.id === 'elf-archer'
      ? 1.2
      : rig.id === 'mage'
      ? 2.4
      : rig.id === 'dark-knight'
      ? 3.6
      : 0.7;

  const breath = Math.sin(timeSec * 2.4 + phaseOffset) * 0.018;
  rig.joints.torso.position.y = rig.baseRestPose.torsoY + breath;

  // Subtle cape billow in the wind
  rig.joints.capePivot.rotation.x = 0.08 + Math.sin(timeSec * 3.1 + phaseOffset) * 0.05;
  rig.joints.capePivot.rotation.y = Math.cos(timeSec * 2.2 + phaseOffset) * 0.03;

  // Class-specific motion
  if (rig.id === 'mage' && rig.parts.spellRings) {
    rig.parts.spellRings.children.forEach((child, idx) => {
      child.rotation.z = timeSec * (idx % 2 === 0 ? 1.8 : -2.4);
    });
    rig.joints.shoulderL.rotation.x =
      rig.baseRestPose.shoulderL[0] + Math.sin(timeSec * 2.6) * 0.08;
  } else if (rig.id === 'elf-archer') {
    rig.joints.shoulderR.rotation.x =
      rig.baseRestPose.shoulderR[0] + Math.sin(timeSec * 2.0 + 0.5) * 0.05;
  } else {
    rig.joints.shoulderR.rotation.x =
      rig.baseRestPose.shoulderR[0] - swingAngleRad * 0.65 + Math.sin(timeSec * 2.2 + phaseOffset) * 0.06;
    rig.joints.shoulderR.rotation.y =
      rig.baseRestPose.shoulderR[1] + swingAngleRad * 0.45;
  }
}
