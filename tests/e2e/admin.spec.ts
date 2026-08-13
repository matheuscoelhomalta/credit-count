import { expect, test } from '@playwright/test';

import {
  adminEmail,
  adminPassword,
  enthusiastEmail,
  enthusiastPassword,
  signIn,
} from './support';

// Ticket 05: the admin catalogue journey, and the same surface refused to an
// ordinary enthusiast.

// Fixed rather than timestamped: no API role may delete a coaster, so a unique
// name per run would leave a retired entry behind every time. Re-runs reuse it.
const FIXTURE = {
  name: 'Browser Fixture Coaster',
  park: 'Verification Park',
  country: 'Testland',
  manufacturer: 'Fixture Works',
  type: 'Steel',
};

test('an admin can add, edit, and retire a catalogue entry', async ({ page }) => {
  await signIn(page, adminEmail, adminPassword);
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('heading', { name: 'Catalogue admin' })).toBeVisible();

  // Create it if this is the first run; otherwise the duplicate is reported and
  // the existing row is used.
  for (const [name, value] of Object.entries(FIXTURE)) {
    await page.getByLabel(new RegExp(`^${name}$`, 'i')).fill(value);
  }
  await page.getByRole('button', { name: 'Add coaster' }).click();

  await page.getByLabel('Search the catalogue').fill(FIXTURE.name);
  await page.getByRole('button', { name: 'Search' }).click();

  // The search narrows the list to this one entry, so the row is addressed by
  // position. Filtering on its name would stop matching the moment the row
  // switches to inputs, whose values are not text content.
  const row = page.getByRole('listitem');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(FIXTURE.name);

  // Restore first so the retire step below is always a real transition.
  const restore = row.getByRole('button', { name: /^Restore/ });
  if (await restore.isVisible()) {
    await restore.click();
    await expect(row.getByRole('button', { name: /^Retire/ })).toBeVisible();
  }

  await row.getByRole('button', { name: /^Edit/ }).click();
  await row.getByLabel(`Manufacturer of ${FIXTURE.name}`).fill('Fixture Works Mk II');
  await row.getByRole('button', { name: 'Save' }).click();
  await expect(row).toContainText('Fixture Works Mk II');

  await row.getByRole('button', { name: /^Retire/ }).click();
  await expect(row).toContainText('Retired');

  // A retired entry disappears from the enthusiast-facing catalogue but is
  // still listed here, where it can be reviewed or restored.
  await page.goto(`/coasters?q=${encodeURIComponent(FIXTURE.name)}`);
  await expect(page.getByText('No active coaster matches that search.')).toBeVisible();
});

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
