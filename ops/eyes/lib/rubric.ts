/**
 * Eyes gate — rubric qualities (founder's order) and the pass rule.
 * Pass: average 4.0 or better, no quality below 3, honesty and originality both 4 or better.
 */

export const QUALITIES = [
  { key: 'layout', label: 'Layout match' },
  { key: 'palette', label: 'Palette and mood' },
  { key: 'type', label: 'Type' },
  { key: 'contrast', label: 'Contrast and legibility' },
  { key: 'honesty', label: 'Honesty' },
  { key: 'originality', label: 'Originality' },
  { key: 'tribute', label: 'Tribute' },
] as const;

export type QualityKey = (typeof QUALITIES)[number]['key'];
export type Scores = Record<QualityKey, number>;

export const labelOf = (key: QualityKey): string =>
  QUALITIES.find((q) => q.key === key)?.label ?? key;

export interface Verdict {
  pass: boolean;
  average: number;
  sum: number;
  lowest: { key: QualityKey; score: number };
  failures: string[];
}

export function applyPassRule(scores: Scores): Verdict {
  const keys = QUALITIES.map((q) => q.key);
  const sum = keys.reduce((acc, k) => acc + scores[k], 0);
  const average = Math.round((sum / keys.length) * 100) / 100;
  let lowest = { key: keys[0] as QualityKey, score: scores[keys[0]] };
  for (const k of keys) if (scores[k] < lowest.score) lowest = { key: k, score: scores[k] };

  const failures: string[] = [];
  // Integer comparison avoids float drift: average >= 4.0  <=>  sum >= 4 * count.
  if (sum < 4 * keys.length) failures.push(`average ${average.toFixed(2)} is below 4.0`);
  for (const k of keys) {
    if (scores[k] < 3) failures.push(`${labelOf(k)} scored ${scores[k]}, below the floor of 3`);
  }
  if (scores.honesty < 4) failures.push(`Honesty scored ${scores.honesty}; it must be 4 or better`);
  if (scores.originality < 4) failures.push(`Originality scored ${scores.originality}; it must be 4 or better`);

  return { pass: failures.length === 0, average, sum, lowest, failures };
}
