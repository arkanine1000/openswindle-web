import { expect, test } from '@playwright/test';
import { rollDice, sitDown, waitForTurnOrEnd } from './helpers';

test.describe('composer and history ergonomics', () => {
  test('Enter in the talk field plays the armed bid, talk attached', async ({ page }) => {
    await sitDown(page, { dice: 3 });
    await rollDice(page);
    await page.getByTestId('talk-input').fill('Hear me out.');
    await page.getByTestId('talk-input').press('Enter');
    await waitForTurnOrEnd(page);
    await page.getByTestId('history-tab').click();
    await expect(page.getByTestId('history-entry').filter({ hasText: 'Hear me out.' })).toHaveCount(
      1,
    );
  });

  test('scrolling up unrolls the history; scrolling on past the end closes it', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'wheel gestures are desktop-only; mobile opens via the tab or swipe');
    await sitDown(page);
    await rollDice(page);

    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, -120);
    await expect(page.getByTestId('history-sheet')).toBeVisible();

    // The sheet opens at its end, so one more downward tick closes it.
    await page.getByTestId('history-sheet').hover();
    await page.mouse.wheel(0, 120);
    await expect(page.getByTestId('history-sheet')).toBeHidden();
  });
});
