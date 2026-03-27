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
