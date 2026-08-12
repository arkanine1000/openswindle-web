import type { Autopsy, DecisionRecord, Move, Seat } from '../api/types';
import type { PostmortemStat, RoundSummary } from './postmortem';

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
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
  /** Empty for a human opponent, who has no seeded persona. */
  npcSeed: string;
  accounting: string;
  moveText: (move: Move) => string;
}

/** A markdown report of the *entire* autopsy screen — recap, every round's
 * exchange and revealed hands, the NPC's private scratchpads, its unmasked
 * profile, and the full decision ledger — for offline analysis. */
export function autopsyMarkdown(input: AutopsyExportInput): string {
  const { autopsy, opponent, outcomeLabel, recap, stats, rounds, scratchByRound } = input;
  const { mySeat, opponentSeat, modelLabel, npcSeed, accounting, moveText } = input;
  const lines: string[] = [
    `# Swindlestones autopsy — ${opponent}`,
    '',
    `- Outcome: ${outcomeLabel}`,
  ];
  if (modelLabel) lines.push(`- Model: ${modelLabel}`);
  if (npcSeed) lines.push(`- Opponent seed: ${npcSeed}`);
  lines.push('', recap, '', '## At a glance', '');
  for (const stat of stats) lines.push(`- ${stat.label}: ${stat.value}`);

  lines.push('', '## Round by round');
  for (const round of rounds) {
    lines.push('', `### Round ${round.roundNo}`, '', round.headline, '');
    for (const m of round.exchange) {
      const who = m.speaker === 'you' ? 'You' : opponent;
      const talk = m.talk ? ` — "${m.talk}"` : '';
      lines.push(`- ${who}: ${moveText(m.move)}${talk}`);
    }
    lines.push(
      '',
      `Hands: You ${JSON.stringify(round.reveal.hands[mySeat])}, ` +
        `${opponent} ${JSON.stringify(round.reveal.hands[opponentSeat])}`,
    );
    const scratch = scratchByRound.get(round.roundNo) ?? [];
    if (scratch.length > 0) {
      lines.push('', `**What ${opponent} was thinking:**`);
      for (const d of scratch) {
        if (d.human_table_talk_seen) lines.push(`- Heard from you: "${d.human_table_talk_seen}"`);
        lines.push(`- ${d.scratchpad || '(scripted, no inner voice)'}`);
      }
    }
  }

  lines.push('', `## ${opponent}, unmasked`, '', autopsy.npc_profile.bio, '');
  const traits = autopsy.npc_profile.params;
  lines.push(
    `- Deception: ${traits.deception.toFixed(2)}`,
    `- Skepticism: ${traits.skepticism.toFixed(2)}`,
    `- Aggression: ${traits.aggression.toFixed(2)}`,
    `- Chattiness: ${traits.chattiness.toFixed(2)}`,
  );

  lines.push(
    '',
    '## The numbers',
    '',
    `Total deviation price: ${autopsy.total_deviation_price.toFixed(3)}`,
    '',
    '| Round | Played | Safest | Cost | Fallback | Scratchpad |',
    '|---|---|---|---|---|---|',
  );
  for (const d of autopsy.decisions) {
    lines.push(
      `| ${d.round_no} | ${escapeCell(moveText(d.chosen_move))} | ` +
        `${escapeCell(moveText(d.safest_move))} | ${d.deviation_price.toFixed(3)} | ` +
        `${d.fallback ? 'yes' : ''} | ${escapeCell(d.scratchpad)} |`,
    );
  }
  lines.push('', accounting);

  return lines.join('\n');
}

/** Triggers a browser download of the given text as a file — no server
 * round-trip and no new dependency, just a Blob + an anchor click. */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
