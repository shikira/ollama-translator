// Background Service Worker

// タブごとの翻訳有効状態を管理
const translationEnabledTabs = new Set();

// インストール時の初期設定
chrome.runtime.onInstalled.addListener(() => {
  console.log('Ollama Translator installed');

  // デフォルト設定を保存
  chrome.storage.sync.set({
    ollamaEndpoint: 'http://localhost:11434',
    model: 'translategemma:latest',
    autoTranslate: true,
    targetLanguage: 'ja',
    excludeDomains: []
  });

  // コンテキストメニューを作成
  chrome.contextMenus.create({
    id: 'translateSelection',
    title: '選択範囲を翻訳',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'translatePage',
    title: 'ページ全体を翻訳',
    contexts: ['page']
  });
});

// コンテキストメニューのクリックハンドラ
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translateSelection') {
    // 選択範囲の翻訳
    chrome.tabs.sendMessage(tab.id, {
      action: 'translateSelection',
      text: info.selectionText
    });
  } else if (info.menuItemId === 'translatePage') {
    // ページ全体の翻訳
    chrome.tabs.sendMessage(tab.id, {
      action: 'translatePage'
    });
  }
});

// 翻訳API呼び出し（共通関数）
async function callTranslationAPI(text, model, targetLanguage = 'ja', ollamaEndpoint = 'http://localhost:11434') {
  try {
    // 言語コードから言語名へのマッピング
    const languageNames = {
      'ja': 'Japanese',
      'en': 'English',
      'zh': 'Chinese',
      'ko': 'Korean'
    };

    // ソース言語を自動検出
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
    const sourceLang = hasJapanese ? 'ja' : 'en';
    const sourceLanguageName = languageNames[sourceLang] || 'English';
    const targetLanguageName = languageNames[targetLanguage] || 'Japanese';

    // 公式推奨プロンプト形式
    const systemPrompt = `You are a professional ${sourceLanguageName} (${sourceLang}) to ${targetLanguageName} (${targetLanguage}) translator. Your goal is to accurately convey the meaning and nuances of the original ${sourceLanguageName} text while adhering to ${targetLanguageName} grammar, vocabulary, and cultural sensitivities.
Produce only the ${targetLanguageName} translation, without any additional explanations or commentary. Please translate the following ${sourceLanguageName} text into ${targetLanguageName}:

${text}`;

    const response = await fetch(`${ollamaEndpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: systemPrompt
          }
        ],
        stream: true,  // ストリーミングを有効化
        options: {
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // ストリーミングレスポンスを処理
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let translatedText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message && json.message.content) {
            translatedText += json.message.content;
          }
        } catch (e) {
          // JSONパースエラーは無視
        }
      }
    }

    return { success: true, translation: translatedText };
  } catch (error) {
    console.error('Translation API error:', error);
    return { success: false, error: error.message };
  }
}

// タブが閉じられたときに翻訳状態をクリア
chrome.tabs.onRemoved.addListener((tabId) => {
  translationEnabledTabs.delete(tabId);
});

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    callTranslationAPI(request.text, request.model, request.targetLanguage, request.ollamaEndpoint)
      .then(sendResponse);
    return true; // 非同期レスポンス
  }

  // タブの翻訳を有効化
  if (request.action === 'enableTranslation') {
    const tabId = sender.tab ? sender.tab.id : request.tabId;
    if (tabId) {
      translationEnabledTabs.add(tabId);
      console.log(`Translation enabled for tab ${tabId}`);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No tab ID' });
    }
    return true;
  }

  // タブの翻訳が有効かチェック
  if (request.action === 'isTranslationEnabled') {
    const tabId = sender.tab ? sender.tab.id : request.tabId;
    const isEnabled = tabId ? translationEnabledTabs.has(tabId) : false;
    console.log(`Translation enabled check for tab ${tabId}: ${isEnabled}`);
    sendResponse({ enabled: isEnabled });
    return true;
  }

  // タブの翻訳を無効化
  if (request.action === 'disableTranslation') {
    const tabId = sender.tab ? sender.tab.id : request.tabId;
    if (tabId) {
      translationEnabledTabs.delete(tabId);
      console.log(`Translation disabled for tab ${tabId}`);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No tab ID' });
    }
    return true;
  }
});
