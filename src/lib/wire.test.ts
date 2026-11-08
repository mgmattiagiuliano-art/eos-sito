import { describe, expect, it } from 'vitest';
import { reachedNodes, serpentinePath } from './wire';

describe('serpentinePath', () => {
  it('passa per ogni punto (estremi di ciascun tratto)', () => {
    const pts = [
      { x: 40, y: 100 },
      { x: 960, y: 780 },
      { x: 40, y: 1500 },
    ];
    const d = serpentinePath(pts);
    expect(d.startsWith('M 40,100')).toBe(true);
    expect(d).toContain('C 40,440 960,440 960,780');
    expect(d.endsWith('40,1500')).toBe(true);
  });

  it('nessun punto → path vuoto', () => expect(serpentinePath([])).toBe(''));
});

describe('reachedNodes', () => {
  it('attiva i nodi entro la lunghezza disegnata', () => {
    expect(reachedNodes([0, 100, 250], 120)).toEqual([true, true, false]);
    expect(reachedNodes([0, 100, 250], 250)).toEqual([true, true, true]);
  });
});
