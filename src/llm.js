import { log } from './logger.js';
import { getRandomFallback } from './fallback.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const REPLY_OPTIONS = { maxTokens: 200, temperature: 0.7 };
const REMINDER_OPTIONS = { maxTokens: 100, temperature: 0.9 };

const SYSTEM_PROMPT = `你是「阿臻」，一個 LINE 上的健康關懷機器人小助手。你是由女兒「鈺臻」設定的自動化機器人助手，專門每天提醒、關心爸爸媽媽。

背景資訊（重要）：
- 阿臻是機器人小助手，不是真人，要讓爸媽清楚知道這點
- 是女兒「鈺臻」設定這個機器人來提醒、關心爸媽的
- 鈺臻平常不會看到對話內容，只有假日打開電腦後台設定時才會看到
- 所以爸媽可以放心跟阿臻聊天，不用擔心女兒隨時在看

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
- 不要假裝你是真人，你就是阿臻機器人小助手
- 如果被問「你是誰」，可以說：「我是阿臻機器人小助手～是鈺臻設定的，專門來提醒、關心你們的啦！鈺臻平常不會看到我們的對話，只有假日她打開電腦才會看到喔」`;

const REMINDER_PROMPTS = {
  morning_exercise: `你是「阿臻」，一個 LINE 上的健康小助手，語氣像晚輩關心長輩。
請生成一則早上運動提醒訊息。
要求：
- 繁體中文，2-3 句話
- 語氣親切溫暖，像晚輩用 LINE 跟長輩說話，帶點撒嬌感
- 提醒對方要出門運動、曬太陽，建議現在就出門
- 可以鼓勵慢跑、快走等運動
- 順便提醒少吃糖、飲料要喝無糖的最健康
- 語氣要像是女兒希望他們健康，帶著關心的感覺
- 可以加上早安問候
- 最多只能用一個表情符號，而且要多樣化（💪🌟❤️🏃‍♀️🌅✨☀️🌞等），不要老是用 😊
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
- 請對方吃完藥之後回個訊息讓阿臻知道
- 最多只能用一個表情符號，而且要多樣化（🌙💊✨❤️💪等），不要老是用 😊
- 每次要有些微不同
- 稱呼就用「你」
直接輸出訊息內容，不要加任何前綴說明。`,
};

async function callGroq(messages, { maxTokens, temperature }, env) {
  const model = env.GROQ_MODEL || DEFAULT_MODEL;
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
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

async function callWithFallback(action, fallbackType, messages, options, env, logFields = {}) {
  try {
    const result = await callGroq(messages, options, env);

    if (!result) {
      log('WARN', `groq_${action}_empty`, logFields);
      return getRandomFallback(fallbackType);
    }

    log('INFO', `groq_${action}`, { ...logFields, messageLength: result.length });
    return result;
  } catch (err) {
    log('ERROR', `groq_${action}`, { ...logFields, error: err.message });
    return getRandomFallback(fallbackType);
  }
}

export async function generateReply(userMessage, env) {
  return callWithFallback(
    'reply',
    'reply',
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    REPLY_OPTIONS,
    env,
    { preview: userMessage.substring(0, 50) },
  );
}

// Higher temperature (0.9) so daily reminders feel varied, not copy-pasted.
export async function generateReminder(reminderType, env) {
  return callWithFallback(
    'reminder',
    reminderType,
    [{ role: 'user', content: REMINDER_PROMPTS[reminderType] }],
    REMINDER_OPTIONS,
    env,
    { reminderType },
  );
}
