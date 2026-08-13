import { describe, expect, it } from 'vitest';

import { computeStats, type RideWithCoaster } from '@/lib/rides';

function coaster(id: string, over: Partial<RideWithCoaster['coasters']> = {}) {
  return {
    id,
    name: `Coaster ${id}`,
    park: 'Park',
    country: 'United Kingdom',
    manufacturer: 'Intamin',
    type: 'Steel',
    active: true,
    ...over,
  } as NonNullable<RideWithCoaster['coasters']>;
}

function ride(id: string, coasterId: string, over: Partial<RideWithCoaster> = {}) {
  return {
    id,
    ridden_on: '2026-01-01',
    note: null,
    coaster_id: coasterId,
    coasters: coaster(coasterId),
    ...over,
  } as RideWithCoaster;
}

describe('computeStats', () => {
  it('returns an empty shape with no rides', () => {
    const stats = computeStats([]);
    expect(stats.credits).toBe(0);
    expect(stats.totalRides).toBe(0);
    expect(stats.mostRidden).toBeNull();
    expect(stats.byCountry).toEqual([]);
  });

  it('counts credits as distinct coasters and rides as every entry', () => {
    // Three rides, two coasters: the repeat must not add a credit (R-009).
    const stats = computeStats([ride('r1', 'a'), ride('r2', 'b'), ride('r3', 'a')]);
    expect(stats.credits).toBe(2);
    expect(stats.totalRides).toBe(3);
  });

  it('does not let repeat rides inflate the attribute breakdowns', () => {
    const stats = computeStats([
      ride('r1', 'a'),
      ride('r2', 'a'),
      ride('r3', 'a'),
      ride('r4', 'b'),
    ]);
    // Two distinct coasters, both United Kingdom / Intamin / Steel.
    expect(stats.byCountry).toEqual([{ label: 'United Kingdom', credits: 2 }]);
    expect(stats.byManufacturer).toEqual([{ label: 'Intamin', credits: 2 }]);
    expect(stats.byType).toEqual([{ label: 'Steel', credits: 2 }]);
  });

  it('groups distinct coasters by their attributes', () => {
    const stats = computeStats([
      ride('r1', 'a', { coasters: coaster('a', { country: 'Germany', type: 'Wooden' }) }),
      ride('r2', 'b', { coasters: coaster('b', { country: 'Germany', type: 'Steel' }) }),
      ride('r3', 'c', { coasters: coaster('c', { country: 'Japan', type: 'Steel' }) }),
    ]);

    expect(stats.byCountry).toEqual([
      { label: 'Germany', credits: 2 },
      { label: 'Japan', credits: 1 },
    ]);
    expect(stats.byType).toEqual([
      { label: 'Steel', credits: 2 },
      { label: 'Wooden', credits: 1 },
    ]);
  });

  it('identifies the most-ridden coaster by total ride rows', () => {
    const stats = computeStats([
      ride('r1', 'a'),
      ride('r2', 'b'),
      ride('r3', 'b'),
      ride('r4', 'b'),
    ]);
    expect(stats.mostRidden).toEqual({ name: 'Coaster b', park: 'Park', rides: 3 });
  });

  it('keeps counting rides against retired coasters', () => {
    // Retirement removes a coaster from browsing, never from its owner's
    // statistics (R-014).
    const stats = computeStats([
      ride('r1', 'a', { coasters: coaster('a', { active: false }) }),
      ride('r2', 'b'),
    ]);
    expect(stats.credits).toBe(2);
    expect(stats.totalRides).toBe(2);
    expect(stats.byCountry).toEqual([{ label: 'United Kingdom', credits: 2 }]);
  });
});
