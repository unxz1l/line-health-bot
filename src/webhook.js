import { log } from './logger.js';
import { verifySignature, replyMessage } from './line.js';
import { generateReply } from './llm.js';

export async function handleWebhook(request, env) {
  if (request.method !== 'POST') {
    return new Response('🤖 阿臻健康小助手運作中！', { status: 200 });
  }

  try {
    // Read raw body for signature verification — can't use request.json()
    // because the body stream can only be consumed once.
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';
    const valid = await verifySignature(body, signature, env.LINE_CHANNEL_SECRET);

    if (!valid) {
      log('WARN', 'invalid_signature', {
        ip: request.headers.get('cf-connecting-ip'),
        signaturePrefix: signature.substring(0, 10) + '...',
        bodyLength: body.length,
      });
      return new Response('Unauthorized', { status: 401 });
    }

    const { events = [] } = JSON.parse(body);

    // LINE sends an empty events array when verifying the webhook URL.
    if (events.length === 0) {
      log('INFO', 'webhook_verified');
      return new Response('OK', { status: 200 });
    }

    for (const event of events) {
      if (event.type !== 'message' || event.message?.type !== 'text') continue;
      if (!event.source?.userId) continue;

      const { text: userMessage } = event.message;
      const { replyToken } = event;
      const { userId } = event.source;

      log('INFO', 'received_message', {
        userId,
        preview: userMessage.substring(0, 30),
      });

      if (userMessage === '我的ID') {
        await replyMessage(replyToken, `你的 User ID 是：\n${userId}`, env);
        continue;
      }

      const reply = await generateReply(userMessage, env);
      await replyMessage(replyToken, reply, env);
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    log('ERROR', 'webhook_handler', { error: err.message });
    // Always return 200 — LINE disables webhooks that return errors repeatedly.
    return new Response('OK', { status: 200 });
  }
}
