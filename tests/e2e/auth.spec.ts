import { expect, test } from '@playwright/test';

// Ticket 01: the cookie session round trip. Ticket 06 adds the full
// visitor/enthusiast and admin journeys on top of this harness.

const email = process.env.TEST_ENTHUSIAST_EMAIL!;
const password = process.env.TEST_ENTHUSIAST_PASSWORD!;

test('protected route redirects an anonymous visitor to sign-in', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/);
});

test('sign in, survive a reload, then sign out', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { name: 'Coaster Casey' })).toBeVisible();
  // Profiles are private by default and this account has never opted in.
  await expect(page.getByText('Private — not listed')).toBeVisible();

  // A reload proves the session is carried by cookies and refreshed by proxy.ts
  // rather than held only in client memory.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Coaster Casey' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/');

  // The session is genuinely gone, not just visually reset.
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/sign-in/);
});

test('a signed-in user is bounced away from the auth routes', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');

  await page.goto('/sign-up');
  await expect(page).toHaveURL('/dashboard');
});
