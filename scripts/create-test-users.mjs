import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const accounts = [
  ['TEST_ENTHUSIAST', 'Coaster Casey'],
  ['TEST_OTHER', 'Rival Robin'],
  ['TEST_ADMIN', 'Catalogue Admin'],
];

for (const [prefix, displayName] of accounts) {
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) {
    console.log(`FAIL ${email}: ${error.message}`);
    continue;
  }
  console.log(
    `OK   ${email} -> ${data.user?.id} (session: ${data.session ? 'yes' : 'no'})`,
  );
}
