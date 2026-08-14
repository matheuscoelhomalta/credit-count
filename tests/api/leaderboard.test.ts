import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anonClient, enthusiast, otherUser, type Identity } from './helpers';

// Ticket 04: the public leaderboard RPC is the only thing an anonymous caller
// can reach. Everything here runs through the real Data API with the
// publishable key, so it proves what a stranger on the internet actually gets.

let subject: Identity;
let owner: Identity;
let subjectName: string;
let firstCoasterId: string;
let secondCoasterId: string;
const seededRideIds: string[] = [];

type LeaderboardRow = { display_name: string; credit_count: number };

async function fetchLeaderboard(client = anonClient()) {
  const { data, error } = await client.rpc('leaderboard');
  expect(error).toBeNull();
  return (data ?? []) as LeaderboardRow[];
}

async function setOptIn(identity: Identity, value: boolean) {
  const { error } = await identity.client
    .from('profiles')
    .update({ leaderboard_opt_in: value })
    .eq('user_id', identity.userId);
  expect(error).toBeNull();
}

beforeAll(async () => {
  // The "other" account is the leaderboard fixture: no other suite seeds its
  // rides, and the browser suite wipes the enthusiast's.
  [subject, owner] = await Promise.all([otherUser(), enthusiast()]);

  const { data: profile, error } = await subject.client
    .from('profiles')
    .select('display_name')
    .eq('user_id', subject.userId)
    .single();
  if (error || !profile) throw new Error(`Could not read fixture profile: ${error?.message}`);
  subjectName = profile.display_name;

  // Middle of the catalogue by name, so this file does not collide with the
  // coasters the other two suites retire from either end.
  const { data: coasters } = await subject.client
    .from('coasters')
    .select('id')
    .eq('active', true)
    .order('name')
    .range(10, 11);
  firstCoasterId = coasters![0].id;
  secondCoasterId = coasters![1].id;

  await setOptIn(subject, false);

  // Two rides on one coaster and one on another: three rides, two credits.
  const { data: rides, error: rideError } = await subject.client
    .from('rides')
    .insert([
      { coaster_id: firstCoasterId, ridden_on: '2026-04-01' },
      { coaster_id: firstCoasterId, ridden_on: '2026-04-02' },
      { coaster_id: secondCoasterId, ridden_on: '2026-04-03' },
    ])
    .select('id');
  if (rideError || !rides) throw new Error(`Could not seed rides: ${rideError?.message}`);
  seededRideIds.push(...rides.map((r) => r.id));
});

afterAll(async () => {
  await setOptIn(subject, false);
  for (const id of seededRideIds) {
    await subject.client.from('rides').delete().eq('id', id);
  }
});

describe('the anonymous leaderboard interface', () => {
  it('is callable with no arguments and returns only two fields', async () => {
    await setOptIn(subject, true);
    const rows = await fetchLeaderboard();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(['credit_count', 'display_name']);
    }
  });

  it('rejects arguments, so the interface cannot be widened by a caller', async () => {
    // A fixed zero-argument signature means no overload accepts a filter,
    // limit, or user reference from the client.
    const { error } = await anonClient().rpc('leaderboard', { user_id: subject.userId });
    expect(error).not.toBeNull();
  });

  it('still leaves every base table unreachable', async () => {
    await fetchLeaderboard();

    for (const table of ['profiles', 'coasters', 'rides']) {
      const { error } = await anonClient().from(table).select('*');
      expect(error?.code).toBe('42501');
    }
  });
});

describe('leaderboard contents', () => {
  it('counts distinct coasters, so repeat rides do not inflate credits', async () => {
    await setOptIn(subject, true);
    const rows = await fetchLeaderboard();

    const row = rows.find((r) => r.display_name === subjectName);
    // Three seeded rides across two coasters.
    expect(row?.credit_count).toBe(2);
  });

  it('ranks by descending credit count', async () => {
    await setOptIn(subject, true);
    const rows = await fetchLeaderboard();

    const counts = rows.map((r) => r.credit_count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('omits an opted-out profile from the next request', async () => {
    await setOptIn(subject, true);
    expect((await fetchLeaderboard()).some((r) => r.display_name === subjectName)).toBe(true);

    await setOptIn(subject, false);
    expect((await fetchLeaderboard()).some((r) => r.display_name === subjectName)).toBe(false);
  });

  it('reveals nothing about an opted-out user’s history', async () => {
    await setOptIn(subject, false);

    // Opting out must not be observable as an empty-credit entry either: the
    // profile is absent entirely, not present with a zeroed count.
    const rows = await fetchLeaderboard();
    expect(rows.map((r) => r.display_name)).not.toContain(subjectName);

    // And the rides themselves stay owner-only regardless of participation.
    const foreign = await owner.client
      .from('rides')
      .select('id')
      .in('id', seededRideIds);
    expect(foreign.error).toBeNull();
    expect(foreign.data).toHaveLength(0);
  });

  it('is equally available to a signed-in caller', async () => {
    await setOptIn(subject, true);
    const rows = await fetchLeaderboard(owner.client);
    expect(rows.some((r) => r.display_name === subjectName)).toBe(true);
  });
});
