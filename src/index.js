import { handleWebhook } from './webhook.js';
import { handleCron } from './cron.js';

export default {
  fetch: handleWebhook,

  scheduled(event, env, ctx) {
    ctx.waitUntil(handleCron(event, env));
  },
};
