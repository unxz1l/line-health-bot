# LINE Health Bot — 阿臻

一個用 LINE 每天自動關心爸媽的健康提醒機器人。零成本，部署一次就不用管了。

我自己設定來提醒爸媽的：早上催他們出門運動曬太陽，晚上提醒睡前吃藥。你也可以 fork 來用，改成你家的提醒內容。

## 功能

**每日定時推播（Cron）**

| 時間 | 內容 | 可自訂 |
|------|------|--------|
| 08:00 | 出門運動、曬太陽、少糖 | `src/llm.js` 裡的 prompt |
| 21:00 | 吃藥提醒 + 請回報 | 同上 |

> 我爸媽是睡前才需要吃藥，所以白天是健康生活提醒、晚上才是吃藥。你可以依自己需求調整排程和 prompt。

每則訊息由 LLM 生成，每天措辭不同。LLM 掛了會自動用 fallback 模板，提醒一定會發出去。

訊息會根據 `USER_NICKNAMES` 自動加上暱稱前綴：
```
媽媽，早安～天氣不錯，出門走走曬太陽吧！💪
爸爸，該吃藥囉～吃完記得跟阿臻說一聲喔 💊
```

**聊天回覆（Webhook）**

爸媽傳訊息給機器人，阿臻會像一個貼心的晚輩回覆。能聊天、鼓勵健康習慣、情緒陪伴，但嚴格不給醫療建議。

## 花費：零元

全部用免費方案：

| 服務 | 免費額度 | 本專案用量 |
|------|----------|------------|
| [Cloudflare Workers](https://dash.cloudflare.com/sign-up) | 10 萬次 request/天 | 幾乎用不到 |
| [LINE Messaging API](https://developers.line.biz/console/) | 200 則推播/月 | 2 人 × 2 則/天 × 30 天 = **120 則** |
| [Groq API](https://console.groq.com/) | 免費 tier | 2 次 LLM 呼叫/天 |

> LINE 免費方案 200 則推播/月，預設 2 人 × 2 則/天 = 120 則/月，還有餘裕。如果要加人或加排程，注意別超過 200 則。

## 快速開始（5 分鐘）

### 你需要準備的

- Node.js 18+
- 一個 [Cloudflare 帳號](https://dash.cloudflare.com/sign-up)
- 一個 [LINE Official Account](https://developers.line.biz/console/)（開啟 Messaging API）
- 一個 [Groq API key](https://console.groq.com/)

### Step 1：Clone & 安裝

```sh
git clone https://github.com/yuzuchen/health-bot.git
cd health-bot
npm install
```

### Step 2：取得爸媽的 LINE User ID

先部署一次（用預設設定就好）：

```sh
npx wrangler deploy
```

到 LINE Developer Console 設定 Webhook URL：
```
https://line-health-bot.<your-subdomain>.workers.dev
```
記得開啟「Use webhook」、關閉「Auto-reply messages」。

讓爸媽加 bot 好友，然後傳一則訊息：**`我的ID`**，bot 會回覆他們的 User ID。

### Step 3：設定 secrets

所有敏感資料都透過 `wrangler secret` 管理，不會進 git：

```sh
npx wrangler secret put LINE_CHANNEL_SECRET
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put USER_IDS              # 逗號分隔，例如 "Uxxxx,Uyyyy"
npx wrangler secret put USER_NICKNAMES         # JSON，例如 '{"Uxxxx":"媽媽","Uyyyy":"爸爸"}'
```

> 本地開發時，複製 `.dev.vars.example` 為 `.dev.vars` 並填入真實值（`.dev.vars` 已被 `.gitignore` 排除）。

### Step 4：部署

```sh
npm run deploy
```

搞定！從今天開始，爸媽每天會收到阿臻的關心訊息。

## 客製化

### 改提醒時間

編輯 `wrangler.toml` 的 cron 排程（UTC 時間）：

```toml
[triggers]
crons = ["0 0 * * *", "0 13 * * *"]
#         08:00 TST     21:00 TST
```

> TST = UTC + 8。想改成早上 7 點就用 `0 23 * * *`（前一天 UTC 23:00）。

### 換 LLM 模型

預設使用 Groq 的 `llama-3.3-70b-versatile`。想換模型只要設定環境變數：

```sh
npx wrangler secret put GROQ_MODEL    # 例如 "llama-3.1-8b-instant"
```

不設定就用預設值，不需要改任何程式碼。

### 改提醒內容

編輯 `src/llm.js` 裡的 `REMINDER_PROMPTS`，用自然語言描述你要的提醒內容。例如你爸媽早上要吃藥，就把 `morning_exercise` 的 prompt 改成吃藥提醒。

同時記得更新 `src/fallback.js` 的備用訊息和 `src/cron.js` 的 `CRON_MAP`。

### 加更多排程

在 `wrangler.toml` 加 cron，在 `src/cron.js` 的 `CRON_MAP` 加對應的 key，然後在 `src/llm.js` 和 `src/fallback.js` 加 prompt 和 fallback。

注意 LINE 免費推播額度：
```
每日推播數 × 30 天 × 人數 ≤ 200
```

### 改暱稱 / 加人

```sh
npx wrangler secret put USER_IDS              # "ID1,ID2,ID3"
npx wrangler secret put USER_NICKNAMES         # '{"ID1":"媽媽","ID2":"爸爸","ID3":"阿嬤"}'
```

沒設暱稱的用戶會收到原始訊息（不加前綴）。

## 架構

```
LINE Platform
  │
  ├─ Webhook POST ──→ Cloudflare Worker (fetch handler)
  │                      ├─ 驗證 HMAC-SHA256 簽名
  │                      ├─ 「我的ID」指令 → 回覆 User ID
  │                      └─ Groq LLM → LINE Reply API（免費無限）
  │
  └─ Cron Triggers ──→ Cloudflare Worker (scheduled handler)
                         ├─ Groq LLM 生成提醒（或 fallback）
                         ├─ 加上暱稱前綴
                         └─ LINE Push API 推播給每位用戶（200 則/月）
```

```
src/
├── index.js      # Worker 進入點
├── webhook.js    # Webhook 驗證 + 訊息路由
├── line.js       # LINE API（reply, push, 簽名驗證）
├── llm.js        # Groq LLM（聊天回覆 + 提醒生成）
├── cron.js       # 定時排程 + 暱稱個人化 + 多用戶推播
├── fallback.js   # LLM 掛掉時的備用訊息
├── logger.js     # JSON 結構化 log
└── *.test.js     # 測試（vitest）
```

## 測試

```sh
npm test
```

## 本地開發

```sh
cp .dev.vars.example .dev.vars   # 填入你的真實值
npm run dev
```

搭配 [ngrok](https://ngrok.com/) 把 local server 暴露給 LINE webhook 測試。
