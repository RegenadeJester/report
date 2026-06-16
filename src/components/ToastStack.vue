<script setup>
import { useRouter } from 'vue-router'
import { useAlerts } from '../stores/useAlerts'

const router = useRouter()
const { toasts, dismissToast } = useAlerts()

function openToast(toast) {
  if (toast.newsLink) {
    window.open(toast.newsLink, '_blank', 'noopener,noreferrer')
    return
  }
  if (toast.slug) router.push(`/asset/${toast.slug}`)
}

function openAsset(toast) {
  if (toast.slug) router.push(`/asset/${toast.slug}`)
}
</script>

<template>
  <div class="toast-stack">
    <div v-for="toast in toasts" :key="toast.id" class="toast brutal-toast">
      <button class="toast-body" @click="openToast(toast)" :aria-label="`Buka alert ${toast.title}`">
        <div>
          <small class="toast-kicker">ALERT</small>
          <strong>{{ toast.title }}</strong>
          <p>{{ toast.message }}</p>
        </div>
      </button>
      <div class="toast-actions">
        <a v-if="toast.newsLink" :href="toast.newsLink" target="_blank" rel="noreferrer" class="toast-link">Lihat berita</a>
        <button v-if="toast.slug" class="toast-link toast-asset-btn" @click.stop="openAsset(toast)">Buka asset</button>
        <button class="toast-close" @click.stop="dismissToast(toast.id)" aria-label="Tutup alert">×</button>
      </div>
    </div>
  </div>
</template>
