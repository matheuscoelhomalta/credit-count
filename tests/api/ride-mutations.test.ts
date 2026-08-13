import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { admin, enthusiast, otherUser, type Identity } from './helpers';

// Ticket 03: everything that must stay impossible once rides exist —
// reassignment, foreign mutation, bulk mutation, and invalid coaster targets.

let owner: Identity;
let other: Identity;
let administrator: Identity;

let activeCoasterId: string;
let secondActiveCoasterId: string;
let retiredCoasterId: string;
let rideId: string;

const RETIRED_FIXTURE = {
  name: 'Retired Fixture',
  park: 'Verification Park',
  country: 'Testland',
  manufacturer: 'Fixture Works',
  type: 'Steel',
};

beforeAll(async () => {
  [owner, other, administrator] = await Promise.all([
    enthusiast(),
    otherUser(),
    admin(),
  ]);

  const { data: actives } = await owner.client
    .from('coasters')
    .select('id')
    .eq('active', true)
    .order('name')
    .limit(2);
  activeCoasterId = actives![0].id;
  secondActiveCoasterId = actives![1].id;

  // A retired coaster to target. Reused across runs because no role may delete.
  const inserted = await administrator.client
    .from('coasters')
    .insert(RETIRED_FIXTURE)
    .select('id')
    .single();

  if (inserted.error) {
    expect(inserted.error.code).toBe('23505');
    const existing = await administrator.client
      .from('coasters')
      .select('id')
      .eq('name', RETIRED_FIXTURE.name)
      .eq('park', RETIRED_FIXTURE.park)
      .single();
    retiredCoasterId = existing.data!.id;
  } else {
    retiredCoasterId = inserted.data.id;
  }

  await administrator.client
    .from('coasters')
    .update({ active: false })
    .eq('id', retiredCoasterId);

  const { data: created, error } = await owner.client
    .from('rides')
    .insert({ coaster_id: activeCoasterId, ridden_on: '2026-02-10', note: 'original' })
    .select('id')
    .single();
  if (error || !created) throw new Error(`Could not seed ride: ${error?.message}`);
  rideId = created.id;
});

afterAll(async () => {
  await owner.client.from('rides').delete().eq('id', rideId);
});

describe('only date and note are editable by the owner', () => {
  it('allows editing the date and note', async () => {
    const { data, error } = await owner.client
      .from('rides')
      .update({ ridden_on: '2026-02-11', note: 'edited' })
      .eq('id', rideId)
      .select('ridden_on, note')
      .single();

    expect(error).toBeNull();
    expect(data).toEqual({ ridden_on: '2026-02-11', note: 'edited' });
  });

  it('refuses to reassign the coaster', async () => {
    const { error } = await owner.client
      .from('rides')
      .update({ coaster_id: secondActiveCoasterId })
      .eq('id', rideId);
    expect(error).not.toBeNull();

    const { data } = await owner.client
      .from('rides')
      .select('coaster_id')
      .eq('id', rideId)
      .single();
    expect(data?.coaster_id).toBe(activeCoasterId);
  });

  it('refuses to reassign ownership', async () => {
    const { error } = await owner.client
      .from('rides')
      .update({ user_id: other.userId })
      .eq('id', rideId);
    expect(error).not.toBeNull();
  });
});

describe('foreign and bulk mutation are denied', () => {
  it('a foreign update changes nothing', async () => {
    const { data, error } = await other.client
      .from('rides')
      .update({ note: 'hijacked' })
      .eq('id', rideId)
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(0);

    const { data: check } = await owner.client
      .from('rides')
      .select('note')
      .eq('id', rideId)
      .single();
    expect(check?.note).not.toBe('hijacked');
  });

  it('an unfiltered bulk update cannot reach another user’s rides', async () => {
    // neq on a impossible id makes this match "everything the caller can see".
    const { data, error } = await other.client
      .from('rides')
      .update({ note: 'bulk' })
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    expect(error).toBeNull();
    expect((data ?? []).map((r) => r.id)).not.toContain(rideId);
  });

  it('an unfiltered bulk delete cannot reach another user’s rides', async () => {
    await other.client
      .from('rides')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    await administrator.client
      .from('rides')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    const { data } = await owner.client.from('rides').select('id').eq('id', rideId);
    expect(data).toHaveLength(1);
  });
});

describe('invalid coaster associations are rejected', () => {
  it('rejects a ride against a nonexistent coaster', async () => {
    const { error } = await owner.client.from('rides').insert({
      coaster_id: '00000000-0000-0000-0000-000000000000',
      ridden_on: '2026-02-12',
    });
    expect(error).not.toBeNull();
  });

  it('rejects a new ride against a retired coaster', async () => {
    const { error } = await owner.client
      .from('rides')
      .insert({ coaster_id: retiredCoasterId, ridden_on: '2026-02-12' });
    expect(error).not.toBeNull();
  });

  it('rejects a future ride date', async () => {
    const { error } = await owner.client
      .from('rides')
      .insert({ coaster_id: activeCoasterId, ridden_on: '2099-01-01' });
    expect(error).not.toBeNull();
  });
});

describe('history against a retired coaster survives retirement', () => {
  it('stays visible and keeps its date and note editable', async () => {
    // Log against an active coaster, then retire that coaster underneath it.
    const { data: created, error: insertError } = await owner.client
      .from('rides')
      .insert({ coaster_id: activeCoasterId, ridden_on: '2026-02-13', note: 'before' })
      .select('id')
      .single();
    expect(insertError).toBeNull();

    const survivorId = created!.id;
    const restoreActive = async () =>
      administrator.client
        .from('coasters')
        .update({ active: true })
        .eq('id', activeCoasterId);

    try {
      await administrator.client
        .from('coasters')
        .update({ active: false })
        .eq('id', activeCoasterId);

      const { data: visible } = await owner.client
        .from('rides')
        .select('id, note, coasters(active)')
        .eq('id', survivorId)
        .single();
      expect(visible?.id).toBe(survivorId);

      // R-008: the owner may still correct date and note after retirement.
      const { data: edited, error: editError } = await owner.client
        .from('rides')
        .update({ ridden_on: '2026-02-14', note: 'after' })
        .eq('id', survivorId)
        .select('ridden_on, note')
        .single();
      expect(editError).toBeNull();
      expect(edited).toEqual({ ridden_on: '2026-02-14', note: 'after' });

      // But no new ride may target it while retired.
      const { error: blocked } = await owner.client
        .from('rides')
        .insert({ coaster_id: activeCoasterId, ridden_on: '2026-02-15' });
      expect(blocked).not.toBeNull();
    } finally {
      await restoreActive();
      await owner.client.from('rides').delete().eq('id', survivorId);
    }
  });
});
