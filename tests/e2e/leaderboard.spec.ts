import { expect, test } from '@playwright/test';

// Opting in and out is part of the enthusiast journey in journeys.spec.ts.
// What remains here is the signed-out boundary itself.

test('a signed-out visitor reaches only the leaderboard and sign-up', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();

  // No coaster names, ride dates, or notes are rendered anywhere on the page.
  await expect(page.getByText('Taron')).toHaveCount(0);

  for (const route of ['/dashboard', '/history', '/coasters', '/admin']) {
    await page.goto(route);
    // next is percent-encoded in the redirect target.
    await expect(page).toHaveURL(
      new RegExp(`/sign-in\\?next=${encodeURIComponent(route)}$`),
    );
  }
});
