import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { getAutopsy } from '../../api/client';
import type { Autopsy, DecisionRecord, Move } from '../../api/types';
import { otherSeat } from '../../api/types';
import { spokenBid } from '../../game/bids';
import { buildPostmortem } from '../../game/postmortem';
import { useGameStore } from '../../game/store';
import { Button } from '../ui/Button';
import { Die } from '../scene/Die';
import styles from './AutopsyScreen.module.css';

function moveText(move: Move): string {
  return move.action === 'bid' ? spokenBid(move.bid) : 'Call!';
}

const TRAITS = ['deception', 'skepticism', 'aggression', 'chattiness'] as const;

const OUTCOME_LABEL = { win: 'Victory', defeat: 'Defeat', abandoned: 'Walked away' } as const;

const rise = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0 },
};

export function AutopsyScreen() {
  const matchId = useGameStore((s) => s.matchId);
  const isHuman = useGameStore((s) => s.isHuman);
  const mySeat = useGameStore((s) => s.mySeat);
  const npcName = useGameStore((s) => s.npcName);
  const outcome = useGameStore((s) => s.outcome) ?? 'abandoned';
  const view = useGameStore((s) => s.view);
  const transcript = useGameStore((s) => s.transcript);
  const playAgain = useGameStore((s) => s.playAgain);

  const opponent = npcName || 'your opponent';
  const opponentSeat = otherSeat(mySeat);

  // NPC enrichment (scratchpads, the unmasked character, the numbers) loads in
  // the background; the transcript-driven post-mortem renders immediately, and
  // human matches never fetch it.
  const [autopsy, setAutopsy] = useState<Autopsy | null>(null);
  useEffect(() => {
    if (!matchId || isHuman) return;
    getAutopsy(matchId).then(setAutopsy, () => setAutopsy(null));
  }, [matchId, isHuman]);

  const post = useMemo(
    () => buildPostmortem(view?.reveals ?? [], transcript, mySeat, opponent, outcome),
    [view?.reveals, transcript, mySeat, opponent, outcome],
  );

  const scratchByRound = useMemo(() => {
    const map = new Map<number, DecisionRecord[]>();
    for (const d of autopsy?.decisions ?? []) {
      const list = map.get(d.round_no) ?? [];
      list.push(d);
      map.set(d.round_no, list);
    }
    return map;
  }, [autopsy]);

  const ledger = autopsy?.decisions ?? [];
  const tokens = ledger.reduce(
    (acc, d) => ({
      prompt: acc.prompt + (d.prompt_tokens ?? 0),
      cached: acc.cached + (d.cached_tokens ?? 0),
      completion: acc.completion + (d.completion_tokens ?? 0),
    }),
    { prompt: 0, cached: 0, completion: 0 },
  );
  const fallbacks = ledger.filter((d) => d.fallback).length;
  const reprompts = ledger.reduce((n, d) => n + d.reprompts, 0);

  return (
    <div className={styles.page} data-testid="autopsy-screen">
      <motion.article
        className={styles.report}
        initial="hidden"
        animate="shown"
        transition={{ staggerChildren: 0.08 }}
      >
        <motion.header className={styles.header} variants={rise}>
          <p className={styles.eyebrow} data-outcome={outcome}>
            {OUTCOME_LABEL[outcome]}
          </p>
          <h1 className={styles.title}>The Reckoning</h1>
          <p className={styles.recap}>{post.recap}</p>
        </motion.header>

        <motion.section className={styles.glance} variants={rise} aria-label="At a glance">
          {post.stats.map((stat) => (
            <div key={stat.label} className={styles.tile}>
              <span className={styles.tileValue}>{stat.value}</span>
              <span className={styles.tileLabel}>{stat.label}</span>
            </div>
          ))}
        </motion.section>

        <motion.section className={styles.section} variants={rise}>
          <h2 className={styles.h2}>Round by round</h2>
          <p className={styles.hint}>Open a round to see the exchange and the hands it hid.</p>
          <div className={styles.rounds}>
            {post.rounds.map((round) => {
              const scratch = scratchByRound.get(round.roundNo) ?? [];
              return (
                <details key={round.roundNo} className={styles.round} data-testid="round-card">
                  <summary className={styles.roundHead}>
                    <span className={styles.roundNo}>Round {round.roundNo}</span>
                    <span className={styles.roundLine}>{round.headline}</span>
                  </summary>

                  <div className={styles.roundBody}>
                    <ol className={styles.exchange}>
                      {round.exchange.map((m, i) => (
                        <li
                          key={i}
                          className={m.speaker === 'you' ? styles.exYou : styles.exNpc}
                        >
                          <span className={styles.who}>{m.speaker === 'you' ? 'You' : opponent}</span>
                          <span className={styles.deed}>{moveText(m.move)}</span>
                          {m.talk && <span className={styles.talk}>“{m.talk}”</span>}
                        </li>
                      ))}
                    </ol>

                    <div className={styles.hands}>
                      <div className={styles.handRow}>
                        <span className={styles.handLabel}>You</span>
                        <div className={styles.diceRow}>
                          {round.reveal.hands[mySeat].map((f, i) => (
                            <Die key={i} face={f as 1 | 2 | 3 | 4} owner="player" small />
                          ))}
                        </div>
                      </div>
                      <div className={styles.handRow}>
                        <span className={styles.handLabel}>{opponent}</span>
                        <div className={styles.diceRow}>
                          {round.reveal.hands[opponentSeat].map((f, i) => (
                            <Die key={i} face={f as 1 | 2 | 3 | 4} owner="npc" small />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className={styles.verdict}>
                      Final bid {spokenBid(round.reveal.final_bid)}, {round.reveal.actual_count} on
                      the table ({round.reveal.bid_met ? 'the bid held' : 'a bluff'}).
                    </p>

                    {scratch.length > 0 && (
                      <details className={styles.think}>
                        <summary>What {opponent} was thinking</summary>
                        {scratch.map((d, i) => (
                          <div key={i} className={styles.thought}>
                            <p>{d.scratchpad || '(scripted — no inner voice)'}</p>
                            {d.human_table_talk_seen && (
                              <p className={styles.heard}>
                                Heard from you: “{d.human_table_talk_seen}”
                              </p>
                            )}
                          </div>
                        ))}
                      </details>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </motion.section>

        {autopsy && (
          <motion.section className={styles.section} variants={rise}>
            <h2 className={styles.h2}>{autopsy.npc_profile.name}, unmasked</h2>
            <p className={styles.bio}>{autopsy.npc_profile.bio}</p>
            <div className={styles.traits}>
              {TRAITS.map((trait) => (
                <div key={trait} className={styles.trait}>
                  <span className={styles.traitName}>{trait}</span>
                  <div className={styles.traitTrack}>
                    <div
                      className={styles.traitFill}
                      style={{ width: `${Math.round(autopsy.npc_profile.params[trait] * 100)}%` }}
                    />
                  </div>
                  <span className={styles.traitValue}>
                    {autopsy.npc_profile.params[trait].toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {autopsy && (
          <motion.section className={styles.section} variants={rise}>
            <details className={styles.numbers}>
              <summary data-testid="numbers-toggle">The numbers</summary>
              <p className={styles.explain}>
                Each decision priced against the safest single-ply move — not the game-theoretic
                optimum, so a shrewd bluff still reads as a “deviation.” Total:{' '}
                <b data-testid="total-deviation">{autopsy.total_deviation_price.toFixed(3)}</b>
              </p>
              <table className={styles.ledger}>
                <thead>
                  <tr>
                    <th>Rd</th>
                    <th>Played</th>
                    <th>Safest</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((d, i) => (
                    <tr key={i} data-testid="ledger-row">
                      <td>{d.round_no}</td>
                      <td>
                        {moveText(d.chosen_move)}
                        {d.fallback && <span className={styles.flag}> (fallback)</span>}
                      </td>
                      <td>{moveText(d.optimal_move)}</td>
                      <td>{d.deviation_price.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={styles.explain}>
                {ledger.length} decisions · {reprompts} reprompts · {fallbacks} scripted fallbacks
                {tokens.prompt > 0 && (
                  <>
                    {' '}
                    · {tokens.prompt.toLocaleString()} prompt ({tokens.cached.toLocaleString()}{' '}
                    cached) · {tokens.completion.toLocaleString()} completion tokens
                  </>
                )}
              </p>
            </details>
          </motion.section>
        )}

        <motion.div className={styles.actions} variants={rise}>
          <Button onClick={playAgain} data-testid="play-again">
            Play another game
          </Button>
        </motion.div>
      </motion.article>
    </div>
  );
}
