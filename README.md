# Lumen Browser (Windows MVP)

Lumen is a Windows-first, frameless Chromium browser shell built with Electron + React + TypeScript, with cloud AI provider support (OpenAI, Anthropic, xAI).

## Implemented

- Frameless browser shell with custom draggable title bar and window controls
- Vertical sidebar with:
  - hover-to-peek and pinned open behavior
  - pinned tabs section
  - Spaces (collapsible tab groups with color dots)
  - drag/drop tab reorder and move across Spaces
- Floating URL bar with:
  - domain simplification when unfocused
  - standard URL/search routing
  - AI mode via `>` / `ask:` prefix with streaming inline response
  - on-demand page intelligence trigger
- Embedded Chromium browsing (`webview`) with new-tab interception for popup links
- Command palette (`Ctrl+K`) with:
  - command execution
  - local tab search
  - AI tab search mode via `tab:` prefix
- Task manager modal (`Ctrl+Shift+T`) with app process metrics + system memory pressure
- Tab suspension engine:
  - inactivity-based suspension (5 min)
  - aggressive suspension under high memory pressure (>70%)
  - suspension state persisted in local session
- AI provider subsystem:
  - OpenAI / Anthropic / xAI model selector
  - secure API key storage (`safeStorage`, DPAPI-backed on Windows)
  - streaming chat in side panel
  - request queue when AI is busy
  - retries with exponential backoff on 429/5xx
  - 30s request timeout + cancel path
  - monthly budget cap + 80% warning
  - usage dashboard (daily cost + per-feature breakdown)
- AI context features:
  - right-click selected text menu in pages: Ask AI, Summarize, Explain simply, Translate, Rewrite
  - selected-text actions routed into AI panel or quick toasts
- Page intelligence:
  - local extraction of current page content
  - reading time estimate
  - key topic tags
  - AI summary with local URL/content-hash cache

## Project Structure

- `src/main`: Electron main process, IPC, AI service, secure settings storage
- `src/renderer`: Browser UI, tab/space system, AI panel, command palette
- `native/`: CMake + Conan native-core stub for future C++ performance modules

## Install & Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run typecheck
npm run build
npm start
```

## Keyboard Shortcuts

- `Ctrl+T`: New tab
- `Ctrl+W`: Close tab
- `Ctrl+Tab` / `Ctrl+Shift+Tab`: Next/previous tab
- `Ctrl+L`: Focus URL bar
- `Ctrl+Shift+A`: Toggle AI panel
- `Ctrl+B`: Toggle sidebar pin
- `Ctrl+Shift+T`: Toggle task manager
- `Ctrl+K`: Command palette
- `Ctrl+Shift+S`: Toggle suspension engine
- `Ctrl+Shift+G`: AI auto-group tabs by topic
- `Ctrl+/`: Toggle light/dark theme

## Notes

- AI features stay inactive until an API key is configured.
- Lumen stores local session state in browser localStorage and AI/provider settings in Electron userData.
- This is Windows-targeted and tested with the Electron desktop runtime.
