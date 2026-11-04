/**
 * Keyboard helpers shared by the dock tabs and the model switcher menu.
 * Pure functions so the keyboard order can be tested without a browser.
 */

export type Orientation = 'horizontal' | 'vertical' | 'both';

/**
 * Where focus goes in a roving-tabindex group after a key press, or null
 * when the key is not a navigation key. Wraps at both ends.
 */
export function rovingIndex(key: string, index: number, count: number, orientation: Orientation = 'both'): number | null {
  if (count <= 0) return null;
  const prev = orientation === 'horizontal' ? ['ArrowLeft'] : orientation === 'vertical' ? ['ArrowUp'] : ['ArrowLeft', 'ArrowUp'];
  const next = orientation === 'horizontal' ? ['ArrowRight'] : orientation === 'vertical' ? ['ArrowDown'] : ['ArrowRight', 'ArrowDown'];
  if (next.includes(key)) return (index + 1) % count;
  if (prev.includes(key)) return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

/** Stable DOM id fragment from any string. */
export function idFragment(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
}
