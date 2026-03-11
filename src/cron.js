import { log } from './logger.js';
import { pushMessage } from './line.js';
import { generateReminder } from './llm.js';

const CRON_MAP = {
  '0 0 * * *': 'morning_exercise',   // UTC 00:00 = TST 08:00
  '0 13 * * *': 'evening_medicine',  // UTC 13:00 = TST 21:00
};

function parseUserIds(env) {
  return (env.USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function parseNicknames(env) {
  try {
    return JSON.parse(env.USER_NICKNAMES || '{}');
  } catch {
    return {};
  }
}

export async function handleCron(event, env) {
  const reminderType = CRON_MAP[event.cron];
  if (!reminderType) {
    log('WARN', 'unknown_cron', { cron: event.cron });
    return;
  }

  const userIds = parseUserIds(env);
  if (userIds.length === 0) {
    log('WARN', 'cron_no_users');
    return;
  }

  log('INFO', 'cron_triggered', {
    reminderType,
    cron: event.cron,
    userCount: userIds.length,
  });

  // Generate once, send to all users (saves API calls).
  // Per-user nicknames are prefixed at send time.
  const message = await generateReminder(reminderType, env);
  const nicknames = parseNicknames(env);

  const results = await Promise.allSettled(
    userIds.map(async (userId) => {
      const nickname = nicknames[userId];
      const personalMessage = nickname ? `${nickname}，${message}` : message;
      const ok = await pushMessage(userId, personalMessage, env);
      return { userId, ok };
    }),
  );

  const succeeded = results.filter(
    (r) => r.status === 'fulfilled' && r.value.ok,
  ).length;

  log('INFO', 'cron_complete', {
    reminderType,
    total: userIds.length,
    succeeded,
    failed: userIds.length - succeeded,
  });
}
