<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getGoogleLoginUrl } from '@/services/authService'
import { useAuthStore } from '@/stores/useAuthStore'
import { SUPPORTED_LOCALES, setLocale, getCurrentLocale } from '@/i18n'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const authMode = ref('login')
const showLangDrop = ref(false)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loginError = ref('')

const currentLangLabel = computed(
  () => SUPPORTED_LOCALES.find((l) => l.code === getCurrentLocale())?.label ?? 'Language / 언어',
)

function selectLang(lang) {
  setLocale(lang.code)
  showLangDrop.value = false
  loginError.value = ''
}

function go() {
  window.location.href = getGoogleLoginUrl()
}

async function loginWithEmail() {
  loginError.value = ''
  try {
    if (authMode.value === 'signup') {
      if (!email.value.trim() || !password.value) {
        throw new Error(t('landing.validation.emailPasswordRequired'))
      }
      if (password.value.length < 8) {
        throw new Error(t('landing.validation.passwordMinLength'))
      }
      if (password.value !== confirmPassword.value) {
        throw new Error(t('landing.validation.passwordMismatch'))
      }
      const result = await authStore.signup(email.value.trim(), password.value)
      if (!result?.accessToken) {
        authMode.value = 'login'
        loginError.value = t('landing.validation.signupComplete')
        return
      }
    } else {
      await authStore.login(email.value.trim(), password.value)
    }
    await authStore.loadMe().catch(() => null)
    router.push('/discover')
  } catch (e) {
    loginError.value = e.message || t('landing.validation.authFailed')
  }
}
</script>

<template>
  <div class="landing" @click="showLangDrop = false">

    <!-- ── Background layers ─────────────────────────────────────────── -->
    <div class="landing__bg">
      <div class="landing__glow"></div>

      <!-- Seoul Skyline SVG -->
      <svg class="landing__skyline" viewBox="0 0 430 220" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
        <!-- Hills -->
        <ellipse cx="60" cy="230" rx="120" ry="60" fill="#0d1520"/>
        <ellipse cx="370" cy="240" rx="100" ry="55" fill="#0d1520"/>
        <!-- Background buildings -->
        <rect x="0"   y="155" width="28" height="75"  fill="#0f1c2e"/>
        <rect x="22"  y="140" width="20" height="90"  fill="#111e30"/>
        <rect x="38"  y="148" width="32" height="82"  fill="#0f1c2e"/>
        <rect x="66"  y="130" width="18" height="100" fill="#121f32"/>
        <rect x="80"  y="143" width="24" height="87"  fill="#0f1c2e"/>
        <rect x="100" y="150" width="30" height="80"  fill="#111e30"/>
        <rect x="126" y="138" width="22" height="92"  fill="#0f1c2e"/>
        <!-- Mid buildings -->
        <rect x="148" y="125" width="30" height="105" fill="#132030"/>
        <rect x="174" y="118" width="26" height="112" fill="#142234"/>
        <rect x="196" y="130" width="20" height="100" fill="#111e30"/>
        <rect x="212" y="110" width="22" height="120" fill="#142234"/>
        <rect x="230" y="122" width="28" height="108" fill="#132030"/>
        <rect x="254" y="132" width="24" height="98"  fill="#111e30"/>
        <rect x="274" y="120" width="30" height="110" fill="#142234"/>
        <rect x="300" y="140" width="22" height="90"  fill="#111e30"/>
        <rect x="318" y="128" width="26" height="102" fill="#132030"/>
        <rect x="340" y="145" width="20" height="85"  fill="#0f1c2e"/>
        <rect x="356" y="138" width="30" height="92"  fill="#111e30"/>
        <rect x="382" y="150" width="28" height="80"  fill="#0f1c2e"/>
        <rect x="406" y="142" width="24" height="88"  fill="#132030"/>
        <!-- N Seoul Tower - mast -->
        <rect x="203" y="52"  width="6" height="58"  fill="#1a2e48"/>
        <!-- Tower observation deck -->
        <rect x="197" y="82"  width="18" height="22" rx="4" fill="#1a2e48"/>
        <!-- Tower base -->
        <rect x="200" y="104" width="12" height="18" fill="#162640"/>
        <!-- Tower light glow -->
        <ellipse cx="206" cy="55" rx="5" ry="5" fill="#FE9C00" opacity="0.9"/>
        <ellipse cx="206" cy="55" rx="10" ry="10" fill="#FE9C00" opacity="0.2"/>
        <!-- Window lights scattered on buildings -->
        <rect x="153" y="130" width="3" height="3" fill="#FFC94A" opacity="0.6"/>
        <rect x="160" y="138" width="3" height="3" fill="#FFC94A" opacity="0.5"/>
        <rect x="177" y="122" width="3" height="3" fill="#FFC94A" opacity="0.7"/>
        <rect x="184" y="130" width="3" height="3" fill="#FFC94A" opacity="0.4"/>
        <rect x="215" y="116" width="3" height="3" fill="#FFC94A" opacity="0.8"/>
        <rect x="222" y="126" width="3" height="3" fill="#FFC94A" opacity="0.5"/>
        <rect x="235" y="128" width="3" height="3" fill="#FFC94A" opacity="0.6"/>
        <rect x="242" y="136" width="3" height="3" fill="#FFC94A" opacity="0.4"/>
        <rect x="277" y="125" width="3" height="3" fill="#FFC94A" opacity="0.7"/>
        <rect x="284" y="133" width="3" height="3" fill="#FFC94A" opacity="0.5"/>
        <rect x="321" y="132" width="3" height="3" fill="#FFC94A" opacity="0.6"/>
        <rect x="328" y="140" width="3" height="3" fill="#FFC94A" opacity="0.4"/>
        <rect x="361" y="142" width="3" height="3" fill="#FFC94A" opacity="0.5"/>
        <rect x="368" y="150" width="3" height="3" fill="#FFC94A" opacity="0.6"/>
        <!-- Ground -->
        <rect x="0" y="220" width="430" height="10" fill="#0a1525"/>
      </svg>
    </div>

    <!-- ── Content ────────────────────────────────────────────────────── -->
    <div class="landing__content">

      <!-- Spacer — 타워가 보이는 빈 공간 -->
      <div class="landing__spacer"></div>

      <!-- Bottom panel -->
      <div class="landing__bottom">

        <!-- Hero text -->
        <div class="landing__hero">
          <h1 class="landing__logo">BTS</h1>
          <p class="landing__subtitle">Beyond Tours Seoul</p>
          <p class="landing__tagline">{{ $t('landing.tagline') }}</p>
        </div>

        <!-- Actions -->
        <div class="landing__actions">
        <!-- Language selector -->
        <div class="landing__lang-wrap" @click.stop>
          <button class="landing__lang-btn" @click="showLangDrop = !showLangDrop">
            <span class="landing__lang-globe">🌐</span>
            <span>{{ currentLangLabel }}</span>
            <span class="landing__lang-arrow" :class="{ 'landing__lang-arrow--open': showLangDrop }">›</span>
          </button>
          <Transition name="drop">
            <div v-if="showLangDrop" class="landing__lang-drop">
              <button
                v-for="lang in SUPPORTED_LOCALES"
                :key="lang.code"
                class="landing__lang-option"
                @click="selectLang(lang)"
              >{{ lang.label }}</button>
            </div>
          </Transition>
        </div>

        <!-- Google button -->
        <button class="landing__btn landing__btn--google" @click="go">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" />
          {{ $t('landing.continueGoogle') }}
        </button>

        <!-- Email divider -->
        <div class="landing__or">
          <span class="landing__or-line"></span>
          <span class="landing__or-text">{{ $t('landing.orEmail') }}</span>
          <span class="landing__or-line"></span>
        </div>

        <div class="landing__auth-mode">
          <button
            class="landing__auth-tab"
            :class="{ 'landing__auth-tab--active': authMode === 'login' }"
            type="button"
            @click="authMode = 'login'"
          >
            {{ $t('landing.loginBtn') }}
          </button>
          <button
            class="landing__auth-tab"
            :class="{ 'landing__auth-tab--active': authMode === 'signup' }"
            type="button"
            @click="authMode = 'signup'"
          >
            {{ $t('landing.signupBtn') }}
          </button>
        </div>

        <div class="landing__email-box">
          <input
            v-model="email"
            class="landing__input"
            type="email"
            placeholder="Email"
            autocomplete="email"
          />
          <input
            v-model="password"
            class="landing__input"
            type="password"
            placeholder="Password"
            autocomplete="current-password"
          />
          <input
            v-if="authMode === 'signup'"
            v-model="confirmPassword"
            class="landing__input"
            type="password"
            :placeholder="$t('landing.passwordConfirmPlaceholder')"
            autocomplete="new-password"
          />
          <button class="landing__btn landing__btn--email" @click="loginWithEmail" :disabled="authStore.isLoading">
            {{
              authStore.isLoading
                ? (authMode === 'signup' ? $t('landing.signupLoading') : $t('landing.loginLoading'))
                : (authMode === 'signup' ? $t('landing.signupBtn') : $t('landing.loginBtn'))
            }}
          </button>
          <p v-if="loginError" class="landing__error">{{ loginError }}</p>
        </div>

        <!-- Dots -->
        <div class="landing__dots">
          <span class="landing__dot landing__dot--active"></span>
          <span class="landing__dot"></span>
          <span class="landing__dot"></span>
        </div>
      </div>

      </div><!-- /landing__bottom -->
    </div>
  </div>
</template>

<style scoped>
/* ─── Root ───────────────────────────────────────────────────────────────── */
.landing {
  min-height: 100dvh;
  position: relative;
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
  background: #0a1525;
}

/* ─── Background ─────────────────────────────────────────────────────────── */
.landing__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Seoul photo background */
.landing__bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('/seoul-bg.png');
  background-size: cover;
  background-position: center 15%;
  background-repeat: no-repeat;
}

/* Dark gradient overlay */
.landing__bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(8, 6, 18, 0.20) 0%,
    rgba(8, 6, 18, 0.25) 35%,
    rgba(8, 6, 18, 0.60) 62%,
    rgba(8, 6, 18, 0.93) 100%
  );
}

/* Orange glow at top — matches the sunset in the photo */
.landing__glow {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 360px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(254,156,0,0.18) 0%, rgba(254,120,0,0.08) 50%, transparent 70%);
  z-index: 1;
}

/* Skyline SVG hidden — using real photo now */
.landing__skyline {
  display: none;
}

/* ─── Content ────────────────────────────────────────────────────────────── */
.landing__content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

/* 타워가 보이는 빈 상단 공간 */
.landing__spacer { flex: 1; min-height: 30vh; }

/* 하단 패널 — 배지 + 로고 + 버튼 */
.landing__bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 24px 28px 44px;
  /* 하단 영역에 약한 블러 유리 효과 */
  background: linear-gradient(to top, rgba(6,5,15,0.82) 0%, rgba(6,5,15,0.0) 100%);
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
.landing__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  margin-bottom: 28px;
  width: 100%;
}

.landing__logo {
  font-size: 80px;
  font-weight: 900;
  color: #FE9C00;
  letter-spacing: -3px;
  line-height: 0.95;
  margin: 0;
  text-shadow:
    0 0 50px rgba(254, 156, 0, 0.55),
    0 4px 20px rgba(254, 100, 0, 0.4);
}

.landing__subtitle {
  font-size: 16px;
  font-weight: 500;
  color: rgba(255,255,255,0.9);
  letter-spacing: 0.04em;
  margin: 4px 0 0;
}

.landing__tagline {
  font-size: 13px;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.02em;
  margin-top: 2px;
}

/* ─── Actions ────────────────────────────────────────────────────────────── */
.landing__actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

/* Language selector */
.landing__lang-wrap {
  position: relative;
  width: 100%;
}

.landing__lang-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1.5px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.85);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: border-color 0.2s;
}

.landing__lang-btn:hover { border-color: rgba(254,156,0,0.5); }

.landing__lang-globe { font-size: 18px; }

.landing__lang-arrow {
  margin-left: auto;
  font-size: 20px;
  color: rgba(255,255,255,0.4);
  transition: transform 0.25s;
  display: inline-block;
}

.landing__lang-arrow--open { transform: rotate(90deg); }

.landing__lang-drop {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #1a2840;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 14px;
  overflow: hidden;
  z-index: 50;
}

.landing__lang-option {
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  background: none;
  border: none;
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.landing__lang-option:hover { background: rgba(254,156,0,0.15); color: #FE9C00; }

/* Google button */
.landing__btn {
  width: 100%;
  padding: 15px 16px;
  border-radius: 14px;
  border: none;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: opacity 0.2s, transform 0.1s;
}

.landing__btn:active { opacity: 0.88; transform: scale(0.98); }

.landing__btn--google {
  background: #fff;
  color: #222;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.landing__btn--google img { width: 20px; height: 20px; }

.landing__email-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.landing__auth-mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.landing__auth-tab {
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.landing__auth-tab--active {
  border-color: rgba(254, 156, 0, 0.9);
  background: rgba(254, 156, 0, 0.2);
  color: #ffd8a1;
}

.landing__input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 14px;
}

.landing__input::placeholder {
  color: rgba(255, 255, 255, 0.45);
}

.landing__btn--email {
  background: #fe9c00;
  color: #fff;
  box-shadow: 0 4px 16px rgba(254, 156, 0, 0.35);
}

.landing__btn--email:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.landing__error {
  margin: 0;
  font-size: 12px;
  color: #ffb4b4;
  font-weight: 700;
}

/* OR divider */
.landing__or {
  display: flex;
  align-items: center;
  gap: 10px;
}

.landing__or-line {
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.15);
}

.landing__or-text {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  white-space: nowrap;
}

/* Dots */
.landing__dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
}

.landing__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.25);
}

.landing__dot--active {
  width: 22px;
  border-radius: 3px;
  background: #FE9C00;
}

/* ─── Dropdown transition ─────────────────────────────────────────────────── */
.drop-enter-active, .drop-leave-active { transition: opacity 0.2s, transform 0.2s; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(6px); }
</style>
