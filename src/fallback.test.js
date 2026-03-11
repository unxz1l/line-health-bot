import { describe, it, expect } from 'vitest';
import { getRandomFallback } from './fallback.js';

describe('getRandomFallback', () => {
  it('returns a morning_exercise fallback message', () => {
    const msg = getRandomFallback('morning_exercise');
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe('string');
  });

  it('morning_exercise messages mention exercise/sun/sugar themes', () => {
    // Collect all unique messages by calling many times
    const messages = new Set();
    for (let i = 0; i < 50; i++) {
      messages.add(getRandomFallback('morning_exercise'));
    }
    const all = [...messages].join(' ');
    // Should contain exercise/outdoor/sugar-related content
    expect(all).toMatch(/運動|走走|曬太陽|出門|慢跑|快走|散步/);
    expect(all).toMatch(/無糖|少.*糖|甜/);
  });

  it('returns an evening_medicine fallback message', () => {
    const msg = getRandomFallback('evening_medicine');
    expect(msg).toBeTruthy();
    expect(msg).toMatch(/藥|吃/);
  });

  it('evening_medicine messages ask user to report back', () => {
    const messages = new Set();
    for (let i = 0; i < 50; i++) {
      messages.add(getRandomFallback('evening_medicine'));
    }
    const all = [...messages].join(' ');
    // Should mention reporting back
    expect(all).toMatch(/回.*訊息|說一聲|報告/);
  });

  it('no longer has morning_medicine or sleep fallbacks', () => {
    // These old types should fall back to reply messages
    const morningMed = getRandomFallback('morning_medicine');
    const sleep = getRandomFallback('sleep');
    const reply = getRandomFallback('reply');
    // They should return a reply-type fallback (not crash)
    expect(morningMed).toBeTruthy();
    expect(sleep).toBeTruthy();
  });

  it('falls back to reply for unknown types', () => {
    const msg = getRandomFallback('nonexistent_type');
    expect(msg).toBeTruthy();
  });
});
