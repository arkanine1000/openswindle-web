import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAutopsy } from '../../api/client';
import type { Autopsy, DecisionRecord, Move } from '../../api/types';
import { otherSeat } from '../../api/types';
import { spokenBid } from '../../game/bids';
import { buildPostmortem } from '../../game/postmortem';
import { useGameStore } from '../../game/store';
import { formatFixed, formatNumber } from '../../i18n/format';
import { Button } from '../ui/Button';
import { Die } from '../scene/Die';
import styles from './AutopsyScreen.module.css';

type TFn = ReturnType<typeof useTranslation>['t'];

function moveText(move: Move, t: TFn): string {
  return move.action === 'bid' ? spokenBid(move.bid) : t('game.callShout');
}

const TRAITS = ['deception', 'skepticism', 'aggression', 'chattiness'] as const;

const rise = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0 },
};

export function AutopsyScreen() {
  const { t } = useTranslation();
  const matchId = useGameStore((s) => s.matchId);
  const isHuman = useGameStore((s) => s.isHuman);
  const mySeat = useGameStore((s) => s.mySeat);
  const npcName = useGameStore((s) => s.npcName);
  const outcome = useGameStore((s) => s.outcome) ?? 'abandoned';
  const view = useGameStore((s) => s.view);
  const transcript = useGameStore((s) => s.transcript);
  const playAgain = useGameStore((s) => s.playAgain);

  const opponent = npcName;
  const opponentSeat = otherSeat(mySeat);
  const outcomeLabel = {
    win: t('autopsy.outcomeWin'),
    defeat: t('autopsy.outcomeDefeat'),
    abandoned: t('autopsy.outcomeAbandoned'),
  }[outcome];

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
    // The i18n language drives the baked headline/recap strings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view?.reveals, transcript, mySeat, opponent, outcome, t],
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

  const accounting = [
    t('autopsy.acctDecisions', { count: ledger.length }),
    t('autopsy.acctReprompts', { count: reprompts }),
    t('autopsy.acctFallbacks', { count: fallbacks }),
  ].join(' · ');

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
            {outcomeLabel}
          </p>
          <h1 className={styles.title}>{t('autopsy.title')}</h1>
          <p className={styles.recap}>{post.recap}</p>
        </motion.header>

        <motion.section className={styles.glance} variants={rise} aria-label={t('autopsy.glance')}>
          {post.stats.map((stat) => (
            <div key={stat.label} className={styles.tile}>
              <span className={styles.tileValue}>{stat.value}</span>
              <span className={styles.tileLabel}>{stat.label}</span>
            </div>
          ))}
        </motion.section>

        <motion.section className={styles.section} variants={rise}>
          <h2 className={styles.h2}>{t('autopsy.roundByRound')}</h2>
          <p className={styles.hint}>{t('autopsy.roundHint')}</p>
          <div className={styles.rounds}>
            {post.rounds.map((round) => {
              const scratch = scratchByRound.get(round.roundNo) ?? [];
              return (
                <details key={round.roundNo} className={styles.round} data-testid="round-card">
                  <summary className={styles.roundHead}>
                    <span className={styles.roundNo}>{t('autopsy.round', { n: round.roundNo })}</span>
                    <span className={styles.roundLine}>{round.headline}</span>
                    <ChevronDown className={styles.chevron} size="1.1em" aria-hidden />
                  </summary>

                  <div className={styles.roundBody}>
                    <ol className={styles.exchange}>
                      {round.exchange.map((m, i) => (
                        <li key={i} className={m.speaker === 'you' ? styles.exYou : styles.exNpc}>
                          <span className={styles.who}>
                            {m.speaker === 'you' ? t('autopsy.you') : opponent}
                          </span>
                          <span className={styles.deed}>{moveText(m.move, t)}</span>
                          {m.talk && (
                            <span className={styles.talk}>
                              {t('autopsy.quoted', { text: m.talk })}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>

                    <div className={styles.hands}>
                      <div className={styles.handRow}>
                        <span className={styles.handLabel}>{t('autopsy.you')}</span>
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
                      {t('autopsy.verdict', {
                        bid: spokenBid(round.reveal.final_bid),
                        count: round.reveal.actual_count,
                        held: round.reveal.bid_met
                          ? t('autopsy.verdictHeld')
                          : t('autopsy.verdictBluff'),
                      })}
                    </p>

                    {scratch.length > 0 && (
                      <details className={styles.think}>
                        <summary>{t('autopsy.thinking', { opponent })}</summary>
                        {scratch.map((d, i) => (
                          <div key={i} className={styles.thought}>
                            {d.human_table_talk_seen && (
                              <p className={styles.heard}>
                                {t('autopsy.heardFromYou', { talk: d.human_table_talk_seen })}
                              </p>
                            )}
                            <p>{d.scratchpad || t('autopsy.scriptedNoVoice')}</p>
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
            <h2 className={styles.h2}>
              {t('autopsy.unmasked', { name: autopsy.npc_profile.name })}
            </h2>
            <p className={styles.bio}>{autopsy.npc_profile.bio}</p>
            <div className={styles.traits}>
              {TRAITS.map((trait) => (
                <div key={trait} className={styles.trait}>
                  <span className={styles.traitName}>
                    {t(`autopsy.trait${trait.charAt(0).toUpperCase()}${trait.slice(1)}` as 'autopsy.traitDeception')}
                  </span>
                  <div className={styles.traitTrack}>
                    <div
                      className={styles.traitFill}
                      style={{ width: `${Math.round(autopsy.npc_profile.params[trait] * 100)}%` }}
                    />
                  </div>
                  <span className={styles.traitValue}>
                    {formatFixed(autopsy.npc_profile.params[trait], 2)}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {autopsy && (
          <motion.section className={styles.section} variants={rise}>
            <details className={styles.numbers}>
              <summary data-testid="numbers-toggle">{t('autopsy.numbers')}</summary>
              <p className={styles.explain}>
                {t('autopsy.numbersExplain')}
                <b data-testid="total-deviation">{formatFixed(autopsy.total_deviation_price, 3)}</b>
              </p>
              <table className={styles.ledger}>
                <thead>
                  <tr>
                    <th>{t('autopsy.ledgerRd')}</th>
                    <th>{t('autopsy.ledgerPlayed')}</th>
                    <th>{t('autopsy.ledgerSafest')}</th>
                    <th>{t('autopsy.ledgerPrice')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((d, i) => (
                    <tr key={i} data-testid="ledger-row">
                      <td>{d.round_no}</td>
                      <td>
                        {moveText(d.chosen_move, t)}
                        {d.fallback && <span className={styles.flag}>{t('autopsy.fallbackTag')}</span>}
                      </td>
                      <td>{moveText(d.optimal_move, t)}</td>
                      <td>{formatFixed(d.deviation_price, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={styles.explain}>
                {accounting}
                {tokens.prompt > 0 &&
                  ` · ${t('autopsy.acctTokens', {
                    prompt: formatNumber(tokens.prompt),
                    cached: formatNumber(tokens.cached),
                    completion: formatNumber(tokens.completion),
                  })}`}
              </p>
            </details>
          </motion.section>
        )}

        <motion.div className={styles.actions} variants={rise}>
          <Button onClick={playAgain} data-testid="play-again">
            {t('autopsy.playAnother')}
          </Button>
        </motion.div>
      </motion.article>
    </div>
  );
}
