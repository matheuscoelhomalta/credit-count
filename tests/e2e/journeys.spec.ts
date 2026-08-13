import { expect, test, type Page } from '@playwright/test';

import {
  adminEmail,
  adminPassword,
  enthusiastEmail,
  enthusiastPassword,
  logRide,
  readProfile,
  resetRides,
  signIn,
} from './support';

// Ticket 06: the two flows the SOW asks a reviewer to watch. Everything a
// reviewer needs to see happens here, end to end, at both viewports. The other
// specs in this directory are narrower regression tests around them.

function tile(page: Page, label: string) {
  return page.locator('div', { has: page.getByText(label, { exact: true }) }).last();
}

test.describe('visitor and enthusiast', () => {
  test.beforeEach(async () => {
    await resetRides(enthusiastEmail, enthusiastPassword);
  });

  test.afterAll(async () => {
    await resetRides(enthusiastEmail, enthusiastPassword);
  });

  test('from the public leaderboard to a managed private history and back', async ({
    page,
    browser,
  }) => {
    const { display_name: displayName } = await readProfile(
      enthusiastEmail,
      enthusiastPassword,
    );

    // 1. A signed-out visitor can see the leaderboard and reach sign-up.
    await page.goto('/leaderboard');
    await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();

    // 2. Authentication.
    await signIn(page, enthusiastEmail, enthusiastPassword);
    await expect(page.getByRole('heading', { name: displayName })).toBeVisible();
    await expect(page.getByText(/not listed on the public leaderboard/i)).toBeVisible();

    // 3. Logging is fast: search, pick, submit. The date defaults to today and
    // the note is optional, so three coasters cost three interactions each.
    await logRide(page, 'Taron', 'front row');
    await logRide(page, 'Black Mamba');
    await logRide(page, 'Steel Dragon 2000');

    // 4. A repeat ride is history, not a new credit.
    await logRide(page, 'Taron');
    await expect(tile(page, 'Credits')).toContainText('3');
    await expect(tile(page, 'Total rides')).toContainText('4');
    await expect(tile(page, 'Most ridden')).toContainText('Taron');

    // 5. Statistics break down by distinct coaster, not by ride.
    const countries = page.getByRole('heading', { name: 'Credits by country' }).locator('..');
    await expect(countries.getByText('Germany', { exact: true })).toBeVisible();
    await expect(countries.getByText('Japan', { exact: true })).toBeVisible();

    // 6. History management: correct one entry, remove another, and watch the
    // statistics follow without a manual refresh.
    await page.getByRole('link', { name: 'History' }).click();
    const mamba = page.locator('li', { has: page.getByText('Black Mamba') });
    await mamba.getByRole('button', { name: /^Edit ride/ }).click();
    await mamba.getByLabel('Ride note').fill('back row this time');
    await mamba.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('back row this time')).toBeVisible();

    const japanese = page.locator('li', { has: page.getByText('Steel Dragon 2000') });
    await japanese.getByRole('button', { name: /^Delete ride/ }).click();
    await japanese.getByRole('button', { name: 'Confirm delete' }).click();

    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(tile(page, 'Credits')).toContainText('2');
    await expect(countries.getByText('Japan', { exact: true })).toBeHidden();

    // 7. Participation is the enthusiast's own reversible choice, and the
    // public view is checked from a genuinely anonymous browser context.
    await page.getByRole('button', { name: 'Join the public leaderboard' }).click();
    const leave = page.getByRole('button', { name: 'Leave the public leaderboard' });
    await expect(leave).toBeVisible();

    const visitor = await browser.newContext();
    try {
      const visitorPage = await visitor.newPage();
      await visitorPage.goto('/leaderboard');

      const row = visitorPage.getByRole('listitem').filter({ hasText: displayName });
      await expect(row).toContainText('2 credits');
      // Only the name and the count — no ride, date, note, or coaster leaks.
      await expect(visitorPage.getByText('back row this time')).toHaveCount(0);
      await expect(visitorPage.getByText('Taron')).toHaveCount(0);

      await leave.click();
      await expect(page.getByRole('button', { name: 'Join the public leaderboard' })).toBeVisible();

      await visitorPage.reload();
      await expect(
        visitorPage.getByRole('listitem').filter({ hasText: displayName }),
      ).toHaveCount(0);
    } finally {
      await visitor.close();
    }
  });
});

test.describe('administrator', () => {
  // Fixed rather than timestamped: no API role may delete a coaster, so a
  // unique name per run would leave a retired entry behind every time.
  const FIXTURE = {
    name: 'Browser Fixture Coaster',
    park: 'Verification Park',
    country: 'Testland',
    manufacturer: 'Fixture Works',
    type: 'Steel',
  };

  test('adds, edits, and soft-retires a catalogue entry', async ({ page }) => {
    await signIn(page, adminEmail, adminPassword);
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page.getByRole('heading', { name: 'Catalogue admin' })).toBeVisible();

    // Created on the first run; on later runs the duplicate is reported and the
    // existing row is reused.
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

    // Retirement removes it from the enthusiast-facing catalogue while leaving
    // it here to be reviewed or restored.
    await page.goto(`/coasters?q=${encodeURIComponent(FIXTURE.name)}`);
    await expect(page.getByText('No active coaster matches that search.')).toBeVisible();
  });
});
