import { expect, test } from '@playwright/test';

import { enthusiastEmail, enthusiastPassword, signIn } from './support';

// The enthusiast happy path is journeys.spec.ts. These are the narrow
// regressions around it: catalogue browsing, and one type-ahead bug that the
// journey would not catch because the journey never edits its search term.

test('the catalogue can be browsed and searched', async ({ page }) => {
  await signIn(page, enthusiastEmail, enthusiastPassword);
  await page.getByRole('link', { name: 'Catalogue' }).click();

  await expect(page.getByRole('heading', { name: 'Coaster catalogue' })).toBeVisible();
  // The full active catalogue is browsable without searching first.
  await expect(page.getByText(/\d+ active coasters/)).toBeVisible();

  await page.getByLabel('Search the catalogue').fill('Phantasialand');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('Taron')).toBeVisible();
  await expect(page.getByText('Nemesis Reborn')).toBeHidden();
});

test('editing the coaster search after selecting still finds matches', async ({ page }) => {
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
