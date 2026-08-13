import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  admin,
  anonClient,
  deniedRead,
  enthusiast,
  otherUser,
  type Identity,
} from './helpers';

// Ticket 01 baseline: the anonymous / owner / other-user / admin access matrix,
// exercised through the real Data API rather than the UI. Feature-specific cases
// (statistics, leaderboard RPC, catalogue retirement) are added by later tickets.

let owner: Identity;
let other: Identity;
let administrator: Identity;
let activeCoasterId: string | null = null;

beforeAll(async () => {
  [owner, other, administrator] = await Promise.all([
    enthusiast(),
    otherUser(),
    admin(),
  ]);

  const { data } = await owner.client
    .from('coasters')
    .select('id')
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  activeCoasterId = data?.id ?? null;
});

describe('anonymous callers have no base-table access', () => {
  // Asserted as an explicit privilege error rather than merely "no rows": anon
  // holds no grant at all, so denial must happen before RLS is consulted. An
  // empty result would be a weaker guarantee and would pass vacuously on an
  // empty table.
  it.each(['profiles', 'coasters', 'rides'])(
    'is refused permission on %s',
    async (table) => {
      const { error } = await anonClient().from(table).select('*');
      expect(error?.code).toBe('42501');
    },
  );

  it('cannot insert a ride', async () => {
    const { error } = await anonClient()
      .from('rides')
      .insert({ coaster_id: activeCoasterId, ridden_on: '2026-01-01' });
    expect(error).not.toBeNull();
  });

  it('cannot insert a coaster', async () => {
    const { error } = await anonClient().from('coasters').insert({
      name: 'Anonymous Intrusion',
      park: 'Nowhere',
      country: 'Nowhere',
      manufacturer: 'Nobody',
      type: 'Steel',
    });
    expect(error).not.toBeNull();
  });
});

describe('profiles are private and default to leaderboard opt-out', () => {
  it('exposes only the caller’s own profile', async () => {
    const { data, error } = await owner.client
      .from('profiles')
      .select('user_id, display_name, leaderboard_opt_in');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].user_id).toBe(owner.userId);
  });

  it('hides another user’s profile', async () => {
    const result = await other.client
      .from('profiles')
      .select('*')
      .eq('user_id', owner.userId);
    expect(deniedRead(result)).toBe(true);
  });

  it('cannot update another user’s profile', async () => {
    const { data, error } = await other.client
      .from('profiles')
      .update({ display_name: 'Hijacked' })
      .eq('user_id', owner.userId)
      .select();

    // RLS filters the row out, so this is a no-op rather than an error.
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

describe('ride ownership cannot be forged', () => {
  it('rejects a ride inserted with a foreign user_id', async () => {
    // user_id is withheld from the INSERT column grant, so PostgREST must refuse
    // the column outright rather than silently defaulting it to auth.uid().
    const { error } = await owner.client.from('rides').insert({
      user_id: other.userId,
      coaster_id: activeCoasterId,
      ridden_on: '2026-01-01',
    });
    expect(error).not.toBeNull();
  });

  it('defaults a ride to the caller when user_id is omitted', async () => {
    expect(activeCoasterId).not.toBeNull();

    const { data, error } = await owner.client
      .from('rides')
      .insert({ coaster_id: activeCoasterId, ridden_on: '2026-01-01' })
      .select('id, user_id')
      .single();

    expect(error).toBeNull();
    expect(data?.user_id).toBe(owner.userId);

    if (data?.id) {
      await owner.client.from('rides').delete().eq('id', data.id);
    }
  });

  describe('with a real ride owned by the enthusiast', () => {
    // Isolation assertions are meaningless against an empty table: "no rows
    // returned" would pass even if foreign reads were wide open. A ride must
    // exist for the whole block, and the owner must be able to see it, before
    // another identity's empty result proves anything.
    let seededRideId: string;

    beforeAll(async () => {
      const { data, error } = await owner.client
        .from('rides')
        .insert({
          coaster_id: activeCoasterId,
          ridden_on: '2026-02-02',
          note: 'isolation fixture',
        })
        .select('id')
        .single();

      if (error || !data) {
        throw new Error(`Could not seed isolation ride: ${error?.message}`);
      }
      seededRideId = data.id;
    });

    afterAll(async () => {
      if (seededRideId) {
        await owner.client.from('rides').delete().eq('id', seededRideId);
      }
    });

    it('lets the owner read their own ride (positive control)', async () => {
      const { data, error } = await owner.client
        .from('rides')
        .select('id, note')
        .eq('id', seededRideId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0].note).toBe('isolation fixture');
    });

    it('hides that ride from another enthusiast', async () => {
      const result = await other.client.from('rides').select('*').eq('id', seededRideId);
      expect(deniedRead(result)).toBe(true);
    });

    it('hides that ride from an administrator', async () => {
      const result = await administrator.client
        .from('rides')
        .select('*')
        .eq('id', seededRideId);
      expect(deniedRead(result)).toBe(true);
    });

    it('shows an unfiltered select nothing of the owner’s rides to others', async () => {
      // Without the id filter: neither identity may see the ride via a broad read.
      const foreign = await other.client.from('rides').select('id');
      const asAdmin = await administrator.client.from('rides').select('id');

      expect(foreign.data ?? []).not.toContainEqual({ id: seededRideId });
      expect(asAdmin.data ?? []).not.toContainEqual({ id: seededRideId });
    });

    it('denies a foreign delete and an administrator delete', async () => {
      await other.client.from('rides').delete().eq('id', seededRideId);
      await administrator.client.from('rides').delete().eq('id', seededRideId);

      // The owner can still see it, so neither delete took effect.
      const { data } = await owner.client
        .from('rides')
        .select('id')
        .eq('id', seededRideId);
      expect(data).toHaveLength(1);
    });
  });
});

describe('catalogue mutation is admin-only', () => {
  it('lets an enthusiast read the catalogue', async () => {
    const { data, error } = await owner.client.from('coasters').select('id').limit(1);
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });

  it('denies enthusiast inserts', async () => {
    const { error } = await owner.client.from('coasters').insert({
      name: 'Unauthorized Addition',
      park: 'Nowhere',
      country: 'Nowhere',
      manufacturer: 'Nobody',
      type: 'Steel',
    });
    expect(error).not.toBeNull();
  });

  it('denies enthusiast updates', async () => {
    const { data, error } = await owner.client
      .from('coasters')
      .update({ name: 'Renamed By Enthusiast' })
      .eq('id', activeCoasterId)
      .select();

    expect(error !== null || data?.length === 0).toBe(true);
  });

  it('denies deletes to every API role', async () => {
    // No DELETE privilege is granted on coasters at all; removal is retirement.
    const { error } = await administrator.client
      .from('coasters')
      .delete()
      .eq('id', activeCoasterId);
    expect(error).not.toBeNull();
  });

  // Denial-only coverage would stay green if the admin claim or policy were
  // broken outright, so the admin identity needs positive proof too.
  it('lets an administrator insert, then edit, then soft-retire a coaster', async () => {
    // Deliberately a fixed identity, not a timestamped one. No API role holds
    // DELETE on coasters, so a unique name per run would leave a retired fixture
    // behind every time. On later runs the insert hits the (name, park) unique
    // constraint and we reuse the existing row instead.
    const fixture = {
      name: 'Access Matrix Fixture',
      park: 'Verification Park',
      country: 'Testland',
      manufacturer: 'Fixture Works',
      type: 'Steel',
    };

    const inserted = await administrator.client
      .from('coasters')
      .insert(fixture)
      .select('id, active')
      .single();

    let created = inserted.data;
    if (inserted.error) {
      // 23505 = unique violation, i.e. a previous run already created it.
      expect(inserted.error.code).toBe('23505');
      const existing = await administrator.client
        .from('coasters')
        .select('id, active')
        .eq('name', fixture.name)
        .eq('park', fixture.park)
        .single();
      expect(existing.error).toBeNull();
      created = existing.data;

      // Reset it so the retirement assertion below is a real transition.
      await administrator.client
        .from('coasters')
        .update({ active: true })
        .eq('id', created!.id);
    } else {
      expect(created?.active).toBe(true);
    }

    expect(created?.id).toBeTruthy();

    const { data: edited, error: updateError } = await administrator.client
      .from('coasters')
      .update({ manufacturer: 'Fixture Works Mk II' })
      .eq('id', created!.id)
      .select('manufacturer')
      .single();

    expect(updateError).toBeNull();
    expect(edited?.manufacturer).toBe('Fixture Works Mk II');

    const { data: retired, error: retireError } = await administrator.client
      .from('coasters')
      .update({ active: false })
      .eq('id', created!.id)
      .select('active')
      .single();

    expect(retireError).toBeNull();
    expect(retired?.active).toBe(false);

    // A retired coaster must reject new ride associations (R-008).
    const { error: rideError } = await owner.client
      .from('rides')
      .insert({ coaster_id: created!.id, ridden_on: '2026-03-03' });
    expect(rideError).not.toBeNull();

    // No DELETE grant exists, so the fixture is left retired rather than removed.
  });
});
