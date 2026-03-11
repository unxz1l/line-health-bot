const FALLBACK_MESSAGES = {
  morning_exercise: [
    '早安～天氣不錯，趕快出門走走曬太陽吧！飲料記得喝無糖的喔 ☀️',
    '早安！趁早上涼快出門快走或慢跑一下吧～少喝甜的，健康最重要啦 💪',
    '早上好～出門運動曬曬太陽，心情會很好喔！記得飲料選無糖的 🌅',
    '早安早安！現在就出門散步吧～多運動少吃糖，女兒希望你們健健康康的 ❤️',
    '早安～別賴在家喔，出去走走曬太陽！飲料喝無糖的最棒了 🏃‍♀️',
  ],
  evening_medicine: [
    '該吃藥囉～吃完記得跟阿臻說一聲喔 💊',
    '晚上的藥記得吃喔！吃完回個訊息讓阿臻知道 🌙',
    '提醒你吃藥囉～吃完跟阿臻報告一下喔 ❤️',
    '藥吃了嗎？記得吃完回個訊息喔～阿臻等你 ✨',
    '該吃晚上的藥了喔～吃完跟阿臻說一聲啦 💪',
  ],
  reply: [
    '謝謝你的訊息！記得今天也要按時吃藥喔～ 💊',
    '收到～有什麼需要隨時跟阿臻說喔 💪',
    '嗨！希望你今天一切順利～記得多喝水喔 🌟',
    '收到你的訊息了！今天也要照顧好自己喔 ❤️',
    '謝謝你～記得多休息，健康最重要啦 ✨',
  ],
};

export function getRandomFallback(type) {
  const messages = FALLBACK_MESSAGES[type] || FALLBACK_MESSAGES.reply;
  return messages[Math.floor(Math.random() * messages.length)];
}
