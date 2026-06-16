<template>
  <div class="skeleton" :style="{ height: h, width: w, borderRadius: r }"></div>
</template>
<script setup>
const props = defineProps({ h: { type: String, default: '20px' }, w: { type: String, default: '100%' }, r: { type: String, default: '4px' } })
</script>
<style scoped>
.skeleton {
  background: linear-gradient(90deg, var(--bg2) 25%, var(--line) 50%, var(--bg2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
