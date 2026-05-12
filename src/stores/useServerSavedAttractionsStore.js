import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { fetchSavedAttractions, toggleSavedAttraction } from '@/services/savedAttractionsService'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/useAuthStore'

/** DB `user_saved_attractions` — 상세 좋아요·저장함 관광지 탭과 동기화 */
export const useServerSavedAttractionsStore = defineStore('serverSavedAttractions', () => {
  const items = ref([])
  const loading = ref(false)

  const idSet = computed(() => new Set(items.value.map((x) => Number(x.id))))

  function isSaved(attractionId) {
    const n = Number(attractionId)
    return Number.isFinite(n) && idSet.value.has(n)
  }

  /**
   * @param {string|null|undefined} accessToken
   */
  async function refresh(accessToken) {
    if (!accessToken) {
      items.value = []
      return
    }
    loading.value = true
    try {
      items.value = await fetchSavedAttractions(accessToken)
    } catch (e) {
      items.value = []
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * @param {string|number} attractionId
   * @param {string} accessToken
   * @returns {Promise<boolean>} 저장 여부
   */
  async function toggle(attractionId, accessToken) {
    const { saved } = await toggleSavedAttraction(attractionId, accessToken)
    await refresh(accessToken)
    return saved
  }

  const authStore = useAuthStore()
  watch(
    () => i18n.global.locale.value,
    () => {
      if (authStore.accessToken) void refresh(authStore.accessToken)
    },
  )

  return {
    items,
    loading,
    idSet,
    isSaved,
    refresh,
    toggle,
  }
})
