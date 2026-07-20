import { describe, expect, it } from 'vitest';
import {
  MAX_TALK_LENGTH,
  TABLE_TALK,
  markTalkUsed,
  pickTalk,
  talkLevel,
  type TalkLevel,
} from '../src/game/tableTalk';

describe('talkLevel', () => {
  it('scales with the bid quantity share of dice in play', () => {
    expect(talkLevel(1, 12)).toBe(0);
    expect(talkLevel(3, 12)).toBe(0);
    expect(talkLevel(4, 12)).toBe(1);
    expect(talkLevel(6, 12)).toBe(2);
    expect(talkLevel(8, 12)).toBe(3);
    expect(talkLevel(10, 12)).toBe(4);
  });

  it('treats the same quantity as bolder when fewer dice remain', () => {
    expect(talkLevel(3, 12)).toBe(0);
    expect(talkLevel(3, 4)).toBe(3);
    expect(talkLevel(4, 4)).toBe(4);
  });

  it('never divides by zero', () => {
    expect(talkLevel(1, 0)).toBe(4);
  });
});

describe('TABLE_TALK', () => {
  it('offers at least eight phrases at every level', () => {
    expect(TABLE_TALK).toHaveLength(5);
    for (const phrases of TABLE_TALK) {
      expect(phrases.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('keeps every phrase within the mobile bubble budget', () => {
    for (const phrases of TABLE_TALK) {
      for (const phrase of phrases) {
        expect(phrase.length, phrase).toBeLessThanOrEqual(MAX_TALK_LENGTH);
      }
    }
  });
});

describe('pickTalk', () => {
  it('returns a phrase from the requested level', () => {
    for (let level = 0; level < TABLE_TALK.length; level++) {
      const phrase = pickTalk(level as TalkLevel);
      expect(TABLE_TALK[level]).toContain(phrase);
    }
  });

  it('never offers the phrase used on the last bid', () => {
    for (let i = 0; i < 50; i++) {
      const used = pickTalk(2);
      markTalkUsed(used);
      expect(pickTalk(2)).not.toBe(used);
    }
  });

  it('excludes the last-used phrase without consuming previews', () => {
    const used = pickTalk(3);
    markTalkUsed(used);
    // Repeated previews (no markTalkUsed) keep excluding the same phrase.
    for (let i = 0; i < 25; i++) {
      expect(pickTalk(3)).not.toBe(used);
    }
  });
});
