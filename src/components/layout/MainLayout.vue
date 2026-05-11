<script setup>
import { computed } from 'vue'
import BottomNav from './BottomNav.vue'
import { useRoute } from 'vue-router'

const route = useRoute()

/** 하단 탭이 가리는 화면(랜딩, 전체 높이 결과 등) */
const hideNavRoutes = ['/', '/result']

const effectivePath = computed(() => {
  if (route.path !== '/ai') return route.path
  const returnTo =
    typeof route.query?.returnTo === 'string' ? route.query.returnTo.trim() : ''
  if (!returnTo || returnTo === '/ai') return '/discover'
  const pathOnly = returnTo.split('?')[0] || '/discover'
  return pathOnly
})
</script>

<template>
  <div class="main-layout">
    <main class="main-layout__content">
      <slot />
    </main>
    <BottomNav v-if="!hideNavRoutes.includes(effectivePath)" />
  </div>
</template>

<style scoped>
.main-layout {
  max-width: 430px;
  margin: 0 auto;
  min-height: 100dvh;
  position: relative;
  background: #fafaf8;
  overflow-x: hidden;
}

.main-layout__content {
  width: 100%;
}
</style>
