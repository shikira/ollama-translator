# 🌐 Ollama Translator - ローカルLLM翻訳Chrome拡張機能

ローカルで動作するOllama LLMモデルを使用してWebページを翻訳するChrome拡張機能です。

## ✨ 機能

- **🌍 ページ翻訳トグル**: ポップアップからワンクリックでページ全体の翻訳をON/OFF
- **📝 選択範囲翻訳**: 選択したテキストを即座に翻訳
- **🎯 スマート翻訳**: より良いユーザー体験のため、表示されているメインコンテンツを優先
- **🔄 原文/翻訳切り替え**: 原文と翻訳文をシームレスに切り替え
- **⚡ 並列処理**: より高速な翻訳のための最適化されたバッチ処理
- **🖱️ コンテキストメニュー**: 右クリックで選択テキストまたはページ全体を翻訳
- **⚙️ カスタマイズ可能**: Ollamaエンドポイント、モデル、対象言語を設定可能
- **🔒 プライバシー重視**: すべての処理はローカル - 外部サービスにデータを送信しません

## 🌐 対応ブラウザ

| ブラウザ | ステータス | バージョン | 備考 |
|---------|-----------|-----------|------|
| Chrome | ✅ 確認済み | 最新版 | 完全対応 |
| Orion | ✅ 確認済み | 最新版 | WebKitベースブラウザ |

## ✅ 動作確認済みLLMモデル

| モデル | ステータス | パフォーマンス | 備考 |
|-------|-----------|---------------|------|
| [translategemma](https://ollama.com/library/translategemma) | ✅ 確認済み | 優秀 | 推奨 - 翻訳専用モデル |

## 📋 前提条件

### 1. Ollamaのインストール

[Ollama公式サイト](https://ollama.ai/)からダウンロード・インストールしてください。

### 2. TranslateGemmaモデルのダウンロード

ターミナルで以下のコマンドを実行：

```bash
ollama pull translategemma:latest
```

または特定のサイズを指定：

```bash
ollama pull translategemma:4b   # 軽量・高速 (3.3GB)
ollama pull translategemma:12b  # バランス型 (8.1GB)
ollama pull translategemma:27b  # 高品質 (17GB)
```

### 3. Ollamaの起動（重要）

**Chrome拡張機能からOllamaにアクセスするには、CORS設定が必要です。**

以下のコマンドでOllamaを起動してください：

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

**⚠️ 警告**: `OLLAMA_ORIGINS`を指定しないと、ブラウザからのリクエストがCORSエラーで拒否されます。

**セキュリティ**: `chrome-extension://*`を指定することで、Chrome拡張機能からのアクセスのみを許可し、セキュリティを向上させます。

※ デフォルトでは`http://localhost:11434`での動作を想定していますが、設定でエンドポイントを変更できます。

## 🚀 インストール

### 方法1: Chrome ウェブストアから
*現在審査中です。しばらくは方法2をご利用ください。*

### 方法2: 開発者モードでのインストール

1. **リポジトリをクローン:**
   ```bash
   git clone https://github.com/shikira/ollama-translator.git
   cd ollama-translator
   ```

2. **拡張機能をビルド（TypeScript版）:**
   ```bash
   pnpm install
   pnpm run build
   ```

3. **Chromeに読み込み:**
   - `chrome://extensions/`を開く
   - 「デベロッパーモード」を有効にする
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `dist/`フォルダを選択

## 📖 使用方法

### ページ翻訳（推奨）

1. Ollamaを起動した状態で、翻訳したいWebページを開く
2. ツールバーの拡張機能アイコンをクリック
3. 「🌍 ページ翻訳」トグルスイッチをONにする
4. ページが自動的に翻訳されます（右上に進捗表示）

**便利な機能:**
- **原文/翻訳切り替え**: ページ右下に表示される「🌐 原文を表示」ボタンで切り替え
- **翻訳停止**: トグルスイッチをOFFにすると翻訳を停止し、原文に戻ります

### 選択範囲翻訳

1. 翻訳したいテキストを選択
2. 拡張機能ポップアップの「📝 選択範囲を翻訳」ボタンをクリック
3. または右クリックメニューから「選択範囲を翻訳」を選択

### 設定

拡張機能ポップアップの「⚙️ 設定」ボタンから以下を設定できます：

- **Ollamaエンドポイント**: デフォルト `http://localhost:11434`
- **モデル**: 使用するLLMモデル（デフォルト: `translategemma:latest`）
- **対象言語**: 翻訳先の言語（日本語、英語、中国語、韓国語）
- **自動翻訳**: ページ読み込み時の自動翻訳設定
- **除外ドメイン**: 翻訳を行わないドメインのリスト

## 🛠️ 開発

### 開発環境のセットアップ

```bash
# 依存関係のインストール
pnpm install

# 開発モード（ファイル監視）
pnpm run dev

# ビルド
pnpm run build

# クリーンアップ
pnpm run clean
```

### 技術スタック

- **言語**: TypeScript
- **パッケージマネージャ**: pnpm
- **ビルドツール**: TypeScript Compiler (tsc)
- **型定義**: @types/chrome

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルをご覧ください。

## 🙏 謝辞

- [Ollama](https://ollama.ai/) - ローカルLLM実行環境
- [TranslateGemma](https://ollama.com/library/translategemma) - 翻訳専用LLMモデル
- Chrome Extensions API - 拡張機能開発プラットフォーム
