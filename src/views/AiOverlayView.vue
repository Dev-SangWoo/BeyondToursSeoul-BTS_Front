<script setup>
import { useRoute, useRouter } from 'vue-router'
import AIInputSheet from '@/components/ai/AIInputSheet.vue'
import { clearAiSheetSession } from '@/utils/aiSheetSession'

const route = useRoute()
const router = useRouter()

function closeAISheet() {
  clearAiSheetSession()
  const returnTo =
    typeof route.query?.returnTo === 'string' &&
    route.query.returnTo.trim() &&
    route.query.returnTo !== '/ai'
      ? route.query.returnTo
      : '/discover'
  router.replace(returnTo)
}

function onCourseGenerated() {
  router.push('/result')
}
</script>

<template>
  <div class="ai-overlay-view">
    <AIInputSheet @close="closeAISheet" @generated="onCourseGenerated" />
  </div>
</template>

<style scoped>
.ai-overlay-view {
  background: transparent;
}
</style>
