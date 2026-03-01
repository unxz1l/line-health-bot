import { log } from './logger.js';

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

export async function replyMessage(replyToken, text, env) {
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      log('ERROR', 'reply_message', { status: res.status, body });
      return false;
    }

    log('INFO', 'reply_message', { status: res.status });
    return true;
  } catch (err) {
    log('ERROR', 'reply_message', { error: err.message });
    return false;
  }
}

export async function pushMessage(userId, text, env) {
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: 'text', text }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      log('ERROR', 'push_message', { userId, status: res.status, body });
      return false;
    }

    log('INFO', 'push_message', { userId, status: res.status });
    return true;
  } catch (err) {
    log('ERROR', 'push_message', { userId, error: err.message });
    return false;
  }
}
