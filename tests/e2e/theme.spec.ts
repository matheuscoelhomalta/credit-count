import { expect, test } from '@playwright/test';

// The theme control is on the public pages, so these need no sign-in and spend
// none of the password rate limit.

const ground = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('every page a signed-out visitor can reach offers the control', async ({ page }) => {
  for (const route of ['/', '/sign-in', '/sign-up', '/leaderboard']) {
    await page.goto(route);
    await expect(
      page.getByRole('button', { name: /^Switch to the (dark|light) theme$/ }),
    ).toHaveCount(1);
  }
});

test('a chosen theme survives navigation and reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to the dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.goto('/leaderboard');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // The label now offers the opposite direction, so the switch is reversible.
  await expect(
    page.getByRole('button', { name: 'Switch to the light theme' }),
  ).toBeVisible();
});

test('an explicit choice overrides the system preference in both directions', async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();

  await page.goto('/');
  const systemDark = await ground(page);

  await page.getByRole('button', { name: 'Switch to the light theme' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const chosenLight = await ground(page);
  expect(chosenLight).not.toBe(systemDark);

  await page.getByRole('button', { name: 'Switch to the dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await ground(page)).toBe(systemDark);

  await context.close();
});
