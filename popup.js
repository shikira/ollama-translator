// 設定を読み込む
async function loadSettings() {
  return await chrome.storage.sync.get({
    ollamaEndpoint: 'http://localhost:11434',
    model: 'translategemma:latest',
    autoTranslate: true,
    targetLanguage: 'ja'
  });
}

// 選択範囲翻訳ボタン
document.getElementById('translateBtn').addEventListener('click', async () => {
  const resultDiv = document.getElementById('result');
  resultDiv.textContent = "翻訳中...";
  const btn = document.getElementById('translateBtn');
  btn.disabled = true;

  try {
    const settings = await loadSettings();

    // 現在のタブで選択されているテキストを取得
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });

    const selectedText = result;

    if (!selectedText || selectedText.trim().length === 0) {
      resultDiv.textContent = "テキストが選択されていません。";
      btn.disabled = false;
      return;
    }

    // 言語コードから言語名へのマッピング
    const languageNames = {
      'ja': 'Japanese',
      'en': 'English',
      'zh': 'Chinese',
      'ko': 'Korean'
    };

    // ソース言語を自動検出
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(selectedText);
    const sourceLang = hasJapanese ? 'ja' : 'en';
    const sourceLanguageName = languageNames[sourceLang] || 'English';
    const targetLanguageName = languageNames[settings.targetLanguage] || 'Japanese';

    // 公式推奨プロンプト形式
    const systemPrompt = `You are a professional ${sourceLanguageName} (${sourceLang}) to ${targetLanguageName} (${settings.targetLanguage}) translator. Your goal is to accurately convey the meaning and nuances of the original ${sourceLanguageName} text while adhering to ${targetLanguageName} grammar, vocabulary, and cultural sensitivities.
Produce only the ${targetLanguageName} translation, without any additional explanations or commentary. Please translate the following ${sourceLanguageName} text into ${targetLanguageName}:

${selectedText}`;

    // Ollama APIにリクエスト送信（ストリーミング）
    const response = await fetch(`${settings.ollamaEndpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          {
            role: 'user',
            content: systemPrompt
          }
        ],
        stream: true,  // ストリーミングを有効化
        options: {
          temperature: 0.3,
          top_p: 0.9
        }
      })
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    // ストリーミングレスポンスを処理
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let translatedText = '';
    resultDiv.textContent = '';

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
            resultDiv.textContent = translatedText;
          }
        } catch (e) {
          console.warn('Failed to parse chunk:', line);
        }
      }
    }

    if (!translatedText) {
      resultDiv.textContent = 'レスポンスが空です。';
    }

  } catch (error) {
    console.error('Error:', error);
    let errorMsg = 'エラーが発生しました。\n\n';

    if (error.message.includes('fetch')) {
      errorMsg += 'Ollamaに接続できません。\n';
      errorMsg += 'http://localhost:11434 で起動していることを確認してください。';
    } else {
      errorMsg += error.message;
    }

    resultDiv.textContent = errorMsg;
  } finally {
    btn.disabled = false;
  }
});

// ページ翻訳トグルスイッチ
const pageTranslateToggle = document.getElementById('pageTranslateToggle');

// 現在のタブの翻訳状態を読み込み
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  chrome.tabs.sendMessage(tab.id, { action: 'isTranslationEnabled' }, (response) => {
    if (!chrome.runtime.lastError && response) {
      pageTranslateToggle.checked = response.enabled;
    }
  });
});

// トグルスイッチの変更イベント
pageTranslateToggle.addEventListener('change', async () => {
  const resultDiv = document.getElementById('result');
  const isEnabled = pageTranslateToggle.checked;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (isEnabled) {
      // 翻訳を有効化
      resultDiv.textContent = "ページ翻訳を開始中...";
      chrome.tabs.sendMessage(tab.id, { action: 'translatePage' }, () => {
        if (chrome.runtime.lastError) {
          resultDiv.textContent = 'エラー: ページを再読み込みしてください';
          pageTranslateToggle.checked = false;
        } else {
          resultDiv.textContent = '✓ ページ翻訳を開始しました！';
          setTimeout(() => {
            resultDiv.textContent = '翻訳結果がここに表示されます';
          }, 2000);
        }
      });
    } else {
      // 翻訳を無効化
      resultDiv.textContent = "ページ翻訳を停止中...";
      chrome.tabs.sendMessage(tab.id, { action: 'stopTranslation' }, () => {
        if (chrome.runtime.lastError) {
          resultDiv.textContent = 'エラー: ページを再読み込みしてください';
        } else {
          resultDiv.textContent = '✓ ページ翻訳を停止しました';
          setTimeout(() => {
            resultDiv.textContent = '翻訳結果がここに表示されます';
          }, 2000);
        }
      });
    }

  } catch (error) {
    console.error('Error:', error);
    resultDiv.textContent = 'エラーが発生しました';
    pageTranslateToggle.checked = !isEnabled;
  }
});

// 設定ページを開く
document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});