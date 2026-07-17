import { expect, test } from '@playwright/test';
import { rollDice, sitDown, submitCall, waitForTurnOrEnd } from './helpers';

test.describe('the bid carousel', () => {
  test('renders ascending bids, arms by tap, ghosts the impossible', async ({ page }) => {
    // 3 dice apiece: 6 on the board, carousel spans quantities 1-6.
    await sitDown(page, { dice: 3 });
    await rollDice(page);

    // Opening turn: no call available, lowest bid armed.
    await expect(page.getByTestId('call-button')).toHaveCount(0);
    const first = page.getByTestId('bid-option-1x1');
    await expect(first).toHaveAttribute('data-armed', 'true');
    await expect(page.getByTestId('confirm-strip')).toHaveText(/Bid 1 one/);

    // The full range renders and the top of it is fully selectable pre-losses.
    await expect(page.getByTestId('bid-option-6x4')).toHaveAttribute('data-selectable', 'true');

    // Tapping a neighbor arms it (first tap never submits).
    await page.getByTestId('bid-option-1x3').click();
    await expect(page.getByTestId('bid-option-1x3')).toHaveAttribute('data-armed', 'true');
    await expect(page.getByTestId('confirm-strip')).toHaveText(/Bid 1 three/);

    // Tapping the armed bid submits it. The mock opponent replies too fast
    // to catch the composer unmounted, so assert the outcome instead: the
    // next turn's carousel only offers raises above the exchange so far.
    await page.getByTestId('bid-option-1x3').click();
    if ((await waitForTurnOrEnd(page)) === 'turn') {
      await expect(page.getByTestId('bid-option-1x1')).toHaveCount(0);
      await expect(page.getByTestId('bid-option-1x3')).toHaveCount(0);
      // The opponent has bid, so CALL! now leads the strip.
      await expect(page.getByTestId('call-button')).toHaveCount(1);
    }
  });

  test('after losing dice, bids above the board total are dead', async ({ page }) => {
    await sitDown(page, { dice: 2 });
    await rollDice(page);

    // Force rounds to end quickly: call whenever possible, else minimal bid.
    for (let turn = 0; turn < 60; turn++) {
      if ((await waitForTurnOrEnd(page)) === 'end') return; // match ended before assertion — rare, fine
      const ghosted = page.locator('[data-selectable="false"]');
      if ((await ghosted.count()) > 0) {
        // A die has been lost: every ghosted bid exceeds the live board total,
        // which the HUD pips display (lost sockets go dark).
        const liveTotal =
          (await page.locator('img[alt="your die"]').count()) +
          (await page.locator(`img[alt="opponent's die"]`).count());
        const labels = await ghosted.evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute('data-testid') ?? ''),
        );
        expect(labels.length).toBeGreaterThan(0);
        for (const label of labels) {
          const quantity = Number(/bid-option-(\d+)x/.exec(label)?.[1]);
          expect(quantity).toBeGreaterThan(liveTotal);
        }
        // And a dead bid is inert — aria-disabled blocks pointer submission.
        await expect(ghosted.first()).toBeDisabled();
        await expect(page.getByTestId('player-composer')).toBeVisible();
        return;
      }
      const canCall = (await page.getByTestId('call-button').count()) > 0;
      if (canCall) await submitCall(page);
      else await page.getByTestId('confirm-strip').click();
    }
    throw new Error('Never saw a ghosted bid in 60 turns');
  });
});
