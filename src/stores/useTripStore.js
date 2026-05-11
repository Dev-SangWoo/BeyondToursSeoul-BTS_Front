import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateCourse } from '@/services/tripService'
import { structuredToItineraryDays } from '@/utils/structuredToItinerary'
import { i18n } from '@/i18n'

export const useTripStore = defineStore('trip', () => {
  const tripInput = ref({
    duration: '2박 3일',
    density: 50,
    interests: [],
    travelType: '커플',
  })

  /** AI structured 외 레거시 generateCourse() 결과 */
  const legacyItinerary = ref([])
  const aiStructured = ref(null)

  const itinerary = computed(() => {
    void i18n.global.locale.value
    if (aiStructured.value) {
      return structuredToItineraryDays(aiStructured.value)
    }
    return legacyItinerary.value
  })
  /** 서버 저장 일정 연동 시 { planId, title } 또는 null(AI 새 일정 등) */
  const savedPlanMeta = ref(null)
  const weatherMode = ref('normal') // 'normal' | 'rainy'
  const isLoading = ref(false)
  const error = ref(null)

  const hasItinerary = computed(() => itinerary.value.length > 0)

  const isRainyMode = computed(() => weatherMode.value === 'rainy')

  function setInput(input) {
    tripInput.value = { ...tripInput.value, ...input }
  }

  /**
   * @param {object|null} structured
   * @param {{ planId?: number, title?: string } | null} [fromSavedPlan] 저장함에서 불러온 경우
   */
  function setAiStructured(structured, fromSavedPlan = null) {
    aiStructured.value = structured || null
    if (!structured) {
      legacyItinerary.value = []
    }
    if (fromSavedPlan && fromSavedPlan.planId != null) {
      savedPlanMeta.value = {
        planId: fromSavedPlan.planId,
        title: fromSavedPlan.title != null ? String(fromSavedPlan.title).trim() : '',
      }
    } else {
      savedPlanMeta.value = null
    }
  }

  function setWeatherMode(mode) {
    weatherMode.value = mode
  }

  async function generate() {
    isLoading.value = true
    error.value = null
    try {
      const result = await generateCourse(tripInput.value)
      legacyItinerary.value = result
      aiStructured.value = null
      savedPlanMeta.value = null
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  // alias kept for backward-compatibility with AIInputSheet
  const generateCourseAction = generate

  function reset() {
    legacyItinerary.value = []
    aiStructured.value = null
    savedPlanMeta.value = null
    error.value = null
  }

  return {
    tripInput,
    itinerary,
    aiStructured,
    savedPlanMeta,
    weatherMode,
    isLoading,
    error,
    hasItinerary,
    isRainyMode,
    setInput,
    setAiStructured,
    setWeatherMode,
    generateCourse: generateCourseAction,
    reset,
  }
})
