import { log } from './logger.js';

const LINE_API_BASE = 'https://api.line.me/v2/bot/message';

export async function verifySignature(body, signature, channelSecret) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(channelSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return expected === signature;
  } catch (err) {
    log('ERROR', 'verify_signature', { error: err.message });
    return false;
  }
}

async function callLineApi(endpoint, payload, action, env, extraLogFields = {}) {
  try {
    const res = await fetch(`${LINE_API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      log('ERROR', action, { status: res.status, body, ...extraLogFields });
      return false;
    }

    log('INFO', action, { status: res.status, ...extraLogFields });
    return true;
  } catch (err) {
    log('ERROR', action, { error: err.message, ...extraLogFields });
    return false;
  }
}

export async function replyMessage(replyToken, text, env) {
  return callLineApi(
    'reply',
    { replyToken, messages: [{ type: 'text', text }] },
    'reply_message',
    env,
  );
}

export async function pushMessage(userId, text, env) {
  return callLineApi(
    'push',
    { to: userId, messages: [{ type: 'text', text }] },
    'push_message',
    env,
    { userId },
  );
}
