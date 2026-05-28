# ⚓ AI 水手造船廠：引導式AI生成互動解謎遊戲

這是一套專為國小教學現場設計的生成式 AI 互動平台。結合了「AI 提示詞 (Prompt) 訓練」與「課堂大螢幕搶答」，讓學生在遊戲中無痛學習科技素養！

## ✨ 核心特色
* **零門檻安裝：** 老師完全不需懂程式，一鍵複製即可擁有專屬系統。
* **雙頻道設計：** 學生用平板裝填彈藥（寫謎語），老師用大螢幕雷達抽題。
* **自動化清潔：** 內建 12 小時保鮮機制與 24 小時自動刪除，資料庫永不塞車。
* **極低成本：** 完全建立在免費的 Google 試算表與 Google Apps Script 上。

## 線上範例
* **學生端：** [按此進入學生端](https://script.google.com/macros/s/AKfycbyGCqab-VX84nipH51sX-cqoGf5Io7oGbTZfXyZa5yx88CajUF6tULeRydKk_XK8uXh/exec)
* **教師端：** [按此進入教師主控端](https://script.google.com/macros/s/AKfycbyGCqab-VX84nipH51sX-cqoGf5Io7oGbTZfXyZa5yx88CajUF6tULeRydKk_XK8uXh/exec?page=teacher)

## 🚀 老師專屬：一鍵安裝指南 (最快只需 3 分鐘)

如果您是老師，不需要下載這裡的程式碼！請直接跟著以下步驟操作：

1. **取得母艦副本：** 點擊 👉 [這裡取得試算表一鍵複製連結](https://docs.google.com/spreadsheets/d/1VS-lo-5wzV6TgL9hq6PS1Q7cR_Xhwnu-VEB36akiIkY/copy?usp=sharing) 👈，建立一份您的專屬副本。
2. **確認 AI 後端：** AI 呼叫已由 Google Apps Script 後端代理，不需要在前端或試算表中填寫 Gemini API Key。
3. **啟動自動清潔：** 回到試算表，點擊上方選單「🚀 艦隊系統安裝」➔「1️⃣ 一鍵啟動自動清潔機器人」(首次需授權)。
4. **發布專屬網址：** 點擊上方「擴充功能」➔「Apps Script」。在右上角點擊「部署」➔「網頁應用程式」，將權限設為「所有人」，發布並取得您的上課網址！

---

## 👨‍💻 開發者指南
歡迎各界高手 Fork 此專案並發送 Pull Request (PR)。
專案架構：
* `code.gs`: GAS 後端邏輯、LLM 代理端點串接、Google Sheets 資料讀寫。
* `index.html`: 學生端介面 (詠唱與送出題目)。
* `teacher.html`: 教師端介面 (大螢幕抽題與動畫)。
