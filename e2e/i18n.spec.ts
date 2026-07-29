import { expect, test } from '@playwright/test';

test.describe('localization', () => {
  test('the language menu switches the splash to Croatian', async ({ page }) => {
    await page.goto('/');
    // Defaults to English.
    await expect(page.getByText('A game of dice and lies.')).toBeVisible();

    await page.getByTestId('language-menu').click();
    await page.getByTestId('lang-hr').click();

    // Tagline and the CTA reel word both switch to Croatian.
    await expect(page.getByText('Igra kocaka i laži.')).toBeVisible();
    await expect(page.getByTestId('sit-down')).toHaveAttribute('aria-label', 'Izazovi robota');
  });
});
