import { expect, test } from '@playwright/test';
import { playToTheEnd, playTurn, rollDice, sitDown, waitForTurnOrEnd } from './helpers';

test.describe('a match against the scripted opponent', () => {
  test('plays from sit-down to the autopsy', async ({ page }) => {
    await sitDown(page);
    // The opponent introduces themselves before the roll — name only. The
    // bio is derived from their hidden parameters and must not leak here
    // (seed 4471's bio would mention a "salt smuggler").
    await expect(page.getByTestId('npc-intro')).toContainText('size you up in silence');
    await expect(page.getByTestId('npc-intro')).not.toContainText('smuggler');
    await expect(page.getByTestId('npc-figure')).toBeVisible();

    await rollDice(page);
    // Your dice settled under the hand: 2 apiece was configured.
    await expect(page.getByTestId('player-hand').locator('img[alt*="your die"]')).toHaveCount(2);
    await page.screenshot({
      path: `test-results/screens/${test.info().project.name}-composer.png`,
    });

    await playToTheEnd(page);
    const outcome = await page.getByTestId('result-screen').getAttribute('data-outcome');
    expect(['win', 'defeat']).toContain(outcome);
    // The final hand stays reviewable on the result screen: recap line plus
    // both revealed hands (2 dice each at match start, opponent may have 1).
    await expect(page.getByTestId('result-recap')).toContainText('The last hand:');
    expect(
      await page.getByTestId('result-recap').locator('img[alt*="die showing"]').count(),
    ).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: `test-results/screens/${test.info().project.name}-result.png` });

    await page.getByTestId('continue').click();
    await expect(page.getByTestId('autopsy-screen')).toBeVisible();
    await expect(page.getByTestId('ledger-row').first()).toBeVisible();
    await expect(page.getByTestId('total-deviation')).toHaveText(/\d+\.\d{3}/);
    await page.screenshot({
      path: `test-results/screens/${test.info().project.name}-autopsy.png`,
      fullPage: true,
    });

    // Play again returns to a fresh splash.
    await page.getByTestId('play-again').click();
    await expect(page.getByTestId('splash-screen')).toBeVisible();
  });

  test('table talk rides along with the move and lands in the history', async ({ page }) => {
    await sitDown(page);
    await rollDice(page);
    await playTurn(page, 'I never lie, you know.');
    await waitForTurnOrEnd(page);

    await page.getByTestId('history-tab').click();
    await expect(page.getByTestId('history-sheet')).toBeVisible();
    await expect(page.getByTestId('history-entry').filter({ hasText: 'I never lie' })).toHaveCount(
      1,
    );
    // The opponent's reply is in the log too (a bid or a call).
    await expect(
      page.getByTestId('history-entry').filter({ hasText: /reply comes|calls!|'/ }),
    ).not.toHaveCount(0);
  });

  test('walking away aborts the match and still grants an autopsy', async ({ page }) => {
    await sitDown(page);
    await rollDice(page);
    await page.getByTestId('walk-away').click();
    await expect(page.getByTestId('result-screen')).toHaveAttribute('data-outcome', 'abandoned', {
      timeout: 30_000,
    });
    await page.getByTestId('continue').click();
    await expect(page.getByTestId('autopsy-screen')).toBeVisible();
  });
});
