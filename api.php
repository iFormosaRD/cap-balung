<?php

/**
 * LLM Gemma4 反向代理端點
 * 接收請求 → 轉發至 Flask (114.34.77.157:9002) → 回傳結果
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 處理 CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

define('FLASK_ENDPOINT', 'http://114.34.77.157:9002/llm/gemma4/');
define('TIMEOUT', 300);

// ── GET：直接轉發狀態查詢 ──────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => FLASK_ENDPOINT,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    ]);

    $response = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        http_response_code(502);
        echo json_encode(['error' => 'Failed to connect to backend.', 'details' => $curlError], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code($httpCode);
    echo $response;
    exit;
}

// ── POST：轉發聊天請求 ────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 讀取原始請求 body
    $rawBody = file_get_contents('php://input');

    if (empty($rawBody)) {
        http_response_code(400);
        echo json_encode(['error' => 'Request body is empty.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 驗證是否為合法 JSON
    $data = json_decode($rawBody, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON body.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 轉發至 Flask
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => FLASK_ENDPOINT,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $rawBody,   // 直接轉發原始 body，不做修改
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => TIMEOUT,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Accept: application/json',
        ],
    ]);

    $response  = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    // cURL 連線失敗
    if ($response === false) {
        http_response_code(502);
        echo json_encode([
            'error'   => 'Failed to connect to backend.',
            'details' => $curlError,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 原封不動回傳 Flask 的回應（包含狀態碼）
    http_response_code($httpCode);
    echo $response;
    exit;
}

// ── 其他 HTTP Method：不允許 ──────────────────────
http_response_code(405);
echo json_encode(['error' => 'Method not allowed.'], JSON_UNESCAPED_UNICODE);