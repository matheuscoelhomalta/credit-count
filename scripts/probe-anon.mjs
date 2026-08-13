// Sanity probe: confirms anonymous denial is a real privilege error rather than
// an empty result set, and that authenticated reads see the same tables populated.
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

for (const table of ['profiles', 'coasters', 'rides']) {
  const { data, error } = await anon.from(table).select('*').limit(1);
  console.log(
    `anon ${table.padEnd(9)} -> ${error ? `ERROR ${error.code}: ${error.message}` : `OK rows=${data.length}`}`,
  );
}

const owner = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
await owner.auth.signInWithPassword({
  email: process.env.TEST_ENTHUSIAST_EMAIL,
  password: process.env.TEST_ENTHUSIAST_PASSWORD,
});

const { count } = await owner
  .from('coasters')
  .select('*', { count: 'exact', head: true });
console.log(`authed coasters count -> ${count}`);

const { data: claims } = await owner.auth.getClaims();
console.log('enthusiast app_metadata ->', JSON.stringify(claims?.claims?.app_metadata));

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
await admin.auth.signInWithPassword({
  email: process.env.TEST_ADMIN_EMAIL,
  password: process.env.TEST_ADMIN_PASSWORD,
});
const { data: adminClaims } = await admin.auth.getClaims();
console.log('admin app_metadata     ->', JSON.stringify(adminClaims?.claims?.app_metadata));
