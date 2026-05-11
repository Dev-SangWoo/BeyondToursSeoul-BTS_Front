import { createAuthExpiredError } from "@/utils/authFlow"

const isBrowser = typeof window !== 'undefined'

function isLocalFrontendHost() {
  if (!isBrowser) return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function resolveApiBaseUrl() {
  const local = import.meta.env.VITE_API_BASE_URL_LOCAL || 'http://localhost:8080'
  const prod =
    import.meta.env.VITE_API_BASE_URL_PROD ||
    import.meta.env.VITE_API_BASE_URL ||
    'https://beyondtoursseoul-btsback-production.up.railway.app'
  return isLocalFrontendHost() ? local : prod
}

function resolveGoogleAuthUrl() {
  const local =
    import.meta.env.VITE_GOOGLE_AUTH_URL_LOCAL || 'http://localhost:8080/api/v1/auth/google'
  const prod =
    import.meta.env.VITE_GOOGLE_AUTH_URL_PROD ||
    import.meta.env.VITE_GOOGLE_AUTH_URL ||
    'https://beyondtoursseoul-btsback-production.up.railway.app/api/v1/auth/google'
  return isLocalFrontendHost() ? local : prod
}

function buildUrl(path) {
  return `${resolveApiBaseUrl()}${path}`
}

async function parseJson(res) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function postJson(path, payload) {
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseJson(res)
  return { res, data }
}

export async function loginWithEmail({ email, password }) {
  const { res, data } = await postJson('/api/v1/auth/login', { email, password })
  if (!res.ok) throw new Error(data.message || '로그인에 실패했습니다.')
  return data
}

export async function signupWithEmail({ email, password }) {
  const candidates = ['/api/v1/auth/signup', '/api/v1/auth/register']
  let lastError = null

  for (const path of candidates) {
    const { res, data } = await postJson(path, { email, password })
    if (res.ok) return data
    if (res.status !== 404) {
      throw new Error(data.message || '회원가입에 실패했습니다.')
    }
    lastError = data
  }

  throw new Error(lastError?.message || '회원가입 API 경로를 찾지 못했습니다.')
}

export async function fetchMe(accessToken) {
  const res = await fetch(buildUrl('/api/v1/auth/me'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const data = await parseJson(res)
  if (res.status === 401) throw createAuthExpiredError()
  if (!res.ok) throw new Error(data.message || '내 정보 조회에 실패했습니다.')
  return data
}

export async function updateMyNickname(accessToken, nickname) {
  const res = await fetch(buildUrl('/api/v1/auth/me/nickname'), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nickname }),
  })
  const data = await parseJson(res)
  if (res.status === 401) throw createAuthExpiredError()
  if (!res.ok) throw new Error(data.message || '닉네임 저장에 실패했습니다.')
  return data
}

export async function updateMyProfile(accessToken, { nickname, localPreference, preferredLanguage }) {
  const res = await fetch(buildUrl('/api/v1/auth/me/profile'), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nickname, localPreference, preferredLanguage }),
  })
  const data = await parseJson(res)
  if (res.status === 401) throw createAuthExpiredError()
  if (!res.ok) throw new Error(data.message || '프로필 저장에 실패했습니다.')
  return data
}

export function getGoogleLoginUrl() {
  return resolveGoogleAuthUrl()
}

