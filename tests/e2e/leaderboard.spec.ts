import { expect, test } from '@playwright/test';

import {
  enthusiastEmail,
  enthusiastPassword,
  logRide,
  readProfile,
  resetRides,
  signIn,
} from './support';

// Ticket 04: what a signed-out visitor may see, and that participation is the
// enthusiast's own reversible choice.

test.beforeEach(async () => {
  await resetRides(enthusiastEmail, enthusiastPassword);
});

test.afterAll(async () => {
  await resetRides(enthusiastEmail, enthusiastPassword);
});

test('a signed-out visitor sees the leaderboard and sign-up, and nothing private', async ({
  page,
}) => {
  await page.goto('/leaderboard');
  await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();

  // No ride dates, notes, or coaster names are rendered anywhere on the page.
  await expect(page.getByText('Taron')).toHaveCount(0);

  // And the private routes are not reachable while signed out.
  for (const route of ['/dashboard', '/history', '/coasters']) {
    await page.goto(route);
    // next is percent-encoded in the redirect target.
    await expect(page).toHaveURL(
      new RegExp(`/sign-in\\?next=${encodeURIComponent(route)}$`),
    );
  }
});

test('an enthusiast can join the leaderboard and leave it again', async ({
  page,
  browser,
}) => {
  const { display_name: displayName } = await readProfile(
    enthusiastEmail,
    enthusiastPassword,
  );

  await signIn(page, enthusiastEmail, enthusiastPassword);
  await logRide(page, 'Taron');
  await logRide(page, 'Icon');

  const join = page.getByRole('button', { name: 'Join the public leaderboard' });
  const leave = page.getByRole('button', { name: 'Leave the public leaderboard' });

  // Start from a known state: leave first if a previous run left it joined.
  if (await leave.isVisible()) {
    await leave.click();
    await expect(join).toBeVisible();
  }

  await join.click();
  await expect(leave).toBeVisible();

  // Check the public view from a genuinely anonymous browser context, not just
  // the signed-in one — that is the audience the opt-in is about.
  const visitor = await browser.newContext();
  try {
    const visitorPage = await visitor.newPage();
    await visitorPage.goto('/leaderboard');

    const row = visitorPage.getByRole('listitem').filter({ hasText: displayName });
    await expect(row).toBeVisible();
    await expect(row).toContainText('2 credits');

    await leave.click();
    await expect(join).toBeVisible();

    // Opting out removes the entry on the next request (R-012).
    await visitorPage.reload();
    await expect(
      visitorPage.getByRole('listitem').filter({ hasText: displayName }),
    ).toHaveCount(0);
  } finally {
    await visitor.close();
  }
});
