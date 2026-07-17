import type { Page } from '@playwright/test';

/** Deals are salted server-side (they cannot be replayed run-to-run), so
 * match tests are strategy loops, not fixed move scripts. */

export async function sitDown(
  page: Page,
  { seed = 'seed 4471', dice = 2 }: { seed?: string; dice?: number } = {},
): Promise<void> {
  // ?choreo=fast collapses presentation pauses so tests aren't theatrical.
  await page.goto('/?choreo=fast');
  await page.getByText('Choose your opponent').click();
  await page.getByTestId('seed-input').fill(seed);
  await page.getByTestId('engine-select').selectOption('scripted');
  await page.locator(`input[name="dice"][value="${dice}"]`).check();
  await page.getByTestId('sit-down').click();
  await page.getByTestId('npc-intro').waitFor();
}

export async function rollDice(page: Page): Promise<void> {
  await page.getByTestId('roll-dice').click();
  await page.getByTestId('player-composer').waitFor({ timeout: 15_000 });
}

/** CALL! lives in the carousel with two-tap semantics: first tap arms
 * (centers) it, the second confirms. */
export async function submitCall(page: Page): Promise<void> {
  const call = page.getByTestId('call-button');
  if ((await call.getAttribute('data-armed')) !== 'true') {
    await call.click();
  }
  await call.click();
}

/** One human turn: raise minimally when the strip offers a bid, else call. */
export async function playTurn(page: Page, talk?: string): Promise<void> {
  if (talk !== undefined) {
    await page.getByTestId('talk-input').fill(talk);
  }
  const strip = page.getByTestId('confirm-strip');
  const stripText = (await strip.textContent()) ?? '';
  if (stripText.startsWith('Bid')) {
    await strip.click();
  } else {
    await submitCall(page);
  }
}

/** Either the composer comes back (your turn) or the match is over. */
export async function waitForTurnOrEnd(page: Page): Promise<'turn' | 'end'> {
  const result = await Promise.race([
    page
      .getByTestId('result-screen')
      .waitFor({ timeout: 60_000 })
      .then(() => 'end' as const),
    page
      .getByTestId('player-composer')
      .waitFor({ timeout: 60_000 })
      .then(() => 'turn' as const),
  ]);
  return result;
}

/** Minimal-raise strategy until someone runs out of dice. */
export async function playToTheEnd(page: Page): Promise<void> {
  for (let turn = 0; turn < 150; turn++) {
    if ((await waitForTurnOrEnd(page)) === 'end') return;
    // Call every third opportunity to keep rounds ending.
    const canCall = (await page.getByTestId('call-button').count()) > 0;
    const stripText = (await page.getByTestId('confirm-strip').textContent()) ?? '';
    if (canCall && (turn % 3 === 2 || !stripText.startsWith('Bid'))) {
      await submitCall(page);
    } else {
      await page.getByTestId('confirm-strip').click();
    }
  }
  throw new Error('Match did not finish within 150 turns');
}
