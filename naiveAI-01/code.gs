// 1. 系統大門 (升級版)：根據網址參數決定顯示學生端還是老師端
function doGet(e) {
  // 檢查網址後面是否有加上 ?page=teacher
  if (e && e.parameter && e.parameter.page === 'teacher') {
    return HtmlService.createHtmlOutputFromFile('teacher')
        .setTitle('艦橋指揮中心 (教師端)')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else {
    // 否則預設顯示小水手的造船廠畫面
    return HtmlService.createHtmlOutputFromFile('index')
        .setTitle('水手造船廠 (學生端)')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

// LLM 代理端點（僅 GAS 後端使用，不暴露給前端）
var LLM_API_URL_DEFAULT = "https://ai3.iformosa.com.tw/llmapi/api.php";

function getLlmApiUrl() {
  var url = PropertiesService.getScriptProperties().getProperty("LLM_API_URL");
  return (url && url.trim()) ? url.trim() : LLM_API_URL_DEFAULT;
}

function extractLlmText(json) {
  if (!json) return "";
  if (json.message && json.message.content != null) {
    return String(json.message.content).trim();
  }
  if (json.choices && json.choices.length > 0) {
    var choice = json.choices[0];
    if (choice.message && choice.message.content) return String(choice.message.content).trim();
    if (choice.text) return String(choice.text).trim();
  }
  if (json.candidates && json.candidates.length > 0) {
    var parts = json.candidates[0].content && json.candidates[0].content.parts;
    if (parts && parts.length > 0 && parts[0].text) return String(parts[0].text).trim();
  }
  if (json.content) return String(json.content).trim();
  if (json.text) return String(json.text).trim();
  if (json.response) return String(json.response).trim();
  return "";
}

function callLlmApi(promptText, systemPrompt) {
  var url = getLlmApiUrl();
  var messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: promptText });

  var payload = {
    messages: messages,
    stream: false
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  var body = response.getContentText();

  if (responseCode < 200 || responseCode >= 300) {
    var errDetail = body;
    try {
      var errJson = JSON.parse(body);
      errDetail = errJson.error ? (errJson.error.message || errJson.error) : body;
    } catch (ignore) {}
    throw new Error("引擎室回報錯誤 (代碼 " + responseCode + ")：" + errDetail);
  }

  var json = JSON.parse(body);
  var text = extractLlmText(json);
  if (!text) {
    throw new Error("引擎室回報：AI 回應格式無法解析。");
  }
  return text;
}

// 2. 呼叫 AI：接收前端傳來的 prompt，經 GAS 後端轉發至 LLM API，把答案傳回去
function askGemini(promptText) {
  var systemPrompt = "你是問答機器人。回答問題字數不會超過150字";
  try {
    return callLlmApi(promptText, systemPrompt);
  } catch (e) {
    return "系統發生例外錯誤：" + e.toString();
  }
}

// 3. 裝填彈藥：將最終結果寫入 Google 試算表
function saveQuestion(formData) {
  // 取得目前綁定的試算表，並尋找名為 "Questions" 的工作表
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Questions");
  
  // 防呆機制：如果找不到該工作表，回報錯誤
  if (!sheet) {
    return "裝填失敗！請確認您的試算表下方，是否已經建立了一個名為「Questions」的工作表。";
  }
  
  // 將資料寫入試算表的新一行 (依序為：時間、班級、座號、謎底、謎語)
  sheet.appendRow([
    new Date(),           
    formData.classCode,   
    formData.seatNumber,  
    formData.answer,      
    formData.riddle       
  ]);
  
  return "彈藥裝填成功！試算表已更新。";
}

// 4. 艦橋雷達 (升級版：12小時保鮮過濾)：根據艦隊代碼撈取 12 小時內的彈藥
function getQuestionsByClass(classCode) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Questions");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var questions = [];
  var now = new Date(); // 取得系統現在時間

  // 從第 1 列開始往下找
  for (var i = 0; i < data.length; i++) {
    var rowTime = new Date(data[i][0]); // 讀取 A 欄的時間戳記
    
    // 防呆：確保讀取到的是真正的時間（跳過可能的標題列）
    if (!isNaN(rowTime.getTime())) {
      // 計算時間差（轉換為小時）
      var hoursDiff = Math.abs(now - rowTime) / (1000 * 60 * 60);
      
      // 條件過濾：班級代碼符合，且時間差距小於等於 12 小時
      if (data[i][1] == classCode && hoursDiff <= 12) {
        questions.push({
          seatNumber: data[i][2], // C 欄：座號
          answer: data[i][3],     // D 欄：謎底
          riddle: data[i][4]      // E 欄：謎語
        });
      }
    }
  }
  return questions;
}

// 5. 自動清潔機器人：刪除超過 24 小時的舊彈藥
function autoCleanOldAmmo() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Questions");
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var now = new Date();

  // ⚠️ 關鍵航海守則：刪除試算表資料必須「從最下面往上刪」，否則列號會大亂！
  for (var i = data.length - 1; i >= 0; i--) {
    var rowTime = new Date(data[i][0]);
    
    if (!isNaN(rowTime.getTime())) {
      var hoursDiff = Math.abs(now - rowTime) / (1000 * 60 * 60);
      
      // 如果時間差距超過 24 小時，就銷毀這一列 (i + 1 是因為試算表列號從 1 開始)
      if (hoursDiff > 24) {
        sheet.deleteRow(i + 1);
      }
    }
  }
}

// 建立專屬艦隊選單 (當試算表打開時自動執行)
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 艦隊系統安裝')
      .addItem('1️⃣ 一鍵啟動自動清潔機器人', 'installTrigger')
      .addToUi();
}

// 自動安裝觸發器的程式碼
function installTrigger() {
  var ui = SpreadsheetApp.getUi();
  
  // 檢查是否已經安裝過，避免重複安裝
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'autoCleanOldAmmo') {
      ui.alert('報告船長！清潔機器人已經在運作中，不需要重複啟動。');
      return;
    }
  }
  
  // 建立每天半夜 1 點自動執行的觸發器
  ScriptApp.newTrigger('autoCleanOldAmmo')
      .timeBased()
      .atHour(1)
      .everyDays(1)
      .create();
      
  ui.alert('🎉 啟動成功！系統每天半夜將會自動為您清空超過 24 小時的舊彈藥。');
}
