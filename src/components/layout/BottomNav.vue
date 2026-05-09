<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Bookmark,
  CircleUserRound,
  Home,
  Map,
  Sparkles,
} from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const navItems = computed(() => [
  { path: '/discover', icon: Home, label: t('nav.home') },
  { path: '/map', icon: Map, label: t('nav.map') },
  { path: '/ai', icon: Sparkles, label: t('nav.aiCourse'), fab: true },
  { path: '/saved', icon: Bookmark, label: t('nav.saved') },
  { path: '/profile', icon: CircleUserRound, label: t('nav.my') },
])

function navigate(path) {
  router.push(path)
}
</script>

<template>
  <nav class="bottom-nav">
    <button
      v-for="item in navItems"
      :key="item.path"
      class="bottom-nav__item"
      :class="{ 'bottom-nav__item--active': route.path === item.path, 'bottom-nav__item--fab': item.fab }"
      @click="navigate(item.path)"
      :aria-label="item.label"
    >
      <span class="bottom-nav__icon">
        <component
          :is="item.icon"
          class="bottom-nav__icon-svg"
          :size="22"
          :stroke-width="2.2"
        />
      </span>
      <span class="bottom-nav__label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 8px 0 max(12px, env(safe-area-inset-bottom));
  z-index: 100;
}

.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 12px;
  color: #aaa;
  transition: color 0.2s;
  min-width: 0;
}

.bottom-nav__item--active {
  color: #FE9C00;
}

.bottom-nav__item--fab {
  color: #fff;
}

.bottom-nav__item--fab .bottom-nav__icon {
  background: #FE9C00;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  box-shadow: 0 4px 16px rgba(254, 156, 0, 0.4);
  margin-top: -20px;
}

.bottom-nav__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.bottom-nav__icon-svg {
  width: 22px;
  height: 22px;
}

.bottom-nav__label {
  font-size: 10px;
  font-weight: 500;
}
</style>
