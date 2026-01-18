# 🌐 Ollama Translator - Local LLM翻訳Chrome拡張

ローカルで動作するOllama LLM（translategemma:latest）を使用して、Webページを翻訳するChrome拡張機能です。

## ✨ 機能

- **🌍 ページ翻訳トグル**: ポップアップからワンクリックでページ全体の翻訳をON/OFF
- **📝 選択範囲の翻訳**: テキストを選択して翻訳
- **🎯 優先度翻訳**: 表示中のメインコンテンツ → 非表示のメインコンテンツ → ナビゲーションの順で翻訳
- **🔄 原文/翻訳の切り替え**: 翻訳中でも原文と翻訳をワンクリックで切り替え可能
- **⚡ 並列処理**: 最大5つの翻訳リクエストを並列実行（サーバー負荷を最適化）
- **🖱️ コンテキストメニュー**: 右クリックメニューから翻訳を実行
- **⚙️ カスタマイズ可能**: モデルや翻訳先言語を設定可能
- **🔒 プライバシー保護**: すべての処理がローカルで完結（外部APIを使用しない）

## 📋 前提条件

### 1. Ollamaのインストール

[Ollama公式サイト](https://ollama.ai/)からダウンロードしてインストールしてください。

### 2. translategemmaモデルのダウンロード

ターミナルで以下のコマンドを実行:

```bash
ollama pull translategemma:latest
```

または、特定のサイズを指定:

```bash
ollama pull translategemma:4b   # 軽量・高速（3.3GB）
ollama pull translategemma:12b  # バランス型（8.1GB）
ollama pull translategemma:27b  # 高品質（17GB）
```

### 3. Ollamaの起動（重要）

**Chrome拡張機能からOllamaにアクセスするには、CORS設定が必要です。**

以下のコマンドでOllamaを起動してください:

#### macOS / Linux:
```bash
OLLAMA_ORIGINS="chrome-extension://*" ollama serve
```

#### Windows (PowerShell):
```powershell
$env:OLLAMA_ORIGINS="chrome-extension://*"; ollama serve
```

#### Windows (コマンドプロンプト):
```cmd
set OLLAMA_ORIGINS=chrome-extension://* && ollama serve
```

**⚠️ 注意**: `OLLAMA_ORIGINS` を指定しないと、ブラウザからのリクエストがCORSエラーで拒否されます。

**セキュリティ**: `chrome-extension://*` を指定することで、Chrome拡張機能からのアクセスのみを許可し、セキュリティを向上させています。

※ デフォルトでは `http://localhost:11434` で動作していることを想定していますが、設定画面でエンドポイントを変更できます。

## 🚀 インストール方法

### 方法1: Chrome Web Storeから（公開後）
*現在は未公開です。方法2を使用してください。*

### 方法2: 開発モードでインストール

1. このリポジトリをクローンまたはダウンロード:
   ```bash
   git clone https://github.com/yourusername/ollama-translator.git
   cd ollama-translator
   ```

2. アイコン画像を生成:
   - `create-icons.html` をブラウザで開く
   - 「アイコンを生成」ボタンをクリック
   - ダウンロードされた3つのPNGファイル（icon16.png, icon48.png, icon128.png）を拡張機能フォルダに配置

3. Chromeで拡張機能を読み込む:
   - Chrome を開き、`chrome://extensions/` にアクセス
   - 右上の「デベロッパーモード」をONにする
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - このフォルダを選択

## 📖 使い方

### ページ翻訳（推奨）

1. Ollamaを起動した状態で、翻訳したいWebページを開く
2. ツールバーの拡張機能アイコンをクリック
3. 「🌍 ページ翻訳」トグルスイッチをONにする
4. ページが自動的に翻訳されます（右上に進捗が表示されます）

**便利な機能:**
- **原文/翻訳の切り替え**: ページ右下に表示される「🌐 原文表示」ボタンで切り替え可能
- **翻訳の停止**: トグルスイッチをOFFにすると、翻訳が停止し原文に戻ります
- **優先度翻訳**: 表示中のメインコンテンツが優先的に翻訳されます

### 選択範囲の翻訳

#### ポップアップから翻訳

1. 翻訳したいテキストを選択
2. ツールバーの拡張機能アイコンをクリック
3. 「📝 選択範囲翻訳」ボタンをクリック
4. ポップアップ内に翻訳結果が表示されます

#### コンテキストメニューから翻訳

1. テキストを選択して右クリック
2. 「選択範囲を翻訳」を選択

または

1. ページ上で右クリック
2. 「ページ全体を翻訳」を選択

## ⚙️ 設定

拡張機能のポップアップから⚙️アイコンをクリック、または右クリック→「オプション」から設定画面を開けます。

### 設定項目

- **Ollamaエンドポイント**: OllamaのAPIエンドポイントURL（デフォルト: `http://localhost:11434`）
  - デフォルト以外のポート（例: `http://localhost:8080`）やリモートサーバー（例: `http://192.168.1.100:11434`）も指定可能
- **翻訳モデル**: 使用するOllamaモデル（デフォルト: `translategemma:latest`）
- **翻訳先言語**: 日本語、英語、中国語、韓国語から選択
- **除外ドメイン**: 翻訳を実行しないドメインをカンマ区切りで指定（例: `github.com, localhost`）

**注**: 「自動翻訳」設定は廃止され、ページごとにトグルスイッチでON/OFFを切り替える方式になりました。

## 🔧 トラブルシューティング

### CORSエラー / 翻訳が動作しない

**最も多い原因**: OllamaをCORS設定なしで起動している

**解決方法**: Ollamaを以下のコマンドで再起動してください:

```bash
# macOS / Linux
OLLAMA_ORIGINS="chrome-extension://*" ollama serve

# Windows (PowerShell)
$env:OLLAMA_ORIGINS="chrome-extension://*"; ollama serve
```

その他の確認事項:

1. **Ollamaが起動しているか確認**:
   ```bash
   curl http://localhost:11434/api/tags
   ```
   正常に動作していれば、利用可能なモデルのリストが返されます。

2. **translategemmaモデルがインストールされているか確認**:
   ```bash
   ollama list
   ```
   `translategemma:latest`、`translategemma:4b`、`translategemma:12b`、または`translategemma:27b`が表示されるはずです。

3. **ブラウザコンソールを確認**:
   - F12キーを押してデベロッパーツールを開く
   - Consoleタブでエラーメッセージを確認
   - CORSエラーが表示されている場合は、CORS設定が必要です

### 翻訳が遅い

- より高速な翻訳には、より小さなモデル（`translategemma:4b`）の使用を検討してください
- ページ全体の翻訳は、テキスト量に応じて時間がかかります
- 並列処理は最大5リクエストに制限されています

### ページが正しく翻訳されない

- コード要素（`<code>`, `<pre>`タグなど）は自動的に翻訳対象から除外されます
- 一部のWebサイトは動的にコンテンツを生成するため、完全に翻訳できない場合があります
- 翻訳トグルボタンで原文と翻訳を切り替えて確認してください

## 🛠️ 開発

### ファイル構成

```
ollama-translator/
├── manifest.json          # 拡張機能の設定
├── background.js          # バックグラウンドサービスワーカー
├── content.js             # ページに注入されるスクリプト
├── popup.html             # ポップアップUI
├── popup.js              # ポップアップのロジック
├── options.html          # 設定ページUI
├── options.js            # 設定ページのロジック
├── create-icons.html     # アイコン生成ツール
└── README.md             # このファイル
```

### 技術仕様

- **優先度翻訳システム**: 3段階の優先度でコンテンツを翻訳
  1. 表示中のメインコンテンツ（最優先）
  2. 非表示のメインコンテンツ
  3. ナビゲーション・サイドバー等
- **並列処理**: 最大5つの翻訳リクエストを同時実行
- **メモリ効率**: WeakMapを使用して原文と翻訳を管理
- **SPA対応**: MutationObserverでページ遷移を検出

### カスタマイズ

異なるLLMモデルを使用する場合は、設定ページでモデル名を変更してください。Ollamaで利用可能な翻訳モデル:

- `translategemma:4b` - 軽量高速、3.3GB（推奨）
- `translategemma:12b` - バランス型、8.1GB
- `translategemma:27b` - 高品質、17GB
- `translategemma:latest` - 最新版（デフォルト）

## 📝 ライセンス

MIT License

## 🤝 コントリビューション

バグ報告や機能リクエストは、GitHubのIssuesでお願いします。

## ⚠️ 注意事項

- **CORS設定が必須**: `OLLAMA_ORIGINS="chrome-extension://*"` を指定してOllamaを起動する必要があります
- この拡張機能はローカルLLMを使用するため、インターネット接続は不要ですが、Ollamaの起動が必須です
- 大量のテキストを翻訳する場合、処理に時間がかかることがあります
- 翻訳精度はモデルの性能に依存します
- ページ単位で翻訳状態が管理されます（タブごとに独立）

## 🙏 謝辞

この拡張機能は以下のプロジェクトを使用しています:

- [Ollama](https://ollama.ai/) - ローカルLLMランタイム
- [TranslateGemma](https://ai.google.dev/gemma) - Googleの翻訳モデル
