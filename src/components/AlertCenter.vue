<script setup>
import { computed } from 'vue'
import { useAlerts } from '../stores/useAlerts'

const { history } = useAlerts()
const recent = computed(() => history.value.slice(0, 12))
</script>

<template>
  <section class="panel">
    <h2>Alert history</h2>
    <div class="news-list">
      <article v-for="item in recent" :key="item.id" class="news-card">
        <small>{{ item.asset_slug || item.slug }}</small>
        <h3>{{ item.title }}</h3>
        <p>{{ item.message }}</p>
      </article>
    </div>
  </section>
</template>
