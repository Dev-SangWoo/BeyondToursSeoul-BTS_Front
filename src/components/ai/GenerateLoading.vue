<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const progress = ref(0)
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    if (progress.value < 95) {
      progress.value += Math.random() * 8
    }
  }, 400)
})

function complete() {
  clearInterval(timer)
  progress.value = 100
}

defineExpose({ complete })
</script>

<template>
  <div class="gen-loading">
    <div class="gen-loading__bot">🤖</div>
    <p class="gen-loading__text" v-html="$t('ai.loading.text').replace(/\n/g, '<br />')"></p>
    <div class="gen-loading__bar-wrap">
      <div class="gen-loading__bar" :style="{ width: `${Math.min(progress, 100).toFixed(0)}%` }"></div>
    </div>
    <p class="gen-loading__percent">{{ Math.min(Math.round(progress), 100) }}%</p>
  </div>
</template>

<style scoped>
.gen-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
}

.gen-loading__bot {
  font-size: 48px;
  animation: bounce 1s infinite alternate;
}

@keyframes bounce {
  from { transform: translateY(0); }
  to   { transform: translateY(-8px); }
}

.gen-loading__text {
  font-size: 14px;
  color: #555;
  text-align: center;
  line-height: 1.6;
  margin: 0;
}

.gen-loading__bar-wrap {
  width: 100%;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.gen-loading__bar {
  height: 100%;
  background: #FE9C00;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.gen-loading__percent {
  font-size: 13px;
  font-weight: 700;
  color: #FE9C00;
  margin: 0;
}
</style>
