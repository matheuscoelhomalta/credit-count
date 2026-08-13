'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type CatalogueState = { error: string | null; ok?: boolean };

const DENIED: CatalogueState = {
  error: 'That change was refused. Catalogue editing requires an administrator.',
};

/**
 * Distinguishes the two refusals a user can act on from the authorization
 * refusal. Reporting a length-constraint violation as "requires an
 * administrator" would send an admin looking for the wrong problem.
 */
function describe(code: string | undefined, duplicate: string): CatalogueState {
  if (code === '23505') return { error: duplicate };
  // 23514 is a CHECK constraint: the field-length limits on coasters.
  if (code === '23514') return { error: 'One of those values is too long.' };
  return DENIED;
}

type CoasterFields = {
  name: string;
  park: string;
  country: string;
  manufacturer: string;
  type: string;
};

// Nothing here checks whether the caller is an admin. The coasters INSERT and
// UPDATE policies do that against the verified JWT claim, so a request that
// reaches these actions without the role simply changes nothing.
function readFields(formData: FormData): CoasterFields | null {
  const fields = {
    name: String(formData.get('name') ?? '').trim(),
    park: String(formData.get('park') ?? '').trim(),
    country: String(formData.get('country') ?? '').trim(),
    manufacturer: String(formData.get('manufacturer') ?? '').trim(),
    type: String(formData.get('type') ?? '').trim(),
  };
  if (Object.values(fields).some((value) => value === '')) return null;
  return fields;
}

function revalidate() {
  revalidatePath('/admin');
  revalidatePath('/coasters');
  revalidatePath('/dashboard');
}

export async function createCoaster(
  _prev: CatalogueState,
  formData: FormData,
): Promise<CatalogueState> {
  const fields = readFields(formData);
  if (!fields) return { error: 'Every field is required.' };

  const supabase = await createClient();
  const { error } = await supabase.from('coasters').insert(fields);

  if (error) {
    return describe(error.code, 'That coaster already exists at that park.');
  }

  revalidate();
  return { error: null, ok: true };
}

export async function updateCoaster(
  _prev: CatalogueState,
  formData: FormData,
): Promise<CatalogueState> {
  const id = String(formData.get('coasterId') ?? '').trim();
  const fields = readFields(formData);
  if (!id) return { error: 'Missing coaster reference.' };
  if (!fields) return { error: 'Every field is required.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('coasters')
    .update(fields)
    .eq('id', id)
    .select('id');

  if (error) {
    return describe(error.code, 'Another coaster at that park already has that name.');
  }
  // RLS filters the row out for a non-admin, so an empty result is a denial.
  if (!data || data.length === 0) return DENIED;

  revalidate();
  return { error: null, ok: true };
}

/**
 * Retirement is the only removal there is: no API role holds DELETE on
 * coasters, so historical rides against a retired coaster stay intact and keep
 * counting toward their owners' statistics.
 */
export async function setCoasterActive(
  id: string,
  active: boolean,
): Promise<CatalogueState> {
  if (!id) return { error: 'Missing coaster reference.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('coasters')
    .update({ active })
    .eq('id', id)
    .select('id');

  if (error) return DENIED;
  if (!data || data.length === 0) return DENIED;

  revalidate();
  return { error: null, ok: true };
}
