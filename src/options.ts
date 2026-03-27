// Options page script

interface OptionsSettings {
  ollamaEndpoint: string;
  model: string;
  autoTranslate: boolean;
  targetLanguage: string;
  excludeDomains: string[];
}

// 設定を読み込み
function loadOptionsSettings(): void {
  chrome.storage.sync.get({
    ollamaEndpoint: 'http://localhost:11434',
    model: 'translategemma:latest',
    autoTranslate: true,
    targetLanguage: 'ja',
    excludeDomains: []
  }, (settings: any) => {
    (document.getElementById('ollamaEndpoint') as HTMLInputElement).value = settings.ollamaEndpoint;
    (document.getElementById('model') as HTMLInputElement).value = settings.model;
    (document.getElementById('autoTranslate') as HTMLInputElement).checked = settings.autoTranslate;
    (document.getElementById('targetLanguage') as HTMLSelectElement).value = settings.targetLanguage;

    if (Array.isArray(settings.excludeDomains)) {
      (document.getElementById('excludeDomains') as HTMLTextAreaElement).value = settings.excludeDomains.join(', ');
    }
  });
}

// 設定を保存
function saveSettings(e: Event): void {
  e.preventDefault();

  const ollamaEndpoint = (document.getElementById('ollamaEndpoint') as HTMLInputElement).value.trim();
  const model = (document.getElementById('model') as HTMLInputElement).value.trim();
  const autoTranslate = (document.getElementById('autoTranslate') as HTMLInputElement).checked;
  const targetLanguage = (document.getElementById('targetLanguage') as HTMLSelectElement).value;
  const excludeDomainsText = (document.getElementById('excludeDomains') as HTMLTextAreaElement).value;

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
    const statusMessage = document.getElementById('statusMessage')!;
    statusMessage.textContent = '✓ 設定を保存しました';
    statusMessage.className = 'status-message success';
    (statusMessage as HTMLElement).style.display = 'block';

    setTimeout(() => {
      (statusMessage as HTMLElement).style.display = 'none';
    }, 3000);
  });
}

// イベントリスナー
document.addEventListener('DOMContentLoaded', loadOptionsSettings);
document.getElementById('settingsForm')!.addEventListener('submit', saveSettings);
