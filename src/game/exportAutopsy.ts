import type { Autopsy, DecisionRecord, Move, Seat } from '../api/types';
import type { PostmortemStat, RoundSummary } from './postmortem';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface AutopsyExportInput {
  autopsy: Autopsy;
  opponent: string;
  outcomeLabel: string;
  recap: string;
  stats: PostmortemStat[];
  rounds: RoundSummary[];
  scratchByRound: Map<number, DecisionRecord[]>;
  mySeat: Seat;
  opponentSeat: Seat;
  modelLabel: string | null;
  accounting: string;
  moveText: (move: Move) => string;
}

/** A print-ready HTML report of the *entire* autopsy — recap, every round's
 * exchange and revealed hands, the NPC's private scratchpads, its unmasked
 * profile, and the full decision ledger. Opened in a new tab and handed to
 * the browser's native print-to-PDF, so there's no PDF-generation
 * dependency to ship. */
export function autopsyReportHtml(input: AutopsyExportInput): string {
  const { autopsy, opponent, outcomeLabel, recap, stats, rounds, scratchByRound } = input;
  const { mySeat, opponentSeat, modelLabel, accounting, moveText } = input;

  const statsHtml = stats.map((s) => `<li><b>${s.value}</b> ${esc(s.label)}</li>`).join('');

  const roundsHtml = rounds
    .map((round) => {
      const exchangeHtml = round.exchange
        .map((m) => {
          const who = m.speaker === 'you' ? 'You' : esc(opponent);
          const talk = m.talk ? ` &mdash; &ldquo;${esc(m.talk)}&rdquo;` : '';
          return `<li><b>${who}:</b> ${esc(moveText(m.move))}${talk}</li>`;
        })
        .join('');
      const scratch = scratchByRound.get(round.roundNo) ?? [];
      const thinkingHtml =
        scratch.length === 0
          ? ''
          : `<div class="thinking"><p class="label">What ${esc(opponent)} was thinking</p>` +
            scratch
              .map((d) => {
                const heard = d.human_table_talk_seen
                  ? `<p class="heard">Heard from you: &ldquo;${esc(d.human_table_talk_seen)}&rdquo;</p>`
                  : '';
                return `${heard}<p>${esc(d.scratchpad || '(scripted, no inner voice)')}</p>`;
              })
              .join('') +
            '</div>';
      return `
        <section class="round">
          <h3>Round ${round.roundNo}</h3>
          <p class="headline">${esc(round.headline)}</p>
          <ol class="exchange">${exchangeHtml}</ol>
          <p class="hands">Hands &mdash; You: [${round.reveal.hands[mySeat].join(', ')}], ${esc(
            opponent,
          )}: [${round.reveal.hands[opponentSeat].join(', ')}]</p>
          ${thinkingHtml}
        </section>`;
    })
    .join('');

  const traits = autopsy.npc_profile.params;
  const ledgerHtml = autopsy.decisions
    .map(
      (d) => `<tr>
        <td>${d.round_no}</td>
        <td>${esc(moveText(d.chosen_move))}</td>
        <td>${esc(moveText(d.optimal_move))}</td>
        <td>${d.deviation_price.toFixed(3)}</td>
        <td>${d.fallback ? 'yes' : ''}</td>
        <td class="scratch">${esc(d.scratchpad)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Swindlestones autopsy — ${esc(opponent)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1d1812; max-width: 46rem; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.5; }
  h1 { font-weight: 400; margin-bottom: 0.2rem; }
  h2 { font-weight: 400; border-bottom: 1px solid #ccc; padding-bottom: 0.3rem; margin-top: 2rem; }
  h3 { font-weight: 600; margin-bottom: 0.2rem; }
  .meta { color: #555; font-size: 0.95rem; }
  .recap { font-style: italic; }
  ul.glance { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 1.5rem; }
  .round { margin-top: 1.5rem; page-break-inside: avoid; }
  .headline { font-weight: 600; }
  .exchange { padding-left: 1.2rem; }
  .hands { color: #444; }
  .thinking { background: #f7f3ea; border-left: 3px solid #b89b5e; padding: 0.6rem 1rem; margin-top: 0.6rem; font-size: 0.92rem; }
  .thinking .label { font-weight: 600; margin: 0 0 0.4rem; }
  .heard { font-style: italic; color: #555; margin: 0 0 0.3rem; }
  .traits li { margin-bottom: 0.2rem; }
  table { border-collapse: collapse; width: 100%; font-size: 0.85rem; margin-top: 0.5rem; }
  th, td { border: 1px solid #ccc; padding: 0.35rem 0.5rem; text-align: left; vertical-align: top; }
  .scratch { font-size: 0.8rem; color: #333; }
  .accounting { color: #555; font-size: 0.9rem; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>Swindlestones autopsy &mdash; ${esc(opponent)}</h1>
  <p class="meta">Outcome: ${esc(outcomeLabel)}${modelLabel ? ` &middot; Model: ${esc(modelLabel)}` : ''}</p>
  <p class="recap">${esc(recap)}</p>

  <h2>At a glance</h2>
  <ul class="glance">${statsHtml}</ul>

  <h2>Round by round</h2>
  ${roundsHtml}

  <h2>${esc(opponent)}, unmasked</h2>
  <p>${esc(autopsy.npc_profile.bio)}</p>
  <ul class="traits">
    <li>Deception: ${traits.deception.toFixed(2)}</li>
    <li>Skepticism: ${traits.skepticism.toFixed(2)}</li>
    <li>Aggression: ${traits.aggression.toFixed(2)}</li>
    <li>Chattiness: ${traits.chattiness.toFixed(2)}</li>
  </ul>

  <h2>The numbers</h2>
  <p>Total deviation price: ${autopsy.total_deviation_price.toFixed(3)}</p>
  <table>
    <thead><tr><th>Round</th><th>Played</th><th>Safest</th><th>Cost</th><th>Fallback</th><th>Scratchpad</th></tr></thead>
    <tbody>${ledgerHtml}</tbody>
  </table>
  <p class="accounting">${esc(accounting)}</p>
</body>
</html>`;
}

/** Opens the report in a new tab and hands it to the browser's native
 * print dialog — "Save as PDF" is a built-in destination there, so no
 * PDF-generation dependency is needed. */
export function printAutopsyReport(html: string): void {
  // No noopener/noreferrer here: we need the returned reference to write
  // into the new window, and it only ever holds our own generated markup.
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // The new document needs a tick to lay out before print() can measure it.
  setTimeout(() => win.print(), 250);
}
