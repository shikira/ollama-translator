# 🌐 Ollama Translator - Local LLM Translation Chrome Extension

A Chrome extension that translates web pages using locally-running Ollama LLM (translategemma:latest).

## ✨ Features

- **🌍 Page Translation Toggle**: Turn page-wide translation ON/OFF with one click from the popup
- **📝 Selection Translation**: Translate selected text
- **🎯 Priority Translation**: Translates in order: Visible main content → Hidden main content → Navigation
- **🔄 Original/Translation Toggle**: Switch between original and translated text with one click even during translation
- **⚡ Parallel Processing**: Execute up to 5 translation requests in parallel (server load optimized)
- **🖱️ Context Menu**: Execute translations from right-click menu
- **⚙️ Customizable**: Configure model and target language settings
- **🔒 Privacy Protection**: All processing is local (no external APIs used)

## 🌐 Supported Browsers

| Browser | Status | Version | Notes |
|---------|--------|---------|-------|
| Chrome | ✅ Confirmed | Latest | Full compatibility |
| Orion | ✅ Confirmed | Latest | WebKit-based browser |

## 📋 Prerequisites

### 1. Install Ollama

Download and install from [Ollama Official Site](https://ollama.ai/).

### 2. Download TranslateGemma Model

Run the following command in your terminal:

```bash
ollama pull translategemma:latest
```

Or specify a specific size:

```bash
ollama pull translategemma:4b   # Lightweight & fast (3.3GB)
ollama pull translategemma:12b  # Balanced (8.1GB)
ollama pull translategemma:27b  # High quality (17GB)
```

### 3. Start Ollama (Important)

**To access Ollama from the Chrome extension, CORS configuration is required.**

Start Ollama with the following command:

#### macOS / Linux:
```bash
OLLAMA_ORIGINS="chrome-extension://*" ollama serve
```

#### Windows (PowerShell):
```powershell
$env:OLLAMA_ORIGINS="chrome-extension://*"; ollama serve
```

#### Windows (Command Prompt):
```cmd
set OLLAMA_ORIGINS=chrome-extension://* && ollama serve
```

**⚠️ Warning**: Without specifying `OLLAMA_ORIGINS`, browser requests will be rejected with CORS errors.

**Security**: By specifying `chrome-extension://*`, you only allow access from Chrome extensions, improving security.

※ By default, it assumes operation on `http://localhost:11434`, but you can change the endpoint in the settings.

## 🚀 Installation

### Method 1: From Chrome Web Store (After Publication)
*Currently unpublished. Please use Method 2.*

### Method 2: Install in Developer Mode

1. Clone or download this repository:
   ```bash
   git clone https://github.com/yourusername/ollama-translator.git
   cd ollama-translator
   ```

2. Generate icon images:
   - Open `create-icons.html` in a browser
   - Click the "Generate Icons" button
   - Place the downloaded 3 PNG files (icon16.png, icon48.png, icon128.png) in the extension folder

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Turn ON "Developer mode" in the upper right
   - Click "Load unpacked"
   - Select this folder

## 📖 Usage

### Page Translation (Recommended)

1. With Ollama running, open the web page you want to translate
2. Click the extension icon in the toolbar
3. Turn ON the "🌍 Page Translation" toggle switch
4. The page will be automatically translated (progress shown in upper right)

**Useful features:**
- **Original/Translation Toggle**: Switch using the "🌐 Show Original" button displayed in the lower right of the page
- **Stop Translation**: Turn OFF the toggle switch to stop translation and return to original text
- **Priority Translation**: Visible main content is translated with priority

### Selection Translation

#### Translate from Popup

1. Select the text you want to translate
2. Click the extension icon in the toolbar
3. Click the "📝 Translate Selection" button
4. Translation results are displayed in the popup

#### Translate from Context Menu

1. Right-click on selected text
2. Select "Translate Selection"

Or

1. Right-click anywhere on the page
2. Select "Translate Entire Page"

## ⚙️ Settings

Open the settings page by clicking the ⚙️ icon from the extension popup, or right-click → "Options".

### Settings Options

- **Ollama Endpoint**: Ollama API endpoint URL (default: `http://localhost:11434`)
  - Non-default ports (e.g., `http://localhost:8080`) or remote servers (e.g., `http://192.168.1.100:11434`) can also be specified
- **Translation Model**: Ollama model to use (default: `translategemma:latest`)
- **Target Language**: Select from Japanese, English, Chinese, Korean
- **Excluded Domains**: Specify domains where translation should not run, comma-separated (e.g., `github.com, localhost`)

**Note**: The "Auto Translate" setting has been deprecated and replaced with a per-page toggle switch ON/OFF method.

## 🔧 Troubleshooting

### CORS Error / Translation Not Working

**Most common cause**: Starting Ollama without CORS configuration

**Solution**: Restart Ollama with the following command:

```bash
# macOS / Linux
OLLAMA_ORIGINS="chrome-extension://*" ollama serve

# Windows (PowerShell)
$env:OLLAMA_ORIGINS="chrome-extension://*"; ollama serve
```

Other checks:

1. **Verify Ollama is running**:
   ```bash
   curl http://localhost:11434/api/tags
   ```
   If operating normally, a list of available models will be returned.

2. **Verify TranslateGemma model is installed**:
   ```bash
   ollama list
   ```
   `translategemma:latest`, `translategemma:4b`, `translategemma:12b`, or `translategemma:27b` should be displayed.

3. **Check browser console**:
   - Press F12 to open developer tools
   - Check error messages in the Console tab
   - If CORS errors are displayed, CORS configuration is needed

### Translation is Slow

- For faster translation, consider using a smaller model (`translategemma:4b`)
- Entire page translation takes time depending on text volume
- Parallel processing is limited to a maximum of 5 requests

### Page Not Translating Correctly

- Code elements (`<code>`, `<pre>` tags, etc.) are automatically excluded from translation
- Some websites dynamically generate content, which may not be fully translatable
- Use the translation toggle button to switch between original and translation for verification

## 🛠️ Development

### File Structure

```
ollama-translator/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content.js             # Script injected into pages
├── popup.html             # Popup UI
├── popup.js              # Popup logic
├── options.html          # Settings page UI
├── options.js            # Settings page logic
├── create-icons.html     # Icon generation tool
└── README.md             # This file
```

### Technical Specifications

- **Priority Translation System**: Translates content in 3 priority levels
  1. Visible main content (highest priority)
  2. Hidden main content
  3. Navigation, sidebars, etc.
- **Parallel Processing**: Execute up to 5 translation requests simultaneously
- **Memory Efficiency**: Manage original and translated text using WeakMap
- **SPA Support**: Detect page transitions with MutationObserver

### Customization

To use a different LLM model, change the model name in the settings page. Available translation models in Ollama:

- `translategemma:4b` - Lightweight & fast, 3.3GB (recommended)
- `translategemma:12b` - Balanced, 8.1GB
- `translategemma:27b` - High quality, 17GB
- `translategemma:latest` - Latest version (default)

## 📝 License

MIT License

## 🤝 Contributing

Bug reports and feature requests are welcome via GitHub Issues.

## ⚠️ Notes

- **CORS configuration is required**: Ollama must be started with `OLLAMA_ORIGINS="chrome-extension://*"` specified
- This extension uses a local LLM, so no internet connection is required, but Ollama must be running
- Translating large amounts of text may take time
- Translation accuracy depends on model performance
- Translation state is managed per page (independent per tab)

## 🙏 Acknowledgments

This extension uses the following projects:

- [Ollama](https://ollama.ai/) - Local LLM runtime
- [TranslateGemma](https://ai.google.dev/gemma) - Google's translation model
