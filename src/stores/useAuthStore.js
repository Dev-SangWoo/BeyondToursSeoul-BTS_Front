import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchMe, loginWithEmail, signupWithEmail, updateMyNickname, updateMyProfile } from '@/services/authService'

const STORAGE_KEY = 'bts:auth:v1'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref('')
  const refreshToken = ref('')
  const tokenType = ref('Bearer')
  const expiresIn = ref(0)
  const user = ref(null)
  const isLoading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => Boolean(accessToken.value))

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: accessToken.value,
        refreshToken: refreshToken.value,
        tokenType: tokenType.value,
        expiresIn: expiresIn.value,
        user: user.value,
      }),
    )
  }

  function hydrate() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      accessToken.value = parsed.accessToken || ''
      refreshToken.value = parsed.refreshToken || ''
      tokenType.value = parsed.tokenType || 'Bearer'
      expiresIn.value = Number(parsed.expiresIn || 0)
      user.value = parsed.user || null
    } catch {
      clearSession()
    }
  }

  function setSession(payload) {
    accessToken.value = payload.accessToken || ''
    refreshToken.value = payload.refreshToken || ''
    tokenType.value = payload.tokenType || 'Bearer'
    expiresIn.value = Number(payload.expiresIn || 0)

    const nextUserId = payload.userId || user.value?.userId || ''
    const nextEmail = payload.email || user.value?.email || ''
    user.value = nextUserId || nextEmail
      ? {
          ...(user.value || {}),
          userId: nextUserId,
          email: nextEmail,
        }
      : user.value

    persist()
  }

  function clearSession() {
    accessToken.value = ''
    refreshToken.value = ''
    tokenType.value = 'Bearer'
    expiresIn.value = 0
    user.value = null
    error.value = ''
    localStorage.removeItem(STORAGE_KEY)
  }

  async function login(email, password) {
    isLoading.value = true
    error.value = ''
    try {
      const data = await loginWithEmail({ email, password })
      setSession(data)
      return data
    } catch (e) {
      error.value = e.message || '로그인 실패'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function signup(email, password) {
    isLoading.value = true
    error.value = ''
    try {
      const data = await signupWithEmail({ email, password })
      // 백엔드가 가입 직후 토큰을 반환하면 바로 세션 저장
      if (data?.accessToken) setSession(data)
      return data
    } catch (e) {
      error.value = e.message || '회원가입 실패'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function loadMe() {
    if (!accessToken.value) return null
    const me = await fetchMe(accessToken.value)
    user.value = me
    persist()
    return me
  }

  async function saveNickname(nickname) {
    if (!accessToken.value) throw new Error('로그인이 필요합니다.')
    const me = await updateMyNickname(accessToken.value, nickname)
    user.value = me
    persist()
    return me
  }

  async function saveProfile({ nickname, localPreference, preferredLanguage }) {
    if (!accessToken.value) throw new Error('로그인이 필요합니다.')
    const me = await updateMyProfile(accessToken.value, { nickname, localPreference, preferredLanguage })
    user.value = me
    persist()
    return me
  }

  return {
    accessToken,
    refreshToken,
    tokenType,
    expiresIn,
    user,
    isLoading,
    error,
    isAuthenticated,
    hydrate,
    setSession,
    clearSession,
    login,
    signup,
    loadMe,
    saveNickname,
    saveProfile,
  }
})

