import { useEffect, useState } from 'react';
import { getAutopsy } from '../../api/client';
import type { Autopsy, Move } from '../../api/types';
import { HUMAN_SEAT } from '../../api/types';
import { spokenBid } from '../../game/bids';
import { useGameStore } from '../../game/store';
import styles from './AutopsyScreen.module.css';

function moveText(move: Move): string {
  return move.action === 'bid' ? spokenBid(move.bid) : 'call';
}

const TRAITS = ['deception', 'skepticism', 'aggression', 'chattiness'] as const;

export function AutopsyScreen() {
  const matchId = useGameStore((s) => s.matchId);
  const playAgain = useGameStore((s) => s.playAgain);
  const [autopsy, setAutopsy] = useState<Autopsy | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;
    getAutopsy(matchId).then(setAutopsy, (err: Error) => setError(err.message));
  }, [matchId]);

  if (error) {
    return (
      <div className={styles.page} data-testid="autopsy-screen">
        <p className={styles.error}>{error}</p>
        <button type="button" className={styles.again} onClick={playAgain} data-testid="play-again">
          Back to the table
        </button>
      </div>
    );
  }

  if (!autopsy) {
    return (
      <div className={styles.page} data-testid="autopsy-screen">
        <p className={styles.loading}>Laying out the post-mortem…</p>
      </div>
    );
  }

  const { npc_profile: profile, decisions } = autopsy;
  const tokens = decisions.reduce(
    (acc, d) => ({
      prompt: acc.prompt + (d.prompt_tokens ?? 0),
      cached: acc.cached + (d.cached_tokens ?? 0),
      completion: acc.completion + (d.completion_tokens ?? 0),
    }),
    { prompt: 0, cached: 0, completion: 0 },
  );
  const fallbacks = decisions.filter((d) => d.fallback).length;
  const reprompts = decisions.reduce((n, d) => n + d.reprompts, 0);

  return (
    <div className={styles.page} data-testid="autopsy-screen">
      <article className={styles.report}>
        <header className={styles.header}>
          <p className={styles.kicker}>Post-match autopsy</p>
          <h1>{profile.name}, unmasked</h1>
          <p className={styles.bio}>{profile.bio}</p>
          <p className={styles.seed}>
            <code>{profile.seed}</code> ·{' '}
            {autopsy.winner === null
              ? 'match abandoned'
              : autopsy.winner === HUMAN_SEAT
                ? 'you won'
                : `${profile.name} won`}
          </p>
        </header>

        <section className={styles.section}>
          <h2>The hidden hand</h2>
          <div className={styles.traits}>
            {TRAITS.map((trait) => (
              <div key={trait} className={styles.trait}>
                <span className={styles.traitName}>{trait}</span>
                <div className={styles.traitTrack}>
                  <div
                    className={styles.traitFill}
                    style={{ width: `${Math.round(profile.params[trait] * 100)}%` }}
                  />
                </div>
                <span className={styles.traitValue}>{profile.params[trait].toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Deviation ledger</h2>
          <p className={styles.explain}>
            Every decision, priced against the mathematically optimal move. Total deviation:{' '}
            <b data-testid="total-deviation">{autopsy.total_deviation_price.toFixed(3)}</b>
          </p>
          <table className={styles.ledger}>
            <thead>
              <tr>
                <th>Rd</th>
                <th>Played</th>
                <th>Optimal</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((d, i) => (
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
        </section>

        <section className={styles.section}>
          <h2>What they were thinking</h2>
          {decisions.map((d, i) => (
            <details key={i} className={styles.scratchpad}>
              <summary>
                Round {d.round_no} — played {moveText(d.chosen_move)}
                {d.table_talk && <> · “{d.table_talk}”</>}
              </summary>
              <p>{d.scratchpad || 'No scratchpad recorded (scripted decision).'}</p>
              {d.human_table_talk_seen && (
                <p className={styles.heard}>Heard from you: “{d.human_table_talk_seen}”</p>
              )}
            </details>
          ))}
        </section>

        <section className={styles.section}>
          <h2>Accounting</h2>
          <p className={styles.explain}>
            {decisions.length} decisions · {reprompts} reprompts · {fallbacks} scripted fallbacks
            {tokens.prompt > 0 && (
              <>
                {' '}
                · {tokens.prompt.toLocaleString()} prompt tokens ({tokens.cached.toLocaleString()}{' '}
                cached) · {tokens.completion.toLocaleString()} completion tokens
              </>
            )}
          </p>
        </section>

        <button type="button" className={styles.again} onClick={playAgain} data-testid="play-again">
          Play another game
        </button>
      </article>
    </div>
  );
}
