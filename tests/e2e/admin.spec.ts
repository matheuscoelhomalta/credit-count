import { expect, test } from '@playwright/test';

import { enthusiastEmail, enthusiastPassword, signIn } from './support';

// The admin happy path lives in journeys.spec.ts. This is its negative half:
// what an ordinary enthusiast sees when they go looking for that surface.

test('an enthusiast is refused the admin catalogue surface', async ({ page }) => {
  await signIn(page, enthusiastEmail, enthusiastPassword);

  // The navigation link is not offered…
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);

  // …and typing the URL gives no editing surface either. This is the cosmetic
  // layer; the direct-API tests prove the database refuses the writes.
  await page.goto('/admin');
  await expect(page.getByText('This area is for catalogue administrators.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add coaster' })).toHaveCount(0);
});
