# LLM API 使用說明

本文件說明如何呼叫 LLM 代理 API，供應用程式或腳本發送對話請求並取得模型回覆。

## 基本資訊

| 項目 | 說明 |
|------|------|
| 端點 URL | `https://ai3.iformosa.com.tw/llmapi/api.php` |
| 支援方法 | `GET`、`POST` |
| POST Content-Type | `application/json`（必填） |
| 字元編碼 | UTF-8 |
| 回應格式 | `application/json` |

## 方法說明

| 方法 | 用途 |
|------|------|
| `GET` | 查詢服務狀態，確認 API 是否可連線 |
| `POST` | 送出對話請求，取得模型生成內容 |
| `OPTIONS` | 瀏覽器跨網域時的 CORS 預檢，一般不需手動呼叫 |
| 其他 | 不支援，回傳 `405` |

---

## GET：檢查服務

向端點發送 `GET` 請求即可。回傳內容為 JSON，具體欄位由後端服務定義，用於確認 API 是否正常運作。

### cURL 範例

```bash
curl -s "https://ai3.iformosa.com.tw/llmapi/api.php"
```

---

## POST：送出對話（主要用法）

請求 body 必須為**合法 JSON**。常見格式如下：

```json
{
  "messages": [
    { "role": "system", "content": "系統提示（可選）" },
    { "role": "user", "content": "使用者問題或 prompt" }
  ],
  "stream": false
}
```

### 欄位說明

| 欄位 | 必填 | 說明 |
|------|------|------|
| `messages` | 是 | 對話陣列，每則含 `role` 與 `content` |
| `messages[].role` | 是 | 常見值：`system`、`user`；若後端支援也可使用 `assistant` |
| `messages[].content` | 是 | 該角色的文字內容 |
| `stream` | 建議 | 設為 `false` 表示一次取回完整回應（非串流） |

### cURL 範例

```bash
curl -s -X POST "https://ai3.iformosa.com.tw/llmapi/api.php" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "system", "content": "你是友善的問答助手，請用繁體中文簡短回答。" },
      { "role": "user", "content": "請用一句話介紹台灣。" }
    ],
    "stream": false
  }'
```

### JavaScript（fetch）範例

```javascript
const url = "https://ai3.iformosa.com.tw/llmapi/api.php";

const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [
      { role: "system", content: "你是友善的問答助手，請用繁體中文簡短回答。" },
      { role: "user", content: "請用一句話介紹台灣。" }
    ],
    stream: false
  })
});

const status = response.status;
const json = await response.json();

if (status < 200 || status >= 300) {
  throw new Error(`LLM API error ${status}: ${JSON.stringify(json)}`);
}

const text = extractLlmText(json);
if (!text) {
  throw new Error("LLM API response text is empty.");
}

console.log(text);
```

### Google Apps Script（UrlFetchApp）範例

```javascript
const LLM_API_URL = "https://ai3.iformosa.com.tw/llmapi/api.php";

function callLlm(userPrompt, systemPrompt) {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      messages: messages,
      stream: false
    }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(LLM_API_URL, options);
  const code = response.getResponseCode();
  const body = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error("LLM API error " + code + ": " + body);
  }

  const json = JSON.parse(body);
  const text = extractLlmText(json);
  if (!text) {
    throw new Error("LLM API response text is empty.");
  }
  return text;
}
```

---

## 回應與如何取出文字

`POST` 成功時，HTTP 狀態碼與 JSON body 由後端服務決定（可能不一定是 `200`）。請同時檢查狀態碼與回應內容。

回應 JSON 的結構可能因後端而異。建議依下列順序嘗試取出模型文字：

| 優先順序 | JSON 路徑 | 說明 |
|----------|-----------|------|
| 1 | `message.content` | 單一 message 物件 |
| 2 | `choices[0].message.content` | OpenAI 相容格式 |
| 3 | `choices[0].text` | 舊版 completion 格式 |
| 4 | `candidates[0].content.parts[0].text` | Gemini 風格 |
| 5 | `content` / `text` / `response` | 扁平欄位 |

### JavaScript 解析函式範例

```javascript
function extractLlmText(json) {
  if (!json) return "";
  if (json.message && json.message.content != null) {
    return String(json.message.content).trim();
  }
  if (json.choices && json.choices.length > 0) {
    const choice = json.choices[0];
    if (choice.message && choice.message.content) {
      return String(choice.message.content).trim();
    }
    if (choice.text) return String(choice.text).trim();
  }
  if (json.candidates && json.candidates.length > 0) {
    const parts = json.candidates[0].content && json.candidates[0].content.parts;
    if (parts && parts.length > 0 && parts[0].text) {
      return String(parts[0].text).trim();
    }
  }
  if (json.content) return String(json.content).trim();
  if (json.text) return String(json.text).trim();
  if (json.response) return String(json.response).trim();
  return "";
}
```

若 HTTP 狀態為 2xx 但 `extractLlmText` 回傳空字串，請將完整 JSON 記錄下來以便除錯，或確認請求格式是否符合後端要求。

---

## 錯誤處理

### 代理層回傳的錯誤

以下錯誤由 API 入口在轉發前或連線失敗時回傳：

| HTTP 狀態碼 | 錯誤訊息 | 常見原因 |
|-------------|----------|----------|
| `400` | `Request body is empty.` | POST 未帶 body |
| `400` | `Invalid JSON body.` | body 不是合法 JSON |
| `502` | `Failed to connect to backend.` | 無法連上後端服務（回應含 `details` 欄位） |
| `405` | `Method not allowed.` | 使用了不支援的 HTTP 方法 |

範例：

```json
{ "error": "Invalid JSON body." }
```

```json
{
  "error": "Failed to connect to backend.",
  "details": "..."
}
```

### POST 轉發後的錯誤

請求通過驗證並轉發後，HTTP 狀態碼與 JSON 內容**與後端服務一致**。請依實際回傳的 status 與 body 處理，勿假設一定是 `200`。

### 逾時提醒

模型生成可能需較長時間。請在呼叫端設定足夠的逾時時間；若使用 cURL、自訂 HTTP 客戶端或 Apps Script，預設逾時可能偏短而導致中斷。

---

## 瀏覽器直接呼叫

- API 已設定 CORS（`Access-Control-Allow-Origin: *`），可從網頁以 `fetch` 直接呼叫。
- 若產品不適合在前端暴露此 URL，請改由自有後端（例如 Google Apps Script）代為呼叫。
- 目前請求**不需**帶 `Authorization`；若未來後端要求驗證，應由後端代呼，勿將金鑰寫在前端程式碼中。
