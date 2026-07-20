import { expect, test } from '@playwright/test';

test.describe('splash screen', () => {
  test('renders the new-game controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeVisible();
    // The title is live type now, not an image.
    await expect(page.getByRole('heading', { name: 'Swindlestones' })).toBeVisible();
    await expect(page.getByTestId('sit-down')).toBeEnabled();
    // Match length selector: 2-6 dice, 4 preselected.
    await expect(page.locator('input[name="dice"]')).toHaveCount(5);
    await expect(page.locator('input[name="dice"][value="4"]')).toBeChecked();
    await page.screenshot({ path: `test-results/screens/${test.info().project.name}-splash.png` });
  });

  test('advanced disclosure exposes seed and opponent engine', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('seed-input')).toBeHidden();
    await page.getByText('Choose your opponent').click();
    await expect(page.getByTestId('seed-input')).toBeVisible();
    await expect(page.getByTestId('engine-select')).toHaveValue('llm');
  });
});
