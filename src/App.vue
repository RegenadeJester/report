<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { API_BASE } from './lib/api'
import ToastStack from './components/ToastStack.vue'
import AlertCenter from './components/AlertCenter.vue'
import LanguageToggle from './components/LanguageToggle.vue'
import { usePollingAlerts } from './composables/usePollingAlerts'
import { usePreferences } from './stores/usePreferences'
import { enableAlertAudio, enableBrowserNotifications, useAlerts, setSoundEnabled } from './stores/useAlerts'
import { useRuntimeSettings, setDataSaver } from './stores/useRuntimeSettings'
import { locale, setLocale, t } from './i18n'

usePollingAlerts()
const { soundEnabled } = usePreferences()
const { audioReady, notificationReady } = useAlerts()
const menuOpen = ref(false)
const theme = ref(localStorage.getItem('market-orca:theme') || 'dark')
const reducedMotion = ref(localStorage.getItem('market-orca:reduced-motion') === '1')
const density = ref(localStorage.getItem('market-orca:density') || 'normal')
const fontScale = ref(localStorage.getItem('market-orca:font-scale') || '100')
const latestReport = ref('')
const latestReportMeta = ref(null)
const recentReports = ref([])
const { dataSaver } = useRuntimeSettings()

function applyTheme(value) {
  theme.value = value
  document.documentElement.setAttribute('data-theme', value)
  localStorage.setItem('market-orca:theme', value)
}

function applyReducedMotion(value) {
  reducedMotion.value = !!value
  document.documentElement.setAttribute('data-motion', value ? 'reduced' : 'full')
  localStorage.setItem('market-orca:reduced-motion', value ? '1' : '0')
}

function applyDensity(value) {
  density.value = value
  document.documentElement.setAttribute('data-density', value)
  localStorage.setItem('market-orca:density', value)
}

function applyFontScale(value) {
  fontScale.value = value
  document.documentElement.style.setProperty('--font-scale', `${Number(value) / 100}`)
  localStorage.setItem('market-orca:font-scale', String(value))
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

function onToggleSound(e) {
  const value = e.target.checked
  soundEnabled.value = value
  setSoundEnabled(value)
}

function onToggleDataSaver(e) {
  setDataSaver(e.target.checked)
}

function onToggleReducedMotion(e) {
  applyReducedMotion(e.target.checked)
}

function onDensityChange(e) {
  applyDensity(e.target.value)
}

function onFontScaleChange(e) {
  applyFontScale(e.target.value)
}

onMounted(() => {
  applyTheme(theme.value)
  applyReducedMotion(reducedMotion.value)
  applyDensity(density.value)
  applyFontScale(fontScale.value)
  fetch(`${API_BASE}/api/reports?metadata=true`).then(r=>r.json()).then(d=>{
    if (Array.isArray(d)) {
      latestReport.value = d[0]?.slug || ''
      latestReportMeta.value = d[0] || null
      recentReports.value = d.slice(0, 7)
    }
  }).catch(()=>{})
})
watch(theme, applyTheme)
</script>

<template>
  <div class="app-shell brutal-shell">
    <a class="skip-link" href="#main-content">{{ t('skip.main') }}</a>
    <header class="topbar brutal-topbar">
      <div>
        <div class="eyebrow">{{ t('app.eyebrow') }}</div>
        <h1>🐋 {{ t('app.title') }}</h1>
        <p>{{ t('app.subtitle') }}</p>
      </div>
      <button class="hamburger" @click="menuOpen = !menuOpen" :aria-expanded="menuOpen" :aria-label="t('skip.label')">
        <span class="hamburger-icon" :class="{ open: menuOpen }">
          <span></span><span></span><span></span>
        </span>
      </button>
      <nav class="topnav brutal-nav" :class="{ 'is-open': menuOpen }">
        <RouterLink to="/" @click="menuOpen=false">{{ t('nav.beranda') }}</RouterLink>
        <RouterLink to="/impact-simulator" @click="menuOpen=false">{{ t('nav.simulasi') }}</RouterLink>
        <RouterLink to="/watchlist-insights" @click="menuOpen=false">{{ t('nav.insight') }}</RouterLink>
        <RouterLink to="/delivery" @click="menuOpen=false">{{ t('nav.pengiriman') }}</RouterLink>
        <RouterLink to="/report-preferences" @click="menuOpen=false">{{ t('nav.preferensi') }}</RouterLink>
        <RouterLink to="/rag-report" @click="menuOpen=false">{{ t('nav.rag') }}</RouterLink>
        <RouterLink to="/tradingview" @click="menuOpen=false">TradingView</RouterLink>
        <RouterLink to="/indonesia" @click="menuOpen=false">🇮🇩 Indonesia</RouterLink>
        <RouterLink to="/profile" @click="menuOpen=false">{{ t('nav.profile') }}</RouterLink>
        <a :href="latestReport ? `/report/${latestReport}` : '/report'" @click="menuOpen=false">{{ t('nav.laporan') }}</a>
        <RouterLink to="/terminal" @click="menuOpen=false">{{ t('nav.terminal') }}</RouterLink>
        <LanguageToggle />
      </nav>
    </header>
    <div class="toolbar-row brutal-toolbar">
      <label class="sound-toggle"><input :aria-label="t('toolbar.sound')" :checked="soundEnabled" type="checkbox" @change="onToggleSound" /> {{ t('toolbar.sound') }}</label>
      <button class="refresh-btn" @click="enableAlertAudio" :aria-pressed="audioReady">{{ audioReady ? t('toolbar.audio_ready') : t('toolbar.audio') }}</button>
      <button class="refresh-btn" @click="enableBrowserNotifications">{{ notificationReady ? t('toolbar.notif_ready') : t('toolbar.notif') }}</button>
      <label class="sound-toggle"><input :aria-label="t('toolbar.datasaver')" :checked="dataSaver" type="checkbox" @change="onToggleDataSaver" /> {{ t('toolbar.datasaver') }}</label>
      <label class="sound-toggle"><input :aria-label="t('toolbar.reducedmotion')" :checked="reducedMotion" type="checkbox" @change="onToggleReducedMotion" /> {{ t('toolbar.reducedmotion') }}</label>
      <label class="sound-toggle">{{ t('toolbar.density') }}
        <select :value="density" @change="onDensityChange" :aria-label="t('toolbar.density')">
          <option value="compact">Compact</option>
          <option value="normal">Normal</option>
          <option value="comfortable">Comfortable</option>
        </select>
      </label>
      <label class="sound-toggle">{{ t('toolbar.font') }}
        <select :value="fontScale" @change="onFontScaleChange" :aria-label="t('toolbar.font')">
          <option value="90">90%</option>
          <option value="100">100%</option>
          <option value="110">110%</option>
          <option value="120">120%</option>
        </select>
      </label>
      <button class="refresh-btn" @click="toggleTheme" :aria-label="`Ganti ke mode ${theme === 'dark' ? 'light' : 'dark'}`">{{ theme === 'dark' ? t('toolbar.theme_light') : t('toolbar.theme_dark') }}</button>
    </div>
    <ToastStack />
    <main id="main-content" tabindex="-1">
      <RouterView />
    </main>

    <!-- ═══ Disclaimer Footer ═══════════════════════════════ -->
    <footer class="disclaimer-footer" role="contentinfo">
      <p class="disclaimer-line">{{ t('disclaimer.free') }}</p>
      <p class="disclaimer-line disclaimer-warning">{{ t('disclaimer.education') }}</p>
      <p class="disclaimer-line disclaimer-warning">{{ t('disclaimer.scraping') }}</p>
    </footer>

    <AlertCenter />
  </div>
</template>

<style scoped>
.hamburger{display:none;background:0;border:0;padding:8px;cursor:pointer;z-index:100}
.hamburger-icon{display:flex;flex-direction:column;gap:5px;width:28px}
.hamburger-icon span{display:block;height:3px;width:100%;background:var(--ink);border-radius:2px;transition:.25s}
.hamburger-icon.open span:nth-child(1){transform:translateY(8px) rotate(45deg)}
.hamburger-icon.open span:nth-child(2){opacity:0}
.hamburger-icon.open span:nth-child(3){transform:translateY(-8px) rotate(-45deg)}
@media(max-width:768px){
  .hamburger{display:block}
  .topbar{flex-wrap:wrap}
  .topnav{display:none;width:100%;flex-direction:column;gap:0;margin-top:8px}
  .topnav.is-open{display:flex}
  .brutal-nav a{width:100%;text-align:center;box-shadow:none;border-radius:8px;margin-bottom:4px}
}

.disclaimer-footer {
  border-top: 2px solid var(--ink, #2d3748);
  padding: 16px 24px;
  margin-top: 32px;
  background: var(--card-bg, #0d1117);
  font-size: 0.82rem;
  color: var(--text-muted, #a0aec0);
  text-align: center;
  line-height: 1.6;
}
.disclaimer-line {
  margin: 4px 0;
}
.disclaimer-warning {
  opacity: 0.85;
  font-size: 0.78rem;
}
</style>
