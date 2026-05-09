import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'bts:saved:v1'

/** 예전 로컬 홈 코스 찜 항목 제거 (DB로 이전) */
function purgeLegacyHomeCourseItems(items) {
  return (items || []).filter((item) => {
    if (item.type === 'home_course') return false
    if (item.type === 'course' && typeof item.refId === 'string' && item.refId.startsWith('course:')) {
      return false
    }
    return true
  })
}

export const useSavedStore = defineStore('saved', () => {
  const savedItems = ref([])
  const placesById = ref({})
  const eventsById = ref({})

  const savedPlaces = computed(() =>
    savedItems.value
      .filter((item) => item.type === 'place')
      .map((item) => placesById.value[item.refId])
      .filter(Boolean),
  )

  const savedEvents = computed(() =>
    savedItems.value
      .filter((item) => item.type === 'event')
      .map((item) => eventsById.value[item.refId])
      .filter(Boolean),
  )

  function hydrate() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      savedItems.value = purgeLegacyHomeCourseItems(parsed.savedItems || [])
      placesById.value = parsed.placesById || {}
      eventsById.value = parsed.eventsById || {}
    } catch {
      savedItems.value = []
      placesById.value = {}
      eventsById.value = {}
    }
  }

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        savedItems: savedItems.value,
        placesById: placesById.value,
        eventsById: eventsById.value,
      }),
    )
  }

  watch([savedItems, placesById, eventsById], persist, { deep: true })

  function isSaved(type, refId) {
    return savedItems.value.some((item) => item.type === type && item.refId === refId)
  }

  function removeSaved(type, refId) {
    savedItems.value = savedItems.value.filter(
      (item) => !(item.type === type && item.refId === refId),
    )
  }

  function addSaved(type, refId, source = 'manual') {
    if (isSaved(type, refId)) return
    savedItems.value.unshift({
      id: `${type}:${refId}`,
      type,
      refId,
      source,
      savedAt: new Date().toISOString(),
    })
  }

  hydrate()

  return {
    savedItems,
    placesById,
    eventsById,
    savedPlaces,
    savedEvents,
    isSaved,
    removeSaved,
    addSaved,
  }
})
