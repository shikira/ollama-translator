// Options page script

// 設定を読み込み
function loadSettings() {
  chrome.storage.sync.get({
    ollamaEndpoint: 'http://localhost:11434',
    model: 'translategemma:latest',
    autoTranslate: true,
    targetLanguage: 'ja',
    excludeDomains: []
  }, (settings) => {
    document.getElementById('ollamaEndpoint').value = settings.ollamaEndpoint;
    document.getElementById('model').value = settings.model;
    document.getElementById('autoTranslate').checked = settings.autoTranslate;
    document.getElementById('targetLanguage').value = settings.targetLanguage;

    if (Array.isArray(settings.excludeDomains)) {
      document.getElementById('excludeDomains').value = settings.excludeDomains.join(', ');
    }
  });
}

// 設定を保存
function saveSettings(e) {
  e.preventDefault();

  const ollamaEndpoint = document.getElementById('ollamaEndpoint').value.trim();
  const model = document.getElementById('model').value.trim();
  const autoTranslate = document.getElementById('autoTranslate').checked;
  const targetLanguage = document.getElementById('targetLanguage').value;
  const excludeDomainsText = document.getElementById('excludeDomains').value;

  // カンマ区切りのドメインリストを配列に変換
  const excludeDomains = excludeDomainsText
    .split(',')
    .map(d => d.trim())
    .filter(d => d.length > 0);

  chrome.storage.sync.set({
    ollamaEndpoint,
    model,
    autoTranslate,
    targetLanguage,
    excludeDomains
  }, () => {
    // 保存成功メッセージを表示
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = '✓ 設定を保存しました';
    statusMessage.className = 'status-message success';
    statusMessage.style.display = 'block';

    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  });
}

// イベントリスナー
document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('settingsForm').addEventListener('submit', saveSettings);
