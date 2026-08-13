import { expect, test } from '@playwright/test';

import {
  enthusiastEmail,
  enthusiastPassword,
  logRide,
  resetRides,
  signIn,
} from './support';

// Tickets 02 and 03: log distinct and repeat rides, see correct counts and
// breakdowns update live, then manage history.

test.beforeEach(async () => {
  await resetRides(enthusiastEmail, enthusiastPassword);
});

test.afterAll(async () => {
  await resetRides(enthusiastEmail, enthusiastPassword);
});

function tile(page: import('@playwright/test').Page, label: string) {
  return page.locator('div', { has: page.getByText(label, { exact: true }) }).last();
}

test('log three coasters plus a repeat, and see credits diverge from ride count', async ({
  page,
}) => {
  await signIn(page, enthusiastEmail, enthusiastPassword);

  await logRide(page, 'Nemesis Reborn', 'front row');
  await expect(page.getByText('front row')).toBeVisible();

  await logRide(page, 'Taron');
  await logRide(page, 'Steel Dragon 2000');

  // Counts must update without any manual refresh (R-010).
  await expect(tile(page, 'Credits')).toContainText('3');
  await expect(tile(page, 'Total rides')).toContainText('3');

  // A repeat ride adds history and total rides but not a credit (R-006, R-009).
  await logRide(page, 'Taron');
  await expect(tile(page, 'Credits')).toContainText('3');
  await expect(tile(page, 'Total rides')).toContainText('4');
  await expect(tile(page, 'Most ridden')).toContainText('Taron');
});

test('breakdowns reflect distinct coasters and update after a delete', async ({
  page,
}) => {
  await signIn(page, enthusiastEmail, enthusiastPassword);

  // Two German coasters and one Japanese one.
  await logRide(page, 'Taron');
  await logRide(page, 'Black Mamba');
  await logRide(page, 'Steel Dragon 2000');

  // Scope to the breakdown card itself, not every ancestor div that contains it.
  const countries = page
    .getByRole('heading', { name: 'Credits by country' })
    .locator('..');
  await expect(countries.getByText('Germany', { exact: true })).toBeVisible();
  await expect(countries.getByText('Japan', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'Ride history' })).toBeVisible();

  // Delete the Japanese credit and confirm the statistics follow.
  const japaneseRide = page.locator('li', {
    has: page.getByText('Steel Dragon 2000'),
  });
  await japaneseRide.getByRole('button', { name: /^Delete ride/ }).click();
  await japaneseRide.getByRole('button', { name: 'Confirm delete' }).click();

  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(tile(page, 'Credits')).toContainText('2');
  await expect(countries.getByText('Japan', { exact: true })).toBeHidden();
});

test('the catalogue can be browsed and searched', async ({ page }) => {
  await signIn(page, enthusiastEmail, enthusiastPassword);
  await page.getByRole('link', { name: 'Catalogue' }).click();

  await expect(page.getByRole('heading', { name: 'Coaster catalogue' })).toBeVisible();
  // The full active catalogue is browsable without searching first.
  await expect(page.getByText('40 active coasters')).toBeVisible();

  await page.getByLabel('Search the catalogue').fill('Phantasialand');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('Taron')).toBeVisible();
  await expect(page.getByText('Nemesis Reborn')).toBeHidden();
});

test('editing the coaster search after selecting still finds matches', async ({
  page,
}) => {
  await signIn(page, enthusiastEmail, enthusiastPassword);

  const search = page.getByLabel('Coaster');
  await search.fill('Taron');
  await page.getByRole('button', { name: /^Taron/ }).click();
  await expect(page.getByRole('button', { name: 'Log ride' })).toBeEnabled();

  // The field holds the plain search term, not a decorated "Name — Park" label.
  // That label was the bug: one backspace left "Taron — Phantasialan" in the
  // query, which matches nothing and stranded the user with submit disabled.
  await expect(search).toHaveValue('Taron');
  await expect(page.getByText('Selected: Phantasialand, Germany')).toBeVisible();

  // Editing the term after selecting must degrade back into an ordinary search.
  await search.fill('Taro');
  await expect(page.getByRole('button', { name: /^Taron/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log ride' })).toBeDisabled();
});

test('an owner can edit only the date and note of their ride', async ({ page }) => {
  await signIn(page, enthusiastEmail, enthusiastPassword);
  await logRide(page, 'Icon', 'original note');

  await page.getByRole('link', { name: 'History' }).click();
  const row = page.locator('li', { has: page.getByText('Icon') });

  await row.getByRole('button', { name: /^Edit ride/ }).click();
  await row.getByLabel('Ride date').fill('2026-01-15');
  await row.getByLabel('Ride note').fill('updated note');
  await row.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('updated note')).toBeVisible();
  await expect(page.getByText('15 Jan 2026')).toBeVisible();

  // The coaster itself is not offered as an editable field anywhere.
  await expect(row.getByRole('combobox')).toHaveCount(0);
});
