import { expect, test } from '@playwright/test';

import { enthusiastEmail, enthusiastPassword, signIn } from './support';

// The enthusiast happy path is journeys.spec.ts. These are the narrow
// regressions around it: catalogue browsing, and one type-ahead bug that the
// journey would not catch because the journey never edits its search term.

test('the catalogue can be browsed and searched', async ({ page }) => {
  await signIn(page, enthusiastEmail, enthusiastPassword);
  await page.getByRole('link', { name: 'Catalogue' }).click();

  await expect(page.getByRole('heading', { name: 'Coaster catalogue' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Catalogue' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  // The full active catalogue is browsable without searching first.
  await expect(page.getByText(/\d+ active coasters/)).toBeVisible();

  await page.getByLabel('Search the catalogue').fill('Phantasialand');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('Taron')).toBeVisible();
  await expect(page.getByText('Nemesis Reborn')).toBeHidden();

  // The header is shared chrome, so it must not change shape from page to page.
  // /leaderboard once used a narrower column, which wrapped the bar onto two
  // rows and left the sign-out divider hanging at the start of the second.
  const bar = () =>
    page.evaluate(() => {
      const r = document.querySelector('header > div')!.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });

  await page.goto('/dashboard');
  const reference = await bar();
  for (const route of ['/history', '/coasters', '/leaderboard']) {
    await page.goto(route);
    expect(await bar(), `header geometry on ${route}`).toEqual(reference);
  }
});

test('the coaster picker supports keyboard selection and explains incomplete input', async ({
  page,
}) => {
  await signIn(page, enthusiastEmail, enthusiastPassword);

  const search = page.getByRole('combobox', { name: 'Coaster' });
  await search.fill('Taron');
  await expect(search).toHaveAttribute('role', 'combobox');
  await expect(search).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Choose a coaster from the list.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log ride' })).toBeDisabled();

  await search.press('ArrowDown');
  const taron = page.getByRole('option', { name: /^Taron/ });
  await expect(taron).toHaveAttribute('aria-selected', 'true');
  await search.press('Enter');

  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Log ride' })).toBeEnabled();
  await expect(search).toHaveCSS('outline-style', 'solid');

  // The field holds the plain search term, not a decorated "Name — Park" label.
  // That label was the bug: one backspace left "Taron — Phantasialan" in the
  // query, which matches nothing and stranded the user with submit disabled.
  await expect(search).toHaveValue('Taron');
  await expect(page.getByText('Selected: Phantasialand, Germany')).toBeVisible();

  // Editing the term after selecting must degrade back into an ordinary search.
  await search.fill('Taro');
  await expect(page.getByRole('option', { name: /^Taron/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log ride' })).toBeDisabled();

  await search.press('Escape');
  await expect(search).toHaveAttribute('aria-expanded', 'false');
});

test('an exact coaster name can be selected with Enter', async ({ page }) => {
  await signIn(page, enthusiastEmail, enthusiastPassword);

  const search = page.getByRole('combobox', { name: 'Coaster' });
  await search.fill('Nemesis Reborn');
  await search.press('Enter');

  await expect(page.getByText('Selected: Alton Towers, United Kingdom')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log ride' })).toBeEnabled();
});
