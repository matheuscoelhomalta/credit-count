// Creates the two accounts handed to a reviewer, seeded with enough history to
// demonstrate the product on arrival.
//
// These are deliberately NOT the TEST_* accounts. The browser suite resets its
// enthusiast's rides before every test and opts accounts out during cleanup, so
// a reviewer sharing those accounts would find an empty dashboard and an empty
// leaderboard after any test run.
//
// Idempotent: re-running reuses existing accounts and tops their history back
// up rather than duplicating it. Passwords are read from .env.local when
// present, so a re-run does not invalidate credentials already sent out.
import { randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client = () =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

/** Readable but high-entropy: ~62 bits, no ambiguous characters to mistype. */
function generatePassword() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(14);
  return `${[...bytes].map((b) => alphabet[b % alphabet.length]).join('')}-7Kx!`;
}

const ACCOUNTS = [
  { prefix: 'REVIEWER_ENTHUSIAST', displayName: 'Casey Nightingale', rides: 11 },
  { prefix: 'REVIEWER_ADMIN', displayName: 'Sam Fairweather', rides: 5 },
];

function envValue(name) {
  return process.env[name] || null;
}

const created = [];

for (const account of ACCOUNTS) {
  const email =
    envValue(`${account.prefix}_EMAIL`) ??
    `${account.prefix.toLowerCase().replace('_', '-')}@credit-count-demo.dev`;
  const password = envValue(`${account.prefix}_PASSWORD`) ?? generatePassword();

  const api = client();
  const { error: signUpError } = await api.auth.signUp({
    email,
    password,
    options: { data: { display_name: account.displayName } },
  });

  // "already registered" is the expected path on a re-run.
  if (signUpError && !/already/i.test(signUpError.message)) {
    throw new Error(`sign-up failed for ${email}: ${signUpError.message}`);
  }

  const { error: signInError } = await api.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(
      `sign-in failed for ${email}: ${signInError.message}. If this account ` +
        `predates the current password, reset it in Supabase or clear the ` +
        `${account.prefix}_* entries in .env.local.`,
    );
  }

  created.push({ ...account, email, password, api });
  console.log(`account ready: ${email}`);
}

// Seed history. Coasters are picked spread across the catalogue so the country,
// manufacturer, and type breakdowns all have something to show, and two rides
// repeat a coaster so credits and ride count visibly diverge.
for (const account of created) {
  const { count: existing } = await account.api
    .from('rides')
    .select('id', { count: 'exact', head: true });

  if (existing >= account.rides) {
    console.log(`  history already seeded (${existing} rides)`);
    continue;
  }

  const { data: coasters } = await account.api
    .from('coasters')
    .select('id, name')
    .eq('active', true)
    .order('name')
    .limit(40);

  // Spread the picks across the alphabet rather than taking the first N, which
  // would cluster on one or two parks.
  const step = Math.max(1, Math.floor(coasters.length / account.rides));
  const picks = [];
  for (let i = 0; picks.length < account.rides - 2; i += step) {
    picks.push(coasters[i % coasters.length]);
  }
  // Two repeats, so the most-ridden tile and the credits/rides split are real.
  picks.push(picks[0], picks[0]);

  const today = new Date();
  const rows = picks.map((coaster, index) => {
    const when = new Date(today);
    when.setDate(when.getDate() - (index * 23 + 5));
    return {
      coaster_id: coaster.id,
      ridden_on: when.toISOString().slice(0, 10),
      note: index === 0 ? 'Front row, worth the queue.' : null,
    };
  });

  const { error } = await account.api.from('rides').insert(rows);
  if (error) throw new Error(`seeding rides for ${account.email}: ${error.message}`);

  const { error: optInError } = await account.api
    .from('profiles')
    .update({ leaderboard_opt_in: true })
    .eq('user_id', (await account.api.auth.getUser()).data.user.id);
  if (optInError) throw new Error(`opt-in for ${account.email}: ${optInError.message}`);

  console.log(`  seeded ${rows.length} rides and opted into the leaderboard`);
}

// Persist the credentials locally so a re-run is non-destructive. .env.local is
// gitignored; these values must never be committed.
const envFile = readFileSync('.env.local', 'utf8');
const missing = created.filter((a) => !envFile.includes(`${a.prefix}_EMAIL=`));
if (missing.length) {
  appendFileSync(
    '.env.local',
    `\n# Reviewer demo accounts (never commit). Separate from the TEST_* accounts,\n` +
      `# which the browser suite resets.\n` +
      missing
        .map((a) => `${a.prefix}_EMAIL=${a.email}\n${a.prefix}_PASSWORD=${a.password}`)
        .join('\n') +
      '\n',
  );
  console.log(`\nwrote ${missing.length} credential pair(s) to .env.local`);
}

console.log('\nAdmin claim still needs granting for the admin account:');
console.log(`  ${created.find((a) => a.prefix === 'REVIEWER_ADMIN').email}`);
