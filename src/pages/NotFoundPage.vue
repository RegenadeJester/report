<template>
  <main class="not-found">
    <!-- Floating bubbles background -->
    <div class="bubbles" aria-hidden="true">
      <span v-for="n in 12" :key="n" class="bubble" :style="{ '--i': n }"></span>
    </div>

    <div class="hero" :class="{ 'party-mode': partyMode }">
      <!-- Animated Orca -->
      <div class="orca-scene" aria-hidden="true">
        <div class="orca" :class="{ splash: partyMode }">🐋</div>
        <div class="wave wave-1">〰️</div>
        <div class="wave wave-2">〰️</div>
        <!-- Fish that orca chases on party mode -->
        <template v-if="partyMode">
          <div class="fish fish-1">🐟</div>
          <div class="fish fish-2">🐟</div>
          <div class="fish fish-3">🐠</div>
          <div class="sparkle s1">✨</div>
          <div class="sparkle s2">⭐</div>
          <div class="sparkle s3">✨</div>
        </template>
      </div>

      <p class="kicker">Market Orca</p>
      <h1 class="error-code">
        <span class="digit d-4" :class="{ pop: partyMode }">4</span>
        <span class="digit d-0" :class="{ pop: partyMode }">0</span>
        <span class="digit d-4" :class="{ pop: partyMode }">4</span>
      </h1>
      <p class="msg">{{ partyMode ? partyMsg : 'Page not found. This asset has been delisted from the Market Orca exchange.' }}</p>

      <div class="actions">
        <router-link to="/" class="home-link">🐋 Back to Dashboard</router-link>
        <button class="ghost-link" @click="$router.go(-1)">← Go Back</button>
      </div>

      <!-- Easter egg hint -->
      <p class="hint" v-if="!partyMode">
        <span class="hint-text">↑↑↓↓←→←→BA</span>
        <span class="hint-label">— some say this sequence opens a hidden menu…</span>
      </p>

      <!-- Party mode achievements -->
      <div v-if="partyMode" class="achievement">
        🏆 <strong>Easter Egg Found!</strong> You unlocked the Secret Orca Party.
        <br><small style="opacity:.6">Only {{ foundCount }} {{ foundCount === 1 ? 'human' : 'humans' }} have discovered this. You are {{ foundCount === 1 ? 'the first' : 'one of ' + foundCount + ' legends' }}.</small>
      </div>
    </div>

    <!-- Dev console easter egg -->
    <!-- 
    ╔══════════════════════════════════════════════════════════╗
    ║  🐋 MARKET ORCA — SECRET LOG                           ║
    ║  If you're reading this in devtools, you're a legend.  ║
    ║  This page exists because you went somewhere that       ║
    ║  doesn't exist. But hey, you found THIS.               ║
    ║                                                         ║
    ║  Fun facts about this codebase:                         ║
    ║  - Built with Vue 3, Vite, and pure determination      ║
    ║  - The orca emoji 🐋 appears 47 times in this project  ║
    ║  - This 404 page has more animations than the homepage ║
    ║                                                         ║
    ║  To the developer who wrote this: you're doing great.   ║
    ╚══════════════════════════════════════════════════════════╝
    -->
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const partyMode = ref(false)
const partyMsg = ref('')
const foundCount = ref(0)

// Konami code sequence
const KONAMI = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight',
  'b', 'a'
]
let konamiIndex = 0

const partyMessages = [
  '🐋 THE ORCA HAS RISEN. You are now a certified deep-sea explorer.',
  '🐋 Party mode activated! The orca thanks you for your excellent taste.',
  '🐋 You found the secret! The market never sleeps, and neither does this orca.',
  '🐋 Konami code: activated. Orca party: in full swing. You: legendary.',
  '🐋 Plot twist: the real 404 was the friends we made along the way.',
]

let foundKey = 'market-orca:konami-found'

function onKeydown(e) {
  const key = e.key
  const expected = KONAMI[konamiIndex]

  if (key === expected) {
    konamiIndex++
    if (konamiIndex === KONAMI.length) {
      activateParty()
      konamiIndex = 0
    }
  } else {
    konamiIndex = key === KONAMI[0] ? 1 : 0
  }
}

function activateParty() {
  partyMode.value = true
  partyMsg.value = partyMessages[Math.floor(Math.random() * partyMessages.length)]

  // Track unique finders (client-side, obviously)
  try {
    const prev = parseInt(localStorage.getItem(foundKey) || '0', 10)
    foundCount.value = prev + 1
    localStorage.setItem(foundKey, String(foundCount.value))
  } catch {
    foundCount.value = 1
  }

  // Console Easter egg
  console.log('%c🐋 MARKET ORCA — SECRET MODE ACTIVATED', 'font-size:20px;color:#60a5fa;font-weight:bold')
  console.log('%cYou found the Konami code easter egg! You are now an honorary Orca.', 'color:#f59e0b;font-size:14px')
  console.log('%c"404: Page not found. But your sense of adventure? Always found." 🐋', 'color:#4ade80;font-style:italic')
  console.log('')
  console.log('%c🐟 Here\'s a fish for your troubles: 🐟🐟🐟', 'font-size:16px')
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  // Silent console greeting for devtools explorers
  console.log(
    '%c🐋 Market Orca says: this page doesn\'t exist. But you do! Try the Konami code ↑↑↓↓←→←→BA',
    'color:#9fb0cf;font-style:italic'
  )
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.not-found {
  position: relative;
  max-width: 720px;
  margin: auto;
  padding: 48px 14px;
  text-align: center;
  overflow: hidden;
}

/* ── Bubbles ─────────────────────────────────── */
.bubbles {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.bubble {
  position: absolute;
  bottom: -40px;
  width: 14px;
  height: 14px;
  background: radial-gradient(circle at 30% 30%, rgba(96,165,250,.35), rgba(96,165,250,.08));
  border: 1px solid rgba(96,165,250,.15);
  border-radius: 50%;
  animation: bubble-rise 8s var(--i) linear infinite;
}
@keyframes bubble-rise {
  0%   { transform: translateY(0) scale(1); opacity: .7; }
  80%  { opacity: .5; }
  100% { transform: translateY(-110vh) scale(.4); opacity: 0; }
}

/* ── Hero card ───────────────────────────────── */
.hero {
  position: relative;
  z-index: 1;
  border: 3px solid var(--line-strong);
  background: var(--bg2);
  padding: 48px 32px 40px;
  box-shadow: 8px 8px 0 var(--line-strong);
  transition: border-color 0.3s, box-shadow 0.3s;
}
.hero.party-mode {
  border-color: var(--accent2);
  box-shadow: 8px 8px 0 var(--accent2), 0 0 60px rgba(245,158,11,.15);
}

/* ── Kicker ──────────────────────────────────── */
.kicker {
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: .16em;
  color: var(--accent2);
  margin: 0 0 8px;
}

/* ── Orca scene ──────────────────────────────── */
.orca-scene {
  position: relative;
  height: 100px;
  margin-bottom: 16px;
}
.orca {
  font-size: 64px;
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  animation: orca-bob 3s ease-in-out infinite;
}
.orca.splash {
  animation: orca-splash 0.6s ease-out;
}
@keyframes orca-bob {
  0%, 100% { transform: translateX(-50%) translateY(0) rotate(0deg); }
  25%      { transform: translateX(-45%) translateY(-8px) rotate(-3deg); }
  75%      { transform: translateX(-55%) translateY(-4px) rotate(2deg); }
}
@keyframes orca-splash {
  0%   { transform: translateX(-50%) scale(1); }
  40%  { transform: translateX(-50%) scale(1.3) translateY(-20px); }
  100% { transform: translateX(-50%) scale(1) translateY(0); }
}
.wave {
  position: absolute;
  bottom: 10px;
  font-size: 28px;
  color: var(--accent);
  opacity: 0.3;
}
.wave-1 { left: 15%; animation: wave-drift 4s ease-in-out infinite; }
.wave-2 { right: 15%; animation: wave-drift 4s 2s ease-in-out infinite; }
@keyframes wave-drift {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-5px); }
}

/* ── Fish (party mode) ───────────────────────── */
.fish {
  position: absolute;
  font-size: 28px;
  animation: fish-swim 2.5s ease-in-out infinite;
}
.fish-1 { top: 10px; left: 5%; animation-delay: 0s; }
.fish-2 { top: 40px; right: 8%; animation-delay: 0.8s; }
.fish-3 { top: 60px; left: 25%; animation-delay: 1.6s; }
@keyframes fish-swim {
  0%   { transform: translateX(0) scaleX(1); }
  45%  { transform: translateX(60px) scaleX(1); }
  50%  { transform: translateX(60px) scaleX(-1); }
  95%  { transform: translateX(0) scaleX(-1); }
  100% { transform: translateX(0) scaleX(1); }
}

/* ── Sparkles (party mode) ───────────────────── */
.sparkle {
  position: absolute;
  font-size: 22px;
  animation: sparkle-pulse 1.2s ease-in-out infinite alternate;
}
.s1 { top: 5px; left: 30%; }
.s2 { top: 20px; right: 20%; animation-delay: 0.4s; }
.s3 { top: 50px; left: 10%; animation-delay: 0.8s; }
@keyframes sparkle-pulse {
  0%   { transform: scale(0.6) rotate(0deg); opacity: 0.3; }
  100% { transform: scale(1.2) rotate(15deg); opacity: 1; }
}

/* ── 404 digits ──────────────────────────────── */
.error-code {
  font-size: clamp(80px, 20vw, 160px);
  line-height: .8;
  letter-spacing: -.06em;
  margin: 0 0 12px;
  font-weight: 900;
}
.digit {
  display: inline-block;
  color: var(--accent);
  transition: color 0.3s, transform 0.3s;
}
.digit.d-4 { color: var(--accent); }
.digit.d-0 { color: var(--accent2); }
.digit.pop {
  animation: digit-pop 0.5s ease-out;
}
@keyframes digit-pop {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.25) rotate(-5deg); }
  60%  { transform: scale(0.9) rotate(3deg); }
  100% { transform: scale(1) rotate(0); }
}

/* ── Message ─────────────────────────────────── */
.msg {
  font-weight: 800;
  max-width: 500px;
  margin: 0 auto 28px;
  color: var(--muted);
  line-height: 1.5;
  animation: fade-in 0.6s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Actions ─────────────────────────────────── */
.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.home-link {
  display: inline-block;
  padding: 14px 28px;
  border: 2px solid var(--line-strong);
  background: var(--ink);
  color: var(--bg2);
  font-weight: 900;
  font-size: 15px;
  text-decoration: none;
  transition: .15s;
  box-shadow: 4px 4px 0 var(--line-strong);
}
.home-link:hover {
  background: var(--accent);
  color: #fff;
  box-shadow: 2px 2px 0 var(--line-strong);
  transform: translate(2px, 2px);
}
.ghost-link {
  padding: 14px 28px;
  border: 2px solid var(--line-strong);
  background: transparent;
  color: var(--ink);
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  transition: .15s;
}
.ghost-link:hover {
  border-color: var(--muted);
  color: var(--accent);
}

/* ── Hint ────────────────────────────────────── */
.hint {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  opacity: 0.45;
  animation: hint-pulse 4s ease-in-out infinite;
}
.hint-text {
  font-family: 'Courier New', monospace;
  letter-spacing: .05em;
  color: var(--accent2);
  opacity: 0.7;
}
.hint-label {
  margin-left: 4px;
}
@keyframes hint-pulse {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 0.65; }
}

/* ── Achievement banner ──────────────────────── */
.achievement {
  margin-top: 24px;
  padding: 16px 20px;
  border: 2px solid var(--accent2);
  background: rgba(245, 158, 11, 0.08);
  color: var(--ink);
  font-size: 15px;
  text-align: center;
  animation: achievement-in 0.6s cubic-bezier(.22,1,.36,1);
  box-shadow: 0 0 30px rgba(245, 158, 11, 0.1);
}
@keyframes achievement-in {
  0%   { opacity: 0; transform: scale(0.8) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

/* ── Responsive ──────────────────────────────── */
@media (max-width: 600px) {
  .hero { padding: 32px 18px 28px; }
  .orca-scene { height: 80px; }
  .orca { font-size: 48px; }
  .actions { flex-direction: column; align-items: center; }
  .home-link, .ghost-link { width: 100%; max-width: 280px; text-align: center; }
}
</style>
