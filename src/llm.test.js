import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateReminder, generateReply } from './llm.js';

vi.mock('./logger.js', () => ({ log: vi.fn() }));
vi.mock('./fallback.js', () => ({
  getRandomFallback: vi.fn(() => 'fallback message'),
}));

const env = { GROQ_API_KEY: 'test-key' };

// Helper to mock global fetch
function mockFetch(content, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve({ choices: [{ message: { content } }] }),
    text: () => Promise.resolve(content || 'error'),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generateReminder', () => {
  it('calls Groq with morning_exercise prompt', async () => {
    mockFetch('早安～出門走走吧');
    const msg = await generateReminder('morning_exercise', env);

    expect(msg).toBe('早安～出門走走吧');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const prompt = body.messages[0].content;
    expect(prompt).toMatch(/運動/);
    expect(prompt).toMatch(/曬太陽/);
    expect(prompt).toMatch(/無糖/);
    expect(prompt).toMatch(/出門/);
  });

  it('calls Groq with evening_medicine prompt that asks for report-back', async () => {
    mockFetch('吃藥囉～吃完跟我說');
    const msg = await generateReminder('evening_medicine', env);

    expect(msg).toBe('吃藥囉～吃完跟我說');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const prompt = body.messages[0].content;
    expect(prompt).toMatch(/吃.*藥/);
    expect(prompt).toMatch(/回.*訊息|讓阿臻知道/);
  });

  it('uses fallback when Groq returns empty', async () => {
    mockFetch(null);
    const { getRandomFallback } = await import('./fallback.js');
    const msg = await generateReminder('morning_exercise', env);
    expect(getRandomFallback).toHaveBeenCalledWith('morning_exercise');
    expect(msg).toBe('fallback message');
  });

  it('uses fallback when Groq request fails', async () => {
    mockFetch('error body', false, 500);
    const { getRandomFallback } = await import('./fallback.js');
    const msg = await generateReminder('morning_exercise', env);
    expect(getRandomFallback).toHaveBeenCalledWith('morning_exercise');
  });
});

describe('generateReply — system prompt content', () => {
  it('system prompt identifies as 機器人 and mentions 鈺臻', async () => {
    mockFetch('你好～');
    await generateReply('你好', env);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const systemPrompt = body.messages[0].content;
    expect(systemPrompt).toMatch(/機器人/);
    expect(systemPrompt).toMatch(/鈺臻/);
    expect(systemPrompt).toMatch(/假日/);
    expect(systemPrompt).toMatch(/後台/);
    expect(systemPrompt).toMatch(/不會看到/);
  });

  it('system prompt has correct identity response', async () => {
    mockFetch('我是阿臻');
    await generateReply('你是誰', env);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const systemPrompt = body.messages[0].content;
    // Should tell users it's a robot set by 鈺臻
    expect(systemPrompt).toMatch(/阿臻機器人小助手/);
    expect(systemPrompt).toMatch(/鈺臻設定/);
  });
});
