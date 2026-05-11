<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'

const route = useRoute()
const router = useRouter()

const isAiRoute = computed(() => route.name === 'ai')

const backgroundRoute = computed(() => {
  if (!isAiRoute.value) return null
  const returnTo = typeof route.query?.returnTo === 'string' ? route.query.returnTo.trim() : ''
  if (!returnTo || returnTo === '/ai') return null
  try {
    const resolved = router.resolve(returnTo)
    if (!resolved?.matched?.length || resolved.name === 'ai') return null
    return resolved
  } catch {
    return null
  }
})
</script>

<template>
  <MainLayout>
    <div class="app-route-stack" :class="{ 'app-route-stack--modal': isAiRoute }">
      <RouterView v-if="backgroundRoute" :route="backgroundRoute" />
      <RouterView />
    </div>
  </MainLayout>
</template>

<style>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --color-primary: #FE9C00;
  --color-bg: #fafaf8;
  --color-text: #1a1a1a;
  --color-muted: #888;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
  -webkit-font-smoothing: antialiased;
}

body {
  background: #f0f0ec;
}

button {
  font-family: inherit;
}

.app-route-stack {
  width: 100%;
}

.app-route-stack--modal {
  position: relative;
}

.app-route-stack--modal > *:last-child {
  position: absolute;
  inset: 0;
  z-index: 300;
}
</style>
