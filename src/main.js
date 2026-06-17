import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

const HomePage = () => import('./pages/HomePage.vue')
const AssetPage = () => import('./pages/AssetPage.vue')
const TerminalPage = () => import('./pages/TerminalPage.vue')
const ReportPage = () => import('./pages/ReportPage.vue')
const ReportEditorPage = () => import('./pages/ReportEditorPage.vue')
const ImpactSimulatorPage = () => import('./pages/ImpactSimulatorPage.vue')
const WatchlistInsightsPage = () => import('./pages/WatchlistInsightsPage.vue')
const DeliveryDashboardPage = () => import('./pages/DeliveryDashboardPage.vue')
const ReportPreferencesPage = () => import('./pages/ReportPreferencesPage.vue')
const RagReportBuilderPage = () => import('./pages/RagReportBuilderPage.vue')
const PersonaPage = () => import('./pages/PersonaPage.vue')
const ReportCanvasPage = () => import('./pages/ReportCanvasPage.vue')
const TradingViewPage = () => import('./pages/TradingViewPage.vue')
const IndonesiaPage = () => import('./pages/IndonesiaPage.vue')
const NotFoundPage = () => import('./pages/NotFoundPage.vue')
const McpDocsPage = () => import('./pages/McpDocsPage.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/asset/:slug', component: AssetPage },
    { path: '/terminal', component: TerminalPage },
    { path: '/impact-simulator', component: ImpactSimulatorPage },
    { path: '/watchlist-insights', component: WatchlistInsightsPage },
    { path: '/delivery', component: DeliveryDashboardPage },
    { path: '/report-preferences', component: ReportPreferencesPage },
    { path: '/rag-report', component: RagReportBuilderPage },
    { path: '/profile', name: 'persona', component: PersonaPage },
    { path: '/canvas/:slug', component: ReportCanvasPage },
    { path: '/report-editor/:slug', component: ReportEditorPage },
    { path: '/report/:slug', component: ReportPage },
    { path: '/tradingview', component: TradingViewPage },
    { path: '/indonesia', component: IndonesiaPage },
    { path: '/docs/mcp', name: 'MCP Docs', component: McpDocsPage },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundPage }
  ]
})

const app = createApp(App)
app.config.errorHandler = (err, instance, info) => {
  console.error('[Market Orca Error]', err, info)
}
app.use(router).mount('#app')

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
