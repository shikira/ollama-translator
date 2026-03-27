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
