import { beforeAll, describe, expect, it } from 'vitest';

import { admin, enthusiast, otherUser, type Identity } from './helpers';

// Ticket 05: where administrator authority comes from, and where it stops.
// The insert/edit/retire happy path lives in access-matrix.test.ts; this file
// covers the claim itself, retirement denial, and the limits of the role.

let administrator: Identity;
let owner: Identity;
let other: Identity;
let coasterId: string;

function claims(accessToken: string): Record<string, unknown> {
  const payload = accessToken.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

beforeAll(async () => {
  [administrator, owner, other] = await Promise.all([admin(), enthusiast(), otherUser()]);

  const { data } = await administrator.client
    .from('coasters')
    .select('id')
    .eq('active', true)
    .order('name', { ascending: false })
    .limit(1)
    .single();
  coasterId = data!.id;
});

describe('administrator authority comes from application metadata', () => {
  it('carries is_admin in app_metadata, not in user metadata', async () => {
    const { data } = await administrator.client.auth.getSession();
    const payload = claims(data.session!.access_token);

    expect((payload.app_metadata as Record<string, unknown>).is_admin).toBe(true);
    // user_metadata is user-writable through the auth API, so the claim must
    // not be there — if it were, any account could grant itself the role.
    expect((payload.user_metadata as Record<string, unknown>)?.is_admin).toBeUndefined();
  });

  it('cannot be granted by an enthusiast writing their own user metadata', async () => {
    await owner.client.auth.updateUser({ data: { is_admin: true } });

    // The forged claim lands in user_metadata, which is_admin() never reads.
    const { data } = await owner.client.auth.refreshSession();
    const payload = claims(data.session!.access_token);
    expect((payload.user_metadata as Record<string, unknown>).is_admin).toBe(true);
    expect((payload.app_metadata as Record<string, unknown>)?.is_admin).toBeUndefined();

    const { error } = await owner.client.from('coasters').insert({
      name: 'Self Promoted',
      park: 'Nowhere',
      country: 'Nowhere',
      manufacturer: 'Nobody',
      type: 'Steel',
    });
    expect(error).not.toBeNull();

    await owner.client.auth.updateUser({ data: { is_admin: null } });
  });

  it('survives a token refresh', async () => {
    // The claim is read from the JWT, so a refreshed token must still carry it
    // or an admin would silently lose access mid-session.
    const { data, error } = await administrator.client.auth.refreshSession();
    expect(error).toBeNull();
    expect((claims(data.session!.access_token).app_metadata as Record<string, unknown>).is_admin).toBe(
      true,
    );

    // A write that leaves the catalogue exactly as it found it: this asserts the
    // policy still admits the caller, without editing real seed data.
    const { error: stillAdmin } = await administrator.client
      .from('coasters')
      .update({ active: true })
      .eq('id', coasterId)
      .select('id')
      .single();
    expect(stillAdmin).toBeNull();
  });
});

describe('enthusiasts cannot touch the catalogue', () => {
  it('cannot retire a coaster', async () => {
    const { data, error } = await owner.client
      .from('coasters')
      .update({ active: false })
      .eq('id', coasterId)
      .select('id');

    expect(error !== null || data?.length === 0).toBe(true);

    const { data: check } = await administrator.client
      .from('coasters')
      .select('active')
      .eq('id', coasterId)
      .single();
    expect(check?.active).toBe(true);
  });

  it('cannot restore a coaster an admin retired', async () => {
    await administrator.client
      .from('coasters')
      .update({ active: false })
      .eq('id', coasterId);

    try {
      const { data, error } = await owner.client
        .from('coasters')
        .update({ active: true })
        .eq('id', coasterId)
        .select('id');
      expect(error !== null || data?.length === 0).toBe(true);
    } finally {
      await administrator.client
        .from('coasters')
        .update({ active: true })
        .eq('id', coasterId);
    }
  });
});

describe('catalogue authority grants nothing else', () => {
  it('does not let an administrator read another user’s profile', async () => {
    const { data, error } = await administrator.client
      .from('profiles')
      .select('user_id')
      .eq('user_id', other.userId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('does not let an administrator rewrite a coaster’s identity or timestamps', async () => {
    // The catalogue grant is column-scoped, like the one on rides. Reassigning
    // `id` is the damaging case: rides reference it, so a repoint would move
    // other people's history onto a different coaster.
    for (const patch of [
      { id: crypto.randomUUID() },
      { created_at: '2000-01-01T00:00:00Z' },
    ]) {
      const { error } = await administrator.client
        .from('coasters')
        .update(patch)
        .eq('id', coasterId)
        .select('id');

      // 42501 is the grant layer refusing the column outright, before RLS.
      expect(error?.code).toBe('42501');
    }
  });

  it('does not let an administrator opt someone into the leaderboard', async () => {
    const { data, error } = await administrator.client
      .from('profiles')
      .update({ leaderboard_opt_in: true })
      .eq('user_id', other.userId)
      .select('user_id');

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
