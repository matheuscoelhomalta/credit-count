'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { isValidRideDate } from '@/lib/dates';

export type RideFormState = { error: string | null; ok?: boolean };

function readNote(formData: FormData): string | null {
  const note = String(formData.get('note') ?? '').trim();
  if (!note) return null;
  return note.slice(0, 280);
}

// Every action below relies on the database for authorization. The client is
// never trusted with user_id: it is not sent at all, because the INSERT grant
// withholds the column and the row default fills it from auth.uid().
export async function logRide(
  _prev: RideFormState,
  formData: FormData,
): Promise<RideFormState> {
  const coasterId = String(formData.get('coasterId') ?? '').trim();
  const riddenOn = String(formData.get('riddenOn') ?? '').trim();

  if (!coasterId) {
    return { error: 'Choose a coaster to log.' };
  }
  if (!isValidRideDate(riddenOn)) {
    return { error: 'Enter a valid ride date that is not in the future.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('rides').insert({
    coaster_id: coasterId,
    ridden_on: riddenOn,
    note: readNote(formData),
  });

  if (error) {
    // The insert policy also requires an active coaster, so a retired or
    // unknown coaster lands here rather than being pre-checked in the UI.
    return { error: 'That ride could not be logged. The coaster may have been retired.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/history');
  return { error: null, ok: true };
}

export async function updateRide(
  _prev: RideFormState,
  formData: FormData,
): Promise<RideFormState> {
  const rideId = String(formData.get('rideId') ?? '').trim();
  const riddenOn = String(formData.get('riddenOn') ?? '').trim();

  if (!rideId) {
    return { error: 'Missing ride reference.' };
  }
  if (!isValidRideDate(riddenOn)) {
    return { error: 'Enter a valid ride date that is not in the future.' };
  }

  const supabase = await createClient();
  // Only date and note are sent. coaster_id and user_id are not editable by
  // this role at all, so a crafted payload cannot reassign either.
  const { data, error } = await supabase
    .from('rides')
    .update({ ridden_on: riddenOn, note: readNote(formData) })
    .eq('id', rideId)
    .select('id');

  if (error) {
    return { error: 'That ride could not be updated.' };
  }
  if (!data || data.length === 0) {
    // RLS filtered the row out: it belongs to someone else or does not exist.
    return { error: 'That ride could not be found.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/history');
  return { error: null, ok: true };
}

export async function deleteRide(formData: FormData): Promise<RideFormState> {
  const rideId = String(formData.get('rideId') ?? '').trim();
  if (!rideId) {
    return { error: 'Missing ride reference.' };
  }

  const supabase = await createClient();
  // Ask for the deleted rows back so a silent no-op is distinguishable from a
  // real deletion. RLS filters a foreign or missing ride out rather than
  // raising, so an empty result is the expected shape for "not yours".
  const { data, error } = await supabase
    .from('rides')
    .delete()
    .eq('id', rideId)
    .select('id');

  if (error) {
    return { error: 'That ride could not be deleted.' };
  }
  if (!data || data.length === 0) {
    return { error: 'That ride could not be found.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/history');
  return { error: null, ok: true };
}
