import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchSavedEvents, toggleSavedEvent } from '@/services/savedEventsService'

/** DB `user_saved_events` — 행사 상세 하트·저장함 행사 탭 동기화 */
export const useServerSavedEventsStore = defineStore('serverSavedEvents', () => {
  const items = ref([])
  const loading = ref(false)

  const idSet = computed(() => new Set(items.value.map((x) => Number(x.contentId))))

  function isSaved(contentId) {
    const n = Number(contentId)
    return Number.isFinite(n) && idSet.value.has(n)
  }

  async function refresh(accessToken) {
    if (!accessToken) {
      items.value = []
      return
    }
    loading.value = true
    try {
      items.value = await fetchSavedEvents(accessToken)
    } catch (e) {
      items.value = []
      throw e
    } finally {
      loading.value = false
    }
  }

  async function toggle(contentId, accessToken) {
    const { saved } = await toggleSavedEvent(contentId, accessToken)
    await refresh(accessToken)
    return saved
  }

  return {
    items,
    loading,
    idSet,
    isSaved,
    refresh,
    toggle,
  }
})
