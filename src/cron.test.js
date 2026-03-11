import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCron } from './cron.js';

// Mock dependencies
vi.mock('./logger.js', () => ({ log: vi.fn() }));
vi.mock('./line.js', () => ({ pushMessage: vi.fn() }));
vi.mock('./llm.js', () => ({ generateReminder: vi.fn() }));

import { log } from './logger.js';
import { pushMessage } from './line.js';
import { generateReminder } from './llm.js';

const MOM_ID = 'U0d6130dc9088f56e291111a778e42ae3';
const DAD_ID = 'U83586b0d9057eca5f4f184ac83d5f9bc';

const baseEnv = {
  USER_IDS: `${MOM_ID},${DAD_ID}`,
  USER_NICKNAMES: JSON.stringify({ [MOM_ID]: '媽媽', [DAD_ID]: '爸爸' }),
  LINE_CHANNEL_ACCESS_TOKEN: 'test-token',
  GROQ_API_KEY: 'test-key',
};

beforeEach(() => {
  vi.clearAllMocks();
  pushMessage.mockResolvedValue(true);
});

describe('handleCron — cron mapping', () => {
  it('maps 0 0 * * * to morning_exercise', async () => {
    generateReminder.mockResolvedValue('出門運動囉');
    await handleCron({ cron: '0 0 * * *' }, baseEnv);
    expect(generateReminder).toHaveBeenCalledWith('morning_exercise', baseEnv);
  });

  it('maps 0 13 * * * to evening_medicine', async () => {
    generateReminder.mockResolvedValue('吃藥囉');
    await handleCron({ cron: '0 13 * * *' }, baseEnv);
    expect(generateReminder).toHaveBeenCalledWith('evening_medicine', baseEnv);
  });

  it('warns on unknown cron and does nothing', async () => {
    await handleCron({ cron: '0 99 * * *' }, baseEnv);
    expect(log).toHaveBeenCalledWith('WARN', 'unknown_cron', { cron: '0 99 * * *' });
    expect(generateReminder).not.toHaveBeenCalled();
  });

  it('old cron schedules are no longer mapped', async () => {
    // The old 0 12 * * * (evening_medicine at 20:00) and 0 14 * * * (sleep) should be unknown
    await handleCron({ cron: '0 12 * * *' }, baseEnv);
    expect(log).toHaveBeenCalledWith('WARN', 'unknown_cron', { cron: '0 12 * * *' });

    vi.clearAllMocks();
    await handleCron({ cron: '0 14 * * *' }, baseEnv);
    expect(log).toHaveBeenCalledWith('WARN', 'unknown_cron', { cron: '0 14 * * *' });
  });
});

describe('handleCron — nickname personalization', () => {
  it('prepends 媽媽 nickname for mom', async () => {
    generateReminder.mockResolvedValue('早安～出門運動吧');
    await handleCron({ cron: '0 0 * * *' }, baseEnv);

    const momCall = pushMessage.mock.calls.find((c) => c[0] === MOM_ID);
    expect(momCall[1]).toBe('媽媽，早安～出門運動吧');
  });

  it('prepends 爸爸 nickname for dad', async () => {
    generateReminder.mockResolvedValue('該吃藥囉');
    await handleCron({ cron: '0 13 * * *' }, baseEnv);

    const dadCall = pushMessage.mock.calls.find((c) => c[0] === DAD_ID);
    expect(dadCall[1]).toBe('爸爸，該吃藥囉');
  });

  it('sends to both users with their respective nicknames', async () => {
    generateReminder.mockResolvedValue('測試訊息');
    await handleCron({ cron: '0 0 * * *' }, baseEnv);

    expect(pushMessage).toHaveBeenCalledTimes(2);
    const messages = pushMessage.mock.calls.map((c) => [c[0], c[1]]);
    expect(messages).toContainEqual([MOM_ID, '媽媽，測試訊息']);
    expect(messages).toContainEqual([DAD_ID, '爸爸，測試訊息']);
  });

  it('sends without nickname prefix when USER_NICKNAMES is missing', async () => {
    generateReminder.mockResolvedValue('測試訊息');
    const envNoNicknames = { ...baseEnv };
    delete envNoNicknames.USER_NICKNAMES;

    await handleCron({ cron: '0 0 * * *' }, envNoNicknames);

    pushMessage.mock.calls.forEach((call) => {
      expect(call[1]).toBe('測試訊息');
    });
  });

  it('sends without nickname prefix and logs warning when USER_NICKNAMES is invalid JSON', async () => {
    generateReminder.mockResolvedValue('測試訊息');
    const envBadJson = { ...baseEnv, USER_NICKNAMES: 'not-json' };

    await handleCron({ cron: '0 0 * * *' }, envBadJson);

    expect(log).toHaveBeenCalledWith('WARN', 'invalid_user_nicknames', expect.objectContaining({ error: expect.any(String) }));
    pushMessage.mock.calls.forEach((call) => {
      expect(call[1]).toBe('測試訊息');
    });
  });

  it('sends without prefix for a user not in nicknames map', async () => {
    generateReminder.mockResolvedValue('測試訊息');
    const envPartial = {
      ...baseEnv,
      USER_IDS: `${MOM_ID},UNKNOWN_USER`,
      USER_NICKNAMES: JSON.stringify({ [MOM_ID]: '媽媽' }),
    };

    await handleCron({ cron: '0 0 * * *' }, envPartial);

    const unknownCall = pushMessage.mock.calls.find((c) => c[0] === 'UNKNOWN_USER');
    expect(unknownCall[1]).toBe('測試訊息');

    const momCall = pushMessage.mock.calls.find((c) => c[0] === MOM_ID);
    expect(momCall[1]).toBe('媽媽，測試訊息');
  });
});

describe('handleCron — edge cases', () => {
  it('warns and returns when USER_IDS is empty', async () => {
    await handleCron({ cron: '0 0 * * *' }, { ...baseEnv, USER_IDS: '' });
    expect(log).toHaveBeenCalledWith('WARN', 'cron_no_users');
    expect(generateReminder).not.toHaveBeenCalled();
  });

  it('logs cron_complete with correct counts', async () => {
    generateReminder.mockResolvedValue('msg');
    pushMessage.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await handleCron({ cron: '0 0 * * *' }, baseEnv);

    expect(log).toHaveBeenCalledWith('INFO', 'cron_complete', {
      reminderType: 'morning_exercise',
      total: 2,
      succeeded: 1,
      failed: 1,
    });
  });

  it('catches unexpected errors and logs them', async () => {
    generateReminder.mockRejectedValue(new Error('unexpected boom'));

    await handleCron({ cron: '0 0 * * *' }, baseEnv);

    expect(log).toHaveBeenCalledWith('ERROR', 'cron_handler', {
      cron: '0 0 * * *',
      error: 'unexpected boom',
    });
  });
});
