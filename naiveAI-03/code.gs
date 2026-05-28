const LLM_API_URL_DEFAULT = "https://ai3.iformosa.com.tw/llmapi/api.php";

function extractLlmText(json) {
  if (!json) return "";
  if (json.message && json.message.content != null) {
    return String(json.message.content).trim();
  }
  if (json.choices && json.choices.length > 0) {
    const choice = json.choices[0];
    if (choice.message && choice.message.content) return String(choice.message.content).trim();
    if (choice.text) return String(choice.text).trim();
  }
  if (json.candidates && json.candidates.length > 0) {
    const parts = json.candidates[0].content && json.candidates[0].content.parts;
    if (parts && parts.length > 0 && parts[0].text) return String(parts[0].text).trim();
  }
  if (json.content) return String(json.content).trim();
  if (json.text) return String(json.text).trim();
  if (json.response) return String(json.response).trim();
  return "";
}

function callLlmApi(promptText, systemPrompt) {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: promptText });

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      messages: messages,
      stream: false
    }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(LLM_API_URL_DEFAULT, options);
  const responseCode = response.getResponseCode();
  const body = response.getContentText();

  if (responseCode < 200 || responseCode >= 300) {
    throw new Error("LLM API error " + responseCode + ": " + body);
  }

  const json = JSON.parse(body);
  const text = extractLlmText(json);
  if (!text) {
    throw new Error("LLM API response text is empty.");
  }
  return text;
}

function parseEndingJson(text) {
  const cleanText = String(text)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const ending = JSON.parse(cleanText);
  if (!ending.english || !ending.chinese) {
    throw new Error("Ending JSON is missing english or chinese.");
  }
  return {
    english: String(ending.english),
    chinese: String(ending.chinese)
  };
}

function buildFallbackEnding(food, drink) {
  return {
    english: `You eat the ${food} and drink the ${drink}. It is yummy!`,
    chinese: `你吃了${food}喝了${drink}。非常美味！`
  };
}

function doGet(e) {
  const food = e.parameter.food || "hamburger";
  const drink = e.parameter.drink || "milk";

  const systemPrompt = "你是專為台灣小學四年級學生設計遊戲結局的英文編劇。只輸出合法 JSON，不要 Markdown。";
  const prompt = `玩家剛剛選擇了早餐：食物是「${food}」，飲料是「${drink}」。
請在現實生活範圍內，創作一個「極度誇張、搞笑或有點倒楣」的突發狀況作為結局。不要有魔法或科幻元素。
直接輸出 JSON：{"english": "3到4句簡單英文短句描述結局", "chinese": "對應中文"}`;

  try {
    const textResponse = callLlmApi(prompt, systemPrompt);
    const ending = parseEndingJson(textResponse);
    return ContentService.createTextOutput(JSON.stringify(ending))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify(buildFallbackEnding(food, drink)))
      .setMimeType(ContentService.MimeType.JSON);
  }
}