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

  test('a swipe past the end closes the history on touch', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch gesture; the desktop path is covered by the wheel test above');
    await sitDown(page);
    await rollDice(page);

    await page.getByTestId('history-tab').click();
    await expect(page.getByTestId('history-sheet')).toBeVisible();

    // A finger dragging up from inside the log. Touch events are built in
    // the page so they carry a real TouchList — this is the path that
    // shipped broken, because the suite only ever exercised the wheel.
    await page.evaluate(() => {
      const target = document.querySelector('[data-testid="history-entry"]')!;
      const swipe = (type: string, clientY: number) =>
        target.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches:
              type === 'touchend'
                ? []
                : [new Touch({ identifier: 1, target, clientX: 180, clientY })],
          }),
        );
      swipe('touchstart', 420);
      swipe('touchmove', 300);
      swipe('touchend', 300);
    });

    await expect(page.getByTestId('history-sheet')).toBeHidden();
  });
});
