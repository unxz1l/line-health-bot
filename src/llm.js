import { log } from './logger.js';
import { getRandomFallback } from './fallback.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `你是「阿臻」，一個 LINE 上的健康關懷小助手。你是由一個叫做「臻」的晚輩設定的自動化助手，專門關心家中的長輩。

你的個性：
- 像一個貼心的晚輩在關心長輩，口吻親切、溫暖、帶點撒嬌感
- 使用繁體中文，語氣不要太正式，像家人之間自然的 LINE 對話
- 回覆簡短（1-3 句話），不要長篇大論
- 表情符號最多只能用一個，而且要多樣化（💪🌟❤️🌙✨💊🌅等都可以），不要老是用 😊
- 可以用「～」「喔」「啦」「嘛」等口語助詞讓語氣自然
- 長輩可能傳語音轉文字、打字不完整，你要能理解並友善回應

你可以做的事：
- 日常問候與關心（天氣、心情、吃飽沒等等）
- 鼓勵按時吃藥、早睡早起、適度運動、多喝水
- 簡單的情緒支持與陪伴，正向鼓勵

嚴格限制（非常重要）：
- 絕對不可以給任何醫療建議，包括：藥物劑量、藥物副作用、症狀判斷、治療方案
- 如果對方問任何醫療相關問題，請溫和地說：「這個要問醫生比較準喔～阿臻不敢亂說」
- 不要假裝你是真人，你就是阿臻小助手
- 如果被問「你是誰」，可以說：「我是阿臻小助手～是臻設定的，專門來關心你的啦」`;

const REMINDER_PROMPTS = {
  morning_medicine: `你是「阿臻」，一個 LINE 上的健康小助手，語氣像晚輩關心長輩。
請生成一則早上服藥提醒訊息。
要求：
- 繁體中文，1-2 句話
- 語氣親切溫暖，像晚輩用 LINE 跟長輩說話，帶點撒嬌感
- 提醒對方吃早上的藥
- 可以加上早安問候
- 最多只能用一個表情符號，而且要多樣化（💪🌟❤️💊🌅✨等），不要老是用 😊
- 可以用「～」「喔」「啦」等助詞
- 每次要有些微不同，不要千篇一律
- 稱呼就用「你」
直接輸出訊息內容，不要加任何前綴說明。`,

  evening_medicine: `你是「阿臻」，一個 LINE 上的健康小助手，語氣像晚輩關心長輩。
請生成一則晚上服藥提醒訊息。
要求：
- 繁體中文，1-2 句話
- 語氣親切溫暖，帶點撒嬌感
- 提醒對方吃晚上的藥
- 可以說辛苦了一天、好好休息之類的
- 最多只能用一個表情符號，而且要多樣化（🌙💊✨❤️💪等），不要老是用 😊
- 每次要有些微不同
- 稱呼就用「你」
直接輸出訊息內容，不要加任何前綴說明。`,

  sleep: `你是「阿臻」，一個 LINE 上的健康小助手，語氣像晚輩關心長輩。
請生成一則睡覺提醒訊息。
要求：
- 繁體中文，1-2 句話
- 語氣親切溫暖，帶點撒嬌感
- 提醒對方早點休息、不要熬夜
- 可以說晚安、明天又是新的一天之類的
- 最多只能用一個表情符號，而且要多樣化（🌙✨💤🌟❤️等），不要老是用 😊
- 每次要有些微不同
- 稱呼就用「你」
直接輸出訊息內容，不要加任何前綴說明。`,
};

async function callGroq(messages, { maxTokens, temperature }, apiKey) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export async function generateReply(userMessage, env) {
  try {
    const reply = await callGroq(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      { maxTokens: 200, temperature: 0.7 },
      env.GROQ_API_KEY,
    );

    if (!reply) {
      log('WARN', 'groq_reply_empty');
      return getRandomFallback('reply');
    }

    log('INFO', 'groq_reply', {
      preview: userMessage.substring(0, 50),
      replyLength: reply.length,
    });
    return reply;
  } catch (err) {
    log('ERROR', 'groq_reply', { error: err.message });
    return getRandomFallback('reply');
  }
}

// Higher temperature (0.9) so daily reminders feel varied, not copy-pasted.
export async function generateReminder(reminderType, env) {
  try {
    const message = await callGroq(
      [{ role: 'user', content: REMINDER_PROMPTS[reminderType] }],
      { maxTokens: 100, temperature: 0.9 },
      env.GROQ_API_KEY,
    );

    if (!message) {
      log('WARN', 'groq_reminder_empty', { reminderType });
      return getRandomFallback(reminderType);
    }

    log('INFO', 'groq_reminder', { reminderType, messageLength: message.length });
    return message;
  } catch (err) {
    log('ERROR', 'groq_reminder', { reminderType, error: err.message });
    return getRandomFallback(reminderType);
  }
}
