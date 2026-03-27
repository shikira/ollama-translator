"use strict";
// ページ全体の翻訳を行うContent Script
// グローバル状態
const translationState = {
    isEnabled: false,
    translatedNodes: new Map(),
    originalTexts: new Map()
};
// コード要素かどうかを判定
function isCodeElement(element) {
    if (!element)
        return false;
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
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
            // 空白のみ、または短すぎるテキストは除外
            if (!node.nodeValue?.trim() || node.nodeValue.trim().length < 3) {
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
    });
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    return textNodes;
}
// 要素がビューポート内にあるかチェック
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0);
}
// 翻訳処理の主要ロジック（簡略化版）
async function translateTextNode(textNode) {
    const originalText = textNode.nodeValue?.trim();
    if (!originalText || originalText.length < 3)
        return;
    // 既に翻訳済みの場合はスキップ
    if (translationState.translatedNodes.has(textNode))
        return;
    try {
        // 設定を取得
        const settings = await chrome.storage.sync.get({
            ollamaEndpoint: 'http://localhost:11434',
            model: 'translategemma:latest',
            targetLanguage: 'ja'
        });
        // バックグラウンドスクリプトに翻訳を依頼
        const response = await chrome.runtime.sendMessage({
            action: 'translate',
            text: originalText,
            model: settings.model,
            targetLanguage: settings.targetLanguage,
            ollamaEndpoint: settings.ollamaEndpoint
        });
        if (response.success && response.translation) {
            // 元のテキストを保存
            translationState.originalTexts.set(textNode, originalText);
            // 翻訳されたテキストを設定
            textNode.nodeValue = response.translation;
            translationState.translatedNodes.set(textNode, response.translation);
        }
    }
    catch (error) {
        console.error('Translation error:', error);
    }
}
// ページ翻訳を開始
async function startPageTranslation() {
    translationState.isEnabled = true;
    // メインコンテンツ要素を取得
    const mainContent = document.querySelector('main, article, [role="main"], .main-content, #main, #content') || document.body;
    // テキストノードを収集
    const textNodes = collectTextNodes(mainContent);
    // 翻訳処理を並列実行（制限付き）
    const batchSize = 5;
    for (let i = 0; i < textNodes.length; i += batchSize) {
        const batch = textNodes.slice(i, i + batchSize);
        await Promise.all(batch.map(node => translateTextNode(node)));
        // 少し待機してAPIレート制限を回避
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}
// 翻訳を停止し、元のテキストに戻す
function stopTranslation() {
    translationState.isEnabled = false;
    // 翻訳されたテキストを元に戻す
    for (const [node, originalText] of translationState.originalTexts) {
        if (node.nodeValue) {
            node.nodeValue = originalText;
        }
    }
    // 状態をクリア
    translationState.translatedNodes.clear();
    translationState.originalTexts.clear();
}
// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'translatePage':
            startPageTranslation().then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                sendResponse({ success: false, error: error.message });
            });
            return true; // 非同期レスポンス
        case 'stopTranslation':
            stopTranslation();
            sendResponse({ success: true });
            break;
        case 'isTranslationEnabled':
            sendResponse({ enabled: translationState.isEnabled });
            break;
        case 'translateSelection':
            if (message.text) {
                // 選択範囲の翻訳処理（簡略化）
                console.log('Translating selection:', message.text);
            }
            sendResponse({ success: true });
            break;
        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
});
// ページロード時の初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('Ollama Translator content script loaded');
});
