import { expect, test } from '@playwright/test';
import { playTurn, submitCall } from './helpers';

/**
 * Two browser contexts share one server-held match: seat A creates an invite,
 * seat B opens the link, and the poll loop carries each move — including a
 * call's table talk — to the other side.
 */
test.describe('human vs human (invite match)', () => {
  test('invite link connects two seats and syncs a bid, call, and its table talk', async ({
    browser,
  }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      // Seat A creates the match and reads the shareable link. The single CTA
      // reel defaults to "bot"; one toggle turns it to "pal".
      await pageA.goto('/?choreo=fast');
      await pageA.getByTestId('opponent-toggle').click();
      await pageA.getByTestId('sit-down').click();
      await expect(pageA.getByTestId('waiting-screen')).toBeVisible();
      const link = await pageA.getByTestId('invite-link').inputValue();
      expect(link).toContain('?match=');

      // Seat B opens the invite and is dealt in automatically.
      const sep = link.includes('?') ? '&' : '?';
      await pageB.goto(`${link}${sep}choreo=fast`);

      // Once B has joined, A's turn opens (poll-driven, so allow a few ticks).
      await expect(pageA.getByTestId('player-composer')).toBeVisible({ timeout: 20_000 });

      // A opens with a bid and some table talk.
      await playTurn(pageA, 'I read you now.');

      // B receives A's utterance and the turn passes across the table.
      await expect(
        pageB.getByTestId('npc-bubble').filter({ hasText: 'I read you now.' }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(pageB.getByTestId('player-composer')).toBeVisible({ timeout: 20_000 });

      // B calls with parting words — the case where table talk isn't a bid.
      await pageB.getByTestId('talk-input').fill('You are bluffing.');
      await submitCall(pageB);

      // A must see B's call table talk. The rolling bubble is fleeting under
      // ?choreo=fast, so assert against the persistent history log instead.
      await pageA.getByTestId('history-tab').click();
      await expect(
        pageA.getByTestId('history-entry').filter({ hasText: 'You are bluffing.' }),
      ).toBeVisible({ timeout: 20_000 });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
