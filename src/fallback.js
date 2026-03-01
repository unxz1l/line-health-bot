const FALLBACK_MESSAGES = {
  morning_medicine: [
    '早安～起床第一件事，記得先吃藥喔 💊😊',
    '早安！藥吃了沒～吃完再享用早餐吧 🌅',
    '早安早安！阿臻提醒你吃早上的藥囉 💪',
    '早上好～別忘了吃藥喔，健康最重要啦 ❤️',
    '早安！新的一天從乖乖吃藥開始 🌟 加油！',
  ],
  evening_medicine: [
    '辛苦一天了～記得吃晚上的藥喔 💊🌙',
    '晚上好！藥吃了嗎？吃完好好休息 😊',
    '晚上的藥記得吃喔！阿臻關心你 💊❤️',
    '提醒你吃晚上的藥囉～今天也辛苦了 🌙',
    '該吃藥了喔～吃完放鬆一下吧 😊',
  ],
  sleep: [
    '時間不早了～早點休息喔！晚安 🌙😴',
    '該睡了喔～晚安，明天又是美好的一天 ✨',
    '不要太晚睡喔！身體最重要～晚安 🌙',
    '晚安～好好睡一覺，明天會更好 😊💤',
    '該上床休息囉！阿臻祝你一夜好眠 🌙',
  ],
  reply: [
    '謝謝你的訊息！😊 記得今天也要按時吃藥喔～',
    '收到～有什麼需要隨時跟阿臻說喔 💪',
    '嗨！😊 希望你今天一切順利～記得多喝水喔',
    '收到你的訊息了！🌟 今天也要照顧好自己喔',
    '謝謝你～記得多休息，健康最重要啦 😊',
  ],
};

export function getRandomFallback(type) {
  const messages = FALLBACK_MESSAGES[type] || FALLBACK_MESSAGES.reply;
  return messages[Math.floor(Math.random() * messages.length)];
}
