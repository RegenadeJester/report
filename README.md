<div align="center">

# 📊 Market Orca Frontend

**Vue 3 SPA — Real-time Market Intelligence Dashboard**

[![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js&logoColor=white)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![PWA](https://img.shields.io/badge/PWA-Ready-blueviolet)](https://vite-pwa-org.netlify.app)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## ✨ Features

- 🌐 **Multi-market dashboard** — stocks, crypto, forex, commodities
- 🇮🇩 **IDX focus** — Indonesian market data + IDR exchange rates
- 🤖 **AI Report viewer** — render generated reports with rich formatting
- ✏️ **Report editor** — edit and rewrite AI-generated report blocks
- 📊 **Interactive charts** — line/bar/OHLCV with responsive sparklines
- 🔔 **Alert center** — real-time price alerts with audio + browser notifications
- 📱 **PWA-ready** — installable, offline-capable with service worker
- 🌙 **Dark/Light themes** — configurable themes with density + font scaling
- 🌍 **i18n** — multi-language support
- 🎯 **Watchlist insights** — personalized portfolio tracking
- 💻 **Terminal page** — CLI-like interface for power users

## 📁 Project Structure

```
frontend/
├── public/
│   ├── favicon.svg
│   ├── manifest.webmanifest
│   ├── sw.js               # Service worker (PWA)
│   └── robots.txt
├── src/
│   ├── App.vue             # Router + layout shell
│   ├── main.js             # Vue app bootstrap
│   ├── i18n.js             # Internationalization
│   ├── style.css           # Global styles + themes
│   ├── lib/
│   │   └── api.js          # API client (fetch + retry)
│   ├── pages/
│   │   ├── HomePage.vue              # News feed + overview
│   │   ├── AssetPage.vue             # Asset detail + chart
│   │   ├── ReportPage.vue            # Daily report viewer
│   │   ├── ReportEditorPage.vue      # Report block editor
│   │   ├── ReportPreferencesPage.vue # Report config
│   │   ├── TerminalPage.vue          # CLI-like interface
│   │   ├── ImpactSimulatorPage.vue   # Scenario simulator
│   │   ├── WatchlistInsightsPage.vue # Watchlist analytics
│   │   ├── DeliveryDashboardPage.vue # Alert delivery tracking
│   │   └── RagReportBuilderPage.vue  # RAG report builder
│   ├── components/
│   │   ├── AssetCharts.vue           # Chart.js wrapper
│   │   ├── MiniSparkline.vue         # Inline price sparkline
│   │   ├── AlertCenter.vue           # Alert management panel
│   │   └── ToastStack.vue            # Notification toasts
│   ├── composables/
│   │   └── usePollingAlerts.js       # Alert polling hook
│   └── stores/
│       ├── useAlerts.js              # Alert state management
│       ├── usePreferences.js         # User preferences
│       └── useRuntimeSettings.js     # Runtime config (theme, density)
├── index.html
├── vite.config.js
└── package.json
```

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- Market Orca backend running on port `4567`

### 1. Install

```bash
git clone https://github.com/RegenadeJester/report.git
cd report
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your backend API URL
```

### 3. Develop

```bash
npm run dev
# → http://localhost:5173
```

### 4. Build for Production

```bash
npm run build
# Output: dist/ (served by backend in production)
```

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE` | `auto-detect` | Backend API base URL |
| `VITE_API_PORT` | `4567` | Backend API port (used when `VITE_API_BASE` not set) |

See [`.env.example`](.env.example) for reference.

## 🎨 Theming

The app supports full theme customization via the sidebar:

| Setting | Options |
|---------|---------|
| Theme | Dark (default) / Light |
| Motion | Full / Reduced |
| Density | Comfortable / Normal / Compact |
| Font Scale | 75% – 150% |

## 📱 PWA

The app is PWA-ready with:
- Service worker (`sw.js`) for offline caching
- Web app manifest (`manifest.webmanifest`)
- Installable on desktop and mobile
- `llms.txt` / `llms-full.txt` for AI agent discovery

## 🔗 Backend API

This frontend connects to the [Market Orca backend](https://github.com/RegenadeJester/market-orca). Ensure the backend is running before starting the dev server.

```bash
# Start backend first
cd ../backend
npm run dev    # → :4567

# Then start frontend
npm run dev    # → :5173
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build | Vite 5 |
| Charts | Chart.js (via AssetCharts) |
| State | Composables + localStorage persistence |
| PWA | Service Worker + Web Manifest |
| Styling | Custom CSS (data-attribute themes) |

## 📄 License

MIT © [RegenadeJester](https://github.com/RegenadeJester)
