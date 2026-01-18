// ページ全体の翻訳を行うContent Script

// コード要素かどうかを判定
function isCodeElement(element) {
  if (!element) return false;

  // コード関連タグ
  const codeTags = ['CODE', 'PRE', 'KBD', 'SAMP', 'VAR', 'TT'];

  // 要素自身または祖先がコード要素か確認
  let current = element;
  let depth = 0;
  while (current && depth < 10) {
    const tagName = current.tagName?.toUpperCase();
    const className = current.className || '';

    // タグ名でチェック
    if (codeTags.includes(tagName)) {
      return true;
    }

    // クラス名でチェック（一般的なコードブロッククラス）
    if (className.includes('code') ||
        className.includes('highlight') ||
        className.includes('language-') ||
        className.includes('hljs') ||
        className.includes('prism') ||
        className.includes('syntax')) {
      return true;
    }

    current = current.parentElement;
    depth++;
  }

  return false;
}

// 翻訳対象のテキストノードを収集
function collectTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // 空白のみ、または短すぎるテキストは除外
        if (!node.nodeValue.trim() || node.nodeValue.trim().length < 3) {
          return NodeFilter.FILTER_REJECT;
        }

        const parent = node.parentElement;

        // script, style, noscriptタグ内は除外
        if (parent && ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        // コード要素内は除外
        if (isCodeElement(parent)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  return textNodes;
}

// 要素がビューポート内にあるかチェック
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  );
}

// 要素がメインコンテンツかどうかを判定
function isMainContent(element) {
  if (!element) return false;

  // メインコンテンツを示すセレクタ（優先度高）
  const mainSelectors = ['main', 'article', '[role="main"]', '.main-content', '#main', '#content'];

  // ナビゲーション・サイドバー等（優先度低）
  const nonMainSelectors = ['nav', 'aside', 'header', 'footer', '[role="navigation"]', '[role="complementary"]', '.sidebar', '.nav', '.menu'];

  // 要素自身または祖先がメインコンテンツか確認
  let current = element;
  let depth = 0;
  while (current && depth < 10) {
    const tagName = current.tagName?.toLowerCase();
    const className = current.className || '';
    const id = current.id || '';
    const role = current.getAttribute('role') || '';

    // ナビゲーション等はメインではない
    if (nonMainSelectors.some(selector => {
      if (selector.startsWith('.')) return className.includes(selector.slice(1));
      if (selector.startsWith('#')) return id === selector.slice(1);
      if (selector.startsWith('[')) return role === selector.match(/role="([^"]+)"/)?.[1];
      return tagName === selector;
    })) {
      return false;
    }

    // メインコンテンツ判定
    if (mainSelectors.some(selector => {
      if (selector.startsWith('.')) return className.includes(selector.slice(1));
      if (selector.startsWith('#')) return id === selector.slice(1);
      if (selector.startsWith('[')) return role === selector.match(/role="([^"]+)"/)?.[1];
      return tagName === selector;
    })) {
      return true;
    }

    current = current.parentElement;
    depth++;
  }

  // body直下の要素はメインコンテンツとみなす（デフォルト）
  return true;
}

// テキストを段落ごとにグループ化（最適化版）
function groupTextNodesByParagraph(textNodes) {
  const paragraphs = [];
  let currentParagraph = [];
  let currentLength = 0;
  const maxCharsPerGroup = 1000; // 1グループの最大文字数（500→1000に増加）

  textNodes.forEach((node, index) => {
    const text = node.nodeValue.trim();
    if (text) {
      currentParagraph.push({ node, text });
      currentLength += text.length;

      const nextNode = textNodes[index + 1];
      const parentChanged = nextNode && nextNode.parentElement !== node.parentElement;
      const reachedMaxLength = currentLength >= maxCharsPerGroup;

      // 段落の区切り判定
      if (!nextNode || parentChanged || reachedMaxLength) {
        paragraphs.push(currentParagraph);
        currentParagraph = [];
        currentLength = 0;
      }
    }
  });

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph);
  }

  return paragraphs;
}

// 翻訳リクエストを送信（background workerを経由）
async function translateText(text, model, targetLanguage = 'ja', ollamaEndpoint = 'http://localhost:11434') {
  try {
    // Background workerにメッセージを送信
    const response = await chrome.runtime.sendMessage({
      action: 'translate',
      text: text,
      model: model,
      targetLanguage: targetLanguage,
      ollamaEndpoint: ollamaEndpoint
    });

    if (response.success) {
      return response.translation;
    } else {
      console.error('Translation failed:', response.error);
      return null;
    }
  } catch (error) {
    console.error('Translation error:', error);
    return null;
  }
}

// グローバル状態管理
let translationState = {
  isTranslating: false,
  translatedParagraphs: new Set(), // 既に翻訳済みの段落を追跡
  allParagraphs: [],
  settings: null,
  statusDiv: null,
  isShowingTranslation: true, // 翻訳を表示中かどうか
  nodeTranslations: new WeakMap(), // テキストノードと翻訳データのマッピング
  isCancelled: false // 翻訳キャンセルフラグ
};

// 翻訳を停止
function stopTranslation() {
  console.log('📍 翻訳を停止します...');

  // キャンセルフラグを立てる
  translationState.isCancelled = true;

  // このタブの翻訳を無効化
  chrome.runtime.sendMessage({ action: 'disableTranslation' }, (response) => {
    if (response && response.success) {
      console.log('✓ このタブの翻訳を無効化しました');
    }
  });

  // 原文表示に戻す
  if (translationState.isShowingTranslation) {
    console.log('📍 原文表示に戻します...');
    let switchedCount = 0;

    translationState.allParagraphs.forEach(paragraph => {
      if (!translationState.translatedParagraphs.has(paragraph.id)) {
        return; // 未翻訳の段落はスキップ
      }

      paragraph.forEach(item => {
        const data = translationState.nodeTranslations.get(item.node);
        if (data) {
          // 原文を表示
          item.node.nodeValue = data.originalText;
          switchedCount++;
        }
      });
    });

    translationState.isShowingTranslation = false;
    console.log(`✓ ${switchedCount}個のノードを原文に戻しました`);
  }

  // ステータス表示を更新
  const statusDiv = translationState.statusDiv;
  if (statusDiv) {
    statusDiv.style.background = 'rgba(220, 53, 69, 0.9)';
    const statusText = document.getElementById('ollama-status-text');
    if (statusText) {
      statusText.textContent = '✕ 翻訳を停止しました';
    }

    setTimeout(() => {
      if (statusDiv) statusDiv.style.display = 'none';
    }, 3000);
  }

  // トグルボタンを削除
  const toggleBtn = document.getElementById('ollama-translator-toggle-btn');
  if (toggleBtn) {
    toggleBtn.remove();
  }
}

// 翻訳を実行
async function translatePage() {
  console.log('Starting page translation...');

  // キャンセルフラグをリセット
  translationState.isCancelled = false;

  // 設定を取得
  const settings = await chrome.storage.sync.get({
    ollamaEndpoint: 'http://localhost:11434',
    model: 'translategemma:latest',
    autoTranslate: true,
    targetLanguage: 'ja'
  });

  console.log('Translation settings:', settings);

  if (!settings.autoTranslate) {
    console.log('Auto-translate is disabled');
    return;
  }

  translationState.settings = settings;

  // 翻訳状態を表示（既存のものを再利用または新規作成）
  let statusDiv = translationState.statusDiv;
  if (!statusDiv || !document.body.contains(statusDiv)) {
    statusDiv = document.createElement('div');
    statusDiv.id = 'ollama-translator-status';
    statusDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 123, 255, 0.9);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 999999;
      font-family: sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    document.body.appendChild(statusDiv);
    translationState.statusDiv = statusDiv;
  }

  // ステータスdivをクリアして再構築
  statusDiv.innerHTML = '';
  statusDiv.style.display = 'flex';
  statusDiv.style.background = 'rgba(0, 123, 255, 0.9)';

  // ステータステキストを作成
  const statusText = document.createElement('span');
  statusText.id = 'ollama-status-text';
  statusText.textContent = '翻訳中...';
  statusDiv.appendChild(statusText);

  // トグルボタンを表示（翻訳開始時に表示）
  showToggleButton();

  try {
    // テキストノードを収集
    const textNodes = collectTextNodes(document.body);
    console.log(`Found ${textNodes.length} text nodes`);

    const paragraphs = groupTextNodesByParagraph(textNodes);
    console.log(`Grouped into ${paragraphs.length} paragraphs`);

    // ページ全体の主要言語を検出
    let totalJapanese = 0;
    let totalChinese = 0;
    let totalKorean = 0;
    let totalOther = 0;

    paragraphs.forEach(paragraph => {
      const text = paragraph.map(item => item.text).join(' ');
      const charCount = text.length;

      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
        totalJapanese += charCount;
      } else if (/[\u4E00-\u9FFF]/.test(text)) {
        totalChinese += charCount;
      } else if (/[\uAC00-\uD7AF]/.test(text)) {
        totalKorean += charCount;
      } else {
        totalOther += charCount;
      }
    });

    const total = totalJapanese + totalChinese + totalKorean + totalOther;
    const pagePrimaryLanguage =
      totalJapanese / total > 0.3 ? 'ja' :
      totalChinese / total > 0.3 ? 'zh' :
      totalKorean / total > 0.3 ? 'ko' : 'other';

    console.log(`📊 ページ言語分析:`);
    console.log(`  日本語: ${((totalJapanese / total) * 100).toFixed(1)}%`);
    console.log(`  中国語: ${((totalChinese / total) * 100).toFixed(1)}%`);
    console.log(`  韓国語: ${((totalKorean / total) * 100).toFixed(1)}%`);
    console.log(`  その他: ${((totalOther / total) * 100).toFixed(1)}%`);
    console.log(`  判定: ${pagePrimaryLanguage}ページ`);

    let translatedCount = 0;

    // 翻訳が必要な段落をフィルタリング
    const paragraphsToTranslate = paragraphs.filter(paragraph => {
      const combinedText = paragraph.map(item => item.text).join(' ');

      // 短すぎるテキストはスキップ
      if (combinedText.trim().length < 3) {
        return false;
      }

      // 言語検出
      const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(combinedText);
      const hasChinese = /[\u4E00-\u9FFF]/.test(combinedText) && !hasJapanese;
      const hasKorean = /[\uAC00-\uD7AF]/.test(combinedText);

      // デバッグ: 言語検出結果をログ（最初の10段落のみ）
      const paragraphIndex = paragraphs.indexOf(paragraph);
      if (paragraphIndex < 10) {
        console.log(`\n段落 ${paragraphIndex + 1}:`, combinedText.substring(0, 80) + (combinedText.length > 80 ? '...' : ''));
        console.log(`  - 日本語検出: ${hasJapanese}, 中国語: ${hasChinese}, 韓国語: ${hasKorean}`);
        console.log(`  - ページ主要言語: ${pagePrimaryLanguage}`);
      }

      // ページの主要言語と同じ言語は翻訳しない（例: 日本語ページの日本語テキスト）
      if (pagePrimaryLanguage === 'ja' && hasJapanese) {
        return false; // 日本語ページの日本語は翻訳しない
      }
      if (pagePrimaryLanguage === 'zh' && hasChinese) {
        return false; // 中国語ページの中国語は翻訳しない
      }
      if (pagePrimaryLanguage === 'ko' && hasKorean) {
        return false; // 韓国語ページの韓国語は翻訳しない
      }

      // ターゲット言語と同じ場合もスキップ
      if (settings.targetLanguage === 'ja' && hasJapanese) {
        return false;
      }
      if (settings.targetLanguage === 'zh' && hasChinese) {
        return false;
      }
      if (settings.targetLanguage === 'ko' && hasKorean) {
        return false;
      }

      // それ以外は翻訳対象
      return true;
    });

    console.log(`Target language: ${settings.targetLanguage}`);
    console.log(`Translating ${paragraphsToTranslate.length} paragraphs out of ${paragraphs.length}`);

    // 翻訳対象がない場合は早期リターン
    if (paragraphsToTranslate.length === 0) {
      console.log('⚠️ 翻訳対象のテキストが見つかりませんでした');
      if (statusDiv) {
        statusDiv.style.background = 'rgba(255, 193, 7, 0.9)';
        const statusText = document.getElementById('ollama-status-text');
        if (statusText) {
          statusText.textContent = '⚠️ 翻訳対象のテキストがありません';
        }
        setTimeout(() => {
          if (statusDiv) statusDiv.style.display = 'none';
        }, 3000);
      }
      return;
    }

    // 優先度別に段落を分類（3段階: メインコンテンツ優先）
    const visibleMainParagraphs = [];      // 1. 表示中のメインコンテンツ（最優先）
    const invisibleMainParagraphs = [];    // 2. 非表示のメインコンテンツ
    const nonMainParagraphs = [];          // 3. ナビ・サイドバー等（最低優先）

    paragraphsToTranslate.forEach(paragraph => {
      const firstNode = paragraph[0].node;
      const element = firstNode.parentElement;

      const visible = element && isInViewport(element);
      const main = isMainContent(element);

      if (visible && main) {
        visibleMainParagraphs.push(paragraph);
      } else if (!visible && main) {
        invisibleMainParagraphs.push(paragraph);
      } else {
        nonMainParagraphs.push(paragraph);
      }
    });

    console.log(`📍 翻訳優先度:`);
    console.log(`  1. 表示中メインコンテンツ: ${visibleMainParagraphs.length}個`);
    console.log(`  2. 非表示メインコンテンツ: ${invisibleMainParagraphs.length}個`);
    console.log(`  3. ナビ・サイドバー等: ${nonMainParagraphs.length}個`);

    // デバッグ: 翻訳対象のテキストを全て表示
    console.log('=== 1. 表示中メインコンテンツ ===');
    visibleMainParagraphs.forEach((paragraph, index) => {
      const combinedText = paragraph.map(item => item.text).join(' ');
      const element = paragraph[0].node.parentElement;
      const tagInfo = `<${element.tagName.toLowerCase()}${element.className ? ` class="${element.className}"` : ''}${element.id ? ` id="${element.id}"` : ''}>`;
      console.log(`[${index + 1}/${visibleMainParagraphs.length}] ${tagInfo} (${combinedText.length}文字):`, combinedText.substring(0, 100) + (combinedText.length > 100 ? '...' : ''));
    });
    console.log('=== 2. 非表示メインコンテンツ ===');
    invisibleMainParagraphs.forEach((paragraph, index) => {
      const combinedText = paragraph.map(item => item.text).join(' ');
      const element = paragraph[0].node.parentElement;
      const tagInfo = `<${element.tagName.toLowerCase()}${element.className ? ` class="${element.className}"` : ''}${element.id ? ` id="${element.id}"` : ''}>`;
      console.log(`[${index + 1}/${invisibleMainParagraphs.length}] ${tagInfo} (${combinedText.length}文字):`, combinedText.substring(0, 100) + (combinedText.length > 100 ? '...' : ''));
    });
    console.log('=== 3. ナビ・サイドバー等 ===');
    nonMainParagraphs.forEach((paragraph, index) => {
      const combinedText = paragraph.map(item => item.text).join(' ');
      const element = paragraph[0].node.parentElement;
      const tagInfo = `<${element.tagName.toLowerCase()}${element.className ? ` class="${element.className}"` : ''}${element.id ? ` id="${element.id}"` : ''}>`;
      console.log(`[${index + 1}/${nonMainParagraphs.length}] ${tagInfo} (${combinedText.length}文字):`, combinedText.substring(0, 100) + (combinedText.length > 100 ? '...' : ''));
    });
    console.log('=========================');

    // 段落にユニークIDを付与（翻訳済み管理用）
    paragraphsToTranslate.forEach((paragraph, index) => {
      paragraph.id = `para_${index}`;
    });

    // グローバル状態に保存
    translationState.allParagraphs = paragraphsToTranslate;

    // 翻訳関数の定義
    const translateParagraph = async (paragraph, index) => {
      // キャンセルされている場合は処理しない
      if (translationState.isCancelled) {
        return;
      }

      // 既に翻訳済みの場合はスキップ
      if (translationState.translatedParagraphs.has(paragraph.id)) {
        return;
      }

      const combinedText = paragraph.map(item => item.text).join(' ');

      console.log(`\n[翻訳開始 ${index + 1}/${paragraphsToTranslate.length}]`);
      console.log(`原文 (${combinedText.length}文字):`, combinedText.substring(0, 150) + (combinedText.length > 150 ? '...' : ''));

      const translatedText = await translateText(combinedText, settings.model, settings.targetLanguage, settings.ollamaEndpoint);

      // 翻訳後にもキャンセルチェック
      if (translationState.isCancelled) {
        return;
      }

      // 翻訳完了後、即座にページに反映
      if (translatedText) {
        console.log(`訳文 (${translatedText.length}文字):`, translatedText.substring(0, 150) + (translatedText.length > 150 ? '...' : ''));

        // 元のテキストを保存（各ノードごとに）
        paragraph.forEach(item => {
          translationState.nodeTranslations.set(item.node, {
            originalText: item.node.nodeValue,
            translatedText: null
          });
        });

        // 翻訳テキストを保存して適用
        if (paragraph.length === 1) {
          translationState.nodeTranslations.get(paragraph[0].node).translatedText = translatedText;
          paragraph[0].node.nodeValue = translatedText;
        } else {
          translationState.nodeTranslations.get(paragraph[0].node).translatedText = translatedText;
          paragraph[0].node.nodeValue = translatedText;
          for (let j = 1; j < paragraph.length; j++) {
            translationState.nodeTranslations.get(paragraph[j].node).translatedText = '';
            paragraph[j].node.nodeValue = '';
          }
        }
        translatedCount++;
        translationState.translatedParagraphs.add(paragraph.id); // 翻訳済みとしてマーク

        // 進捗を更新（リアルタイム）
        const progress = Math.round((translatedCount / paragraphsToTranslate.length) * 100);
        const statusText = document.getElementById('ollama-status-text');
        if (statusText) {
          statusText.textContent = `翻訳中... (${translatedCount}/${paragraphsToTranslate.length}) - ${progress}%`;
        }

        console.log(`✓ 完了 ${translatedCount}/${paragraphsToTranslate.length} (${progress}%)`);
      } else {
        console.error(`✗ 翻訳失敗: ${combinedText.substring(0, 50)}...`);
      }
    };

    // 並列数制限付き翻訳関数
    const MAX_CONCURRENT = 5; // 最大並列数
    const translateWithLimit = async (paragraphs, startIndex = 0) => {
      const queue = [...paragraphs];
      const executing = [];
      let index = startIndex;

      while (queue.length > 0 || executing.length > 0) {
        // キャンセルチェック
        if (translationState.isCancelled) {
          return;
        }

        // 並列数の空きがあれば新しいタスクを開始
        while (executing.length < MAX_CONCURRENT && queue.length > 0) {
          const paragraph = queue.shift();
          const promise = translateParagraph(paragraph, index++).then(() => {
            executing.splice(executing.indexOf(promise), 1);
          });
          executing.push(promise);
        }

        // 少なくとも1つのタスクが完了するまで待機
        if (executing.length > 0) {
          await Promise.race(executing);
        }
      }
    };

    // 優先度付き翻訳：メインコンテンツ優先（3段階）
    let completedIndex = 0;

    // 1. 表示中のメインコンテンツ（最優先）
    console.log('📍 1. 表示中メインコンテンツの翻訳を開始...');
    const statusText = document.getElementById('ollama-status-text');
    if (statusText) {
      statusText.textContent = `翻訳中（メイン優先）... (0/${paragraphsToTranslate.length})`;
    }
    await translateWithLimit(visibleMainParagraphs, completedIndex);
    completedIndex += visibleMainParagraphs.length;

    // キャンセルされていたら中断
    if (translationState.isCancelled) {
      console.log('✗ 翻訳が停止されました');
      return;
    }

    console.log('✓ 表示中メインコンテンツの翻訳完了');

    // 2. 非表示のメインコンテンツ
    if (invisibleMainParagraphs.length > 0) {
      console.log('📍 2. 非表示メインコンテンツの翻訳を開始...');
      await translateWithLimit(invisibleMainParagraphs, completedIndex);
      completedIndex += invisibleMainParagraphs.length;

      if (translationState.isCancelled) {
        console.log('✗ 翻訳が停止されました');
        return;
      }

      console.log('✓ 非表示メインコンテンツの翻訳完了');
    }

    // 3. ナビ・サイドバー等（最低優先）
    if (nonMainParagraphs.length > 0) {
      console.log('📍 3. ナビ・サイドバー等の翻訳を開始...');
      await translateWithLimit(nonMainParagraphs, completedIndex);

      if (translationState.isCancelled) {
        console.log('✗ 翻訳が停止されました');
        return;
      }

      console.log('✓ ナビ・サイドバー等の翻訳完了');
    }

    if (statusDiv) {
      const statusText = document.getElementById('ollama-status-text');

      if (translatedCount === 0) {
        // 翻訳対象はあったが、実際には何も翻訳されなかった場合
        statusDiv.style.background = 'rgba(255, 193, 7, 0.9)';
        if (statusText) {
          statusText.textContent = '⚠️ 翻訳できませんでした';
        }
      } else {
        // 正常に翻訳された場合
        statusDiv.style.background = 'rgba(40, 167, 69, 0.9)';
        if (statusText) {
          statusText.textContent = `✓ 翻訳完了 (${translatedCount}個の段落を翻訳)`;
        }
      }

      setTimeout(() => {
        if (statusDiv) statusDiv.style.display = 'none';
      }, 3000);
    }

    console.log(`Translation completed: ${translatedCount} paragraphs translated out of ${paragraphsToTranslate.length} candidates (${paragraphs.length} total)`);

    // スクロール監視を開始
    setupScrollTranslation();

  } catch (error) {
    console.error('Translation failed:', error);
    statusDiv.style.background = 'rgba(220, 53, 69, 0.9)';
    statusDiv.textContent = '翻訳エラー';
    setTimeout(() => statusDiv.remove(), 3000);
  }
}

// トグルボタンを表示
function showToggleButton() {
  // 既存のボタンがあれば削除
  const existingButton = document.getElementById('ollama-translator-toggle-btn');
  if (existingButton) {
    existingButton.remove();
  }

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'ollama-translator-toggle-btn';
  toggleBtn.textContent = '🌐 原文表示';
  toggleBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 123, 255, 0.9);
    color: white;
    padding: 12px 20px;
    border: none;
    border-radius: 25px;
    z-index: 999999;
    font-family: sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.2s;
  `;

  toggleBtn.addEventListener('mouseenter', () => {
    toggleBtn.style.transform = 'scale(1.05)';
    toggleBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
  });

  toggleBtn.addEventListener('mouseleave', () => {
    toggleBtn.style.transform = 'scale(1)';
    toggleBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  });

  toggleBtn.addEventListener('click', toggleTranslation);

  document.body.appendChild(toggleBtn);
  console.log('✓ トグルボタンを表示しました');
}

// 翻訳と原文を切り替える
function toggleTranslation() {
  const toggleBtn = document.getElementById('ollama-translator-toggle-btn');
  if (!toggleBtn) return;

  translationState.isShowingTranslation = !translationState.isShowingTranslation;

  console.log(`📍 ${translationState.isShowingTranslation ? '翻訳' : '原文'}に切り替え中...`);

  let switchedCount = 0;

  // 全ての段落のノードを切り替え
  translationState.allParagraphs.forEach(paragraph => {
    if (!translationState.translatedParagraphs.has(paragraph.id)) {
      return; // 未翻訳の段落はスキップ
    }

    paragraph.forEach(item => {
      const data = translationState.nodeTranslations.get(item.node);
      if (data) {
        if (translationState.isShowingTranslation) {
          // 翻訳を表示
          if (data.translatedText !== null) {
            item.node.nodeValue = data.translatedText;
            switchedCount++;
          }
        } else {
          // 原文を表示
          item.node.nodeValue = data.originalText;
          switchedCount++;
        }
      }
    });
  });

  // ボタンのテキストと色を更新
  if (translationState.isShowingTranslation) {
    toggleBtn.textContent = '🌐 原文表示';
    toggleBtn.style.background = 'rgba(0, 123, 255, 0.9)';
  } else {
    toggleBtn.textContent = '🌏 翻訳表示';
    toggleBtn.style.background = 'rgba(255, 123, 0, 0.9)';
  }

  console.log(`✓ ${switchedCount}個のテキストを切り替えました`);
}

// スクロール時に表示範囲の未翻訳部分を翻訳
let scrollTranslationTimeout = null;
let isScrollTranslating = false;

async function translateVisibleUntranslated() {
  if (isScrollTranslating || !translationState.settings || translationState.allParagraphs.length === 0) {
    return;
  }

  isScrollTranslating = true;

  // 表示範囲内の未翻訳段落を見つける
  const visibleUntranslated = translationState.allParagraphs.filter(paragraph => {
    if (translationState.translatedParagraphs.has(paragraph.id)) {
      return false; // 既に翻訳済み
    }

    const firstNode = paragraph[0].node;
    const element = firstNode.parentElement;
    return element && isInViewport(element);
  });

  if (visibleUntranslated.length > 0) {
    console.log(`📍 スクロール検出: ${visibleUntranslated.length}個の未翻訳段落が表示範囲に入りました`);

    const statusDiv = translationState.statusDiv;
    if (statusDiv) {
      statusDiv.style.display = 'block';
      statusDiv.style.background = 'rgba(0, 123, 255, 0.9)';
      statusDiv.textContent = `追加翻訳中... (${visibleUntranslated.length}個)`;
    }

    // 表示範囲の未翻訳部分を並列で翻訳
    const promises = visibleUntranslated.map(async (paragraph) => {
      const combinedText = paragraph.map(item => item.text).join(' ');
      const translatedText = await translateText(combinedText, translationState.settings.model, translationState.settings.targetLanguage, translationState.settings.ollamaEndpoint);

      if (translatedText) {
        // 元のテキストを保存（各ノードごとに）
        paragraph.forEach(item => {
          translationState.nodeTranslations.set(item.node, {
            originalText: item.node.nodeValue,
            translatedText: null
          });
        });

        // 翻訳テキストを保存して適用
        if (paragraph.length === 1) {
          translationState.nodeTranslations.get(paragraph[0].node).translatedText = translatedText;
          paragraph[0].node.nodeValue = translatedText;
        } else {
          translationState.nodeTranslations.get(paragraph[0].node).translatedText = translatedText;
          paragraph[0].node.nodeValue = translatedText;
          for (let j = 1; j < paragraph.length; j++) {
            translationState.nodeTranslations.get(paragraph[j].node).translatedText = '';
            paragraph[j].node.nodeValue = '';
          }
        }
        translationState.translatedParagraphs.add(paragraph.id);
        console.log(`✓ スクロール翻訳完了: ${combinedText.substring(0, 50)}...`);
      }
    });

    await Promise.all(promises);

    if (statusDiv) {
      statusDiv.style.background = 'rgba(40, 167, 69, 0.9)';
      statusDiv.textContent = `✓ 追加翻訳完了`;
      setTimeout(() => {
        if (statusDiv) statusDiv.style.display = 'none';
      }, 2000);
    }

    console.log('✓ スクロール範囲の翻訳完了');
  }

  isScrollTranslating = false;
}

function setupScrollTranslation() {
  console.log('📍 スクロール監視を開始');

  window.addEventListener('scroll', () => {
    // デバウンス: スクロールが止まってから500ms後に翻訳開始
    if (scrollTranslationTimeout) {
      clearTimeout(scrollTranslationTimeout);
    }

    scrollTranslationTimeout = setTimeout(() => {
      translateVisibleUntranslated();
    }, 500);
  }, { passive: true });
}

// メッセージリスナー（手動翻訳トリガー用）
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'translatePage') {
    // このタブの翻訳を有効化してから翻訳開始
    chrome.runtime.sendMessage({ action: 'enableTranslation' }, (response) => {
      if (response && response.success) {
        console.log('✓ このタブの翻訳を有効化しました');
        // ページ遷移検出を開始（まだ開始していない場合）
        if (!isPageChangeDetectionActive) {
          detectPageChange();
        }
        translatePage().then(() => sendResponse({ success: true }));
      } else {
        console.error('翻訳の有効化に失敗しました');
        sendResponse({ success: false });
      }
    });
    return true; // 非同期レスポンス
  }

  if (request.action === 'stopTranslation') {
    stopTranslation();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'isTranslationEnabled') {
    // background workerに問い合わせ
    chrome.runtime.sendMessage({ action: 'isTranslationEnabled' }, (response) => {
      sendResponse(response);
    });
    return true;
  }
});

// ページ遷移検出用
let lastUrl = location.href;
let isPageChangeDetectionActive = false;

// ページ遷移を監視（SPA対応）- 翻訳が有効化されたタブでのみ動作
function detectPageChange() {
  if (isPageChangeDetectionActive) {
    console.log('📍 ページ遷移監視は既に開始されています');
    return;
  }

  isPageChangeDetectionActive = true;

  const observer = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      console.log('📍 ページ遷移を検出:', lastUrl, '->', currentUrl);
      lastUrl = currentUrl;

      // このタブで翻訳が有効かチェック
      chrome.runtime.sendMessage({ action: 'isTranslationEnabled' }, (response) => {
        if (response && response.enabled) {
          console.log('✓ 翻訳が有効なタブなので、ページ遷移後も翻訳を実行します');

          // 翻訳状態をリセット
          translationState.translatedParagraphs.clear();
          translationState.allParagraphs = [];

          // 少し待ってから翻訳実行（DOM更新を待つ）
          setTimeout(() => {
            translatePage();
          }, 1500);
        } else {
          console.log('✓ 翻訳が無効なタブなので、ページ遷移後は翻訳しません');
        }
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('📍 ページ遷移監視を開始（SPA対応）');
}

// 初期化: 自動翻訳は実行しない（ボタンクリック時のみ翻訳）
console.log('📍 Ollama Translator コンテンツスクリプトを読み込みました');
console.log('📍 "ページ全体を翻訳"ボタンをクリックすると翻訳が開始されます');
