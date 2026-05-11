import { createRouter, createWebHistory } from 'vue-router'
import LandingView  from '@/views/LandingView.vue'
import DiscoverView from '@/views/DiscoverView.vue'
import ResultView   from '@/views/ResultView.vue'
import MapPageView  from '@/views/MapPageView.vue'
import SavedView    from '@/views/SavedView.vue'
import ProfileView  from '@/views/ProfileView.vue'
import AiOverlayView from '@/views/AiOverlayView.vue'
import ProfileSetupView from '@/views/ProfileSetupView.vue'
import AuthCallbackView from '@/views/AuthCallbackView.vue'
import AttractionDetailView from '@/views/AttractionDetailView.vue'
import LockerDetailView from '@/views/LockerDetailView.vue'
import EventDetailView from '@/views/EventDetailView.vue'
import { clearAiSheetSession, isAiDetailPath } from '@/utils/aiSheetSession'
import { useAuthStore } from '@/stores/useAuthStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',         name: 'landing',  component: LandingView },
    { path: '/discover', name: 'discover', component: DiscoverView },
    { path: '/ai',       name: 'ai',       component: AiOverlayView },
    { path: '/result',   name: 'result',   component: ResultView },
    { path: '/map',      name: 'map',      component: MapPageView },
    { path: '/saved',    name: 'saved',    component: SavedView },
    { path: '/profile',  name: 'profile',  component: ProfileView },
    { path: '/profile/setup', name: 'profile-setup', component: ProfileSetupView },
    { path: '/auth/callback', name: 'auth-callback', component: AuthCallbackView },
    { path: '/attractions/:id', name: 'attraction-detail', component: AttractionDetailView },
    { path: '/lockers/:id', name: 'locker-detail', component: LockerDetailView },
    { path: '/events/:id', name: 'event-detail', component: EventDetailView },
  ],
})

router.beforeEach(async (to, from) => {
  const authStore = useAuthStore()
  const requiresAuth = ['discover', 'ai', 'result', 'map', 'saved', 'profile', 'profile-setup'].includes(String(to.name || ''))

  if (requiresAuth && !authStore.isAuthenticated) {
    return { name: 'landing' }
  }
  if (!authStore.isAuthenticated) return true

  if (!authStore.user) {
    await authStore.loadMe().catch(() => null)
  }
  const hasNickname = !!(authStore.user?.nickname && String(authStore.user.nickname).trim())
  const hasPersona = !!(authStore.user?.localPreference && String(authStore.user.localPreference).trim())
  const onboardingDone = hasNickname && hasPersona
  if (!onboardingDone && to.name !== 'profile-setup' && to.name !== 'auth-callback') {
    return { name: 'profile-setup' }
  }
  if (onboardingDone && to.name === 'profile-setup') {
    return { name: 'discover' }
  }
  if (to.name === 'ai') {
    const hasReturnTo = typeof to.query?.returnTo === 'string' && to.query.returnTo.trim() !== ''
    if (!hasReturnTo && from.name !== 'ai') {
      const returnTo = from?.fullPath && from.fullPath !== '/ai' ? from.fullPath : '/discover'
      return {
        name: 'ai',
        query: {
          ...to.query,
          returnTo,
        },
        replace: true,
      }
    }
  }
  return true
})

/** /ai 일정 시트 draft는 상세 → 복귀 플로우에서만 쓰므로, 그 외 화면으로 나가면 세션 초기화 */
router.afterEach((to) => {
  const p = to.path
  if (p === '/ai' || isAiDetailPath(p)) return
  clearAiSheetSession()
})

export default router
