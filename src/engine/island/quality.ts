/**
 * Island test scene — quality tiers. Low must run on integrated graphics.
 * Tiers only change resolution, density and post effects. They never move,
 * add or remove world content that affects gameplay (persistence rule).
 */
export type TierName = 'low' | 'medium' | 'high' | 'ultra';

export interface QualityTier {
  name: TierName;
  label: string;
  /** Internal render resolution relative to the canvas CSS size * devicePixelRatio cap. */
  renderScale: number;
  maxDpr: number;
  terrainRes: number;
  shadowMapSize: number;
  /** 1 = single hardware-compare tap, 4/9/16 = PCF kernel taps. */
  shadowTaps: number;
  shadowRange: number;
  treeCount: number;
  grassCount: number;
  grassDistance: number;
  rockCount: number;
  /** 0 = sky-only reflections, 1 = planar reflection at half res, 2 = planar at full res. */
  reflections: 0 | 1 | 2;
  refraction: boolean;
  caustics: boolean;
  detailNormals: boolean;
  bloom: boolean;
  sunShaftSamples: number;
  treeLodDistance: number;
  sphereDetail: number;
}

export const TIERS: Record<TierName, QualityTier> = {
  low: {
    name: 'low', label: 'Low (integrated graphics)',
    renderScale: 0.67, maxDpr: 1, terrainRes: 200, shadowMapSize: 1024, shadowTaps: 1, shadowRange: 45,
    treeCount: 140, grassCount: 9_000, grassDistance: 28, rockCount: 60,
    reflections: 0, refraction: true, caustics: false, detailNormals: false, bloom: false,
    sunShaftSamples: 0, treeLodDistance: 35, sphereDetail: 0,
  },
  medium: {
    name: 'medium', label: 'Medium',
    renderScale: 0.85, maxDpr: 1, terrainRes: 300, shadowMapSize: 2048, shadowTaps: 4, shadowRange: 60,
    treeCount: 280, grassCount: 45_000, grassDistance: 45, rockCount: 100,
    reflections: 0, refraction: true, caustics: true, detailNormals: true, bloom: true,
    sunShaftSamples: 24, treeLodDistance: 60, sphereDetail: 1,
  },
  high: {
    name: 'high', label: 'High',
    renderScale: 1, maxDpr: 1.25, terrainRes: 420, shadowMapSize: 2048, shadowTaps: 9, shadowRange: 70,
    treeCount: 420, grassCount: 110_000, grassDistance: 65, rockCount: 140,
    reflections: 1, refraction: true, caustics: true, detailNormals: true, bloom: true,
    sunShaftSamples: 40, treeLodDistance: 90, sphereDetail: 2,
  },
  ultra: {
    name: 'ultra', label: 'Ultra',
    renderScale: 1, maxDpr: 2, terrainRes: 560, shadowMapSize: 4096, shadowTaps: 16, shadowRange: 80,
    treeCount: 520, grassCount: 220_000, grassDistance: 95, rockCount: 140,
    reflections: 2, refraction: true, caustics: true, detailNormals: true, bloom: true,
    sunShaftSamples: 64, treeLodDistance: 140, sphereDetail: 2,
  },
};

export const TIER_ORDER: TierName[] = ['low', 'medium', 'high', 'ultra'];

export function parseTier(value: string | null | undefined): TierName {
  const v = (value || '').toLowerCase();
  return (TIER_ORDER as string[]).includes(v) ? (v as TierName) : 'high';
}
