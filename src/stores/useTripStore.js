import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateCourse } from '@/services/tripService'
import { structuredToItineraryDays } from '@/utils/structuredToItinerary'

export const useTripStore = defineStore('trip', () => {
  const tripInput = ref({
    duration: '2박 3일',
    density: 50,
    interests: [],
    travelType: '커플',
  })

  const itinerary = ref([])
  const aiStructured = ref(null)
  const weatherMode = ref('normal') // 'normal' | 'rainy'
  const isLoading = ref(false)
  const error = ref(null)

  const hasItinerary = computed(() => itinerary.value.length > 0)

  const isRainyMode = computed(() => weatherMode.value === 'rainy')

  function setInput(input) {
    tripInput.value = { ...tripInput.value, ...input }
  }

  function setAiStructured(structured) {
    aiStructured.value = structured || null
    itinerary.value = structured ? structuredToItineraryDays(structured) : []
  }

  function setWeatherMode(mode) {
    weatherMode.value = mode
  }

  async function generate() {
    isLoading.value = true
    error.value = null
    try {
      const result = await generateCourse(tripInput.value)
      itinerary.value = result
      aiStructured.value = null
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  // alias kept for backward-compatibility with AIInputSheet
  const generateCourseAction = generate

  function reset() {
    itinerary.value = []
    aiStructured.value = null
    error.value = null
  }

  return {
    tripInput,
    itinerary,
    aiStructured,
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
