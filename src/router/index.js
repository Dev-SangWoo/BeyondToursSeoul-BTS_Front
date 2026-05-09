import { createRouter, createWebHistory } from 'vue-router'
import LandingView  from '@/views/LandingView.vue'
import DiscoverView from '@/views/DiscoverView.vue'
import ResultView   from '@/views/ResultView.vue'
import MapPageView  from '@/views/MapPageView.vue'
import SavedView    from '@/views/SavedView.vue'
import ProfileView  from '@/views/ProfileView.vue'
import AuthCallbackView from '@/views/AuthCallbackView.vue'
import AttractionDetailView from '@/views/AttractionDetailView.vue'
import LockerDetailView from '@/views/LockerDetailView.vue'
import EventDetailView from '@/views/EventDetailView.vue'
import { clearAiSheetSession, isAiDetailPath } from '@/utils/aiSheetSession'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',         name: 'landing',  component: LandingView },
    { path: '/discover', name: 'discover', component: DiscoverView },
    { path: '/ai',       name: 'ai',       component: DiscoverView },
    { path: '/result',   name: 'result',   component: ResultView },
    { path: '/map',      name: 'map',      component: MapPageView },
    { path: '/saved',    name: 'saved',    component: SavedView },
    { path: '/profile',  name: 'profile',  component: ProfileView },
    { path: '/auth/callback', name: 'auth-callback', component: AuthCallbackView },
    { path: '/attractions/:id', name: 'attraction-detail', component: AttractionDetailView },
    { path: '/lockers/:id', name: 'locker-detail', component: LockerDetailView },
    { path: '/events/:id', name: 'event-detail', component: EventDetailView },
  ],
})

/** /ai 일정 시트 draft는 상세 → 복귀 플로우에서만 쓰므로, 그 외 화면으로 나가면 세션 초기화 */
router.afterEach((to) => {
  const p = to.path
  if (p === '/ai' || isAiDetailPath(p)) return
  clearAiSheetSession()
})

export default router
