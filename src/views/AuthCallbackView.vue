<script setup>
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  resolvePostLoginRedirect,
  consumePostLoginRedirect,
} from '@/utils/authFlow';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const status = ref('');

onMounted(() => {
  status.value = t('auth.checking');
});

function readFromUrl() {
  const url = new URL(window.location.href);
  const query = url.searchParams;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));

  const pick = (key) => query.get(key) || hash.get(key) || '';

  return {
    accessToken: pick('accessToken') || pick('access_token'),
    refreshToken: pick('refreshToken') || pick('refresh_token'),
    tokenType: pick('tokenType') || pick('token_type') || 'Bearer',
    expiresIn: Number(pick('expiresIn') || pick('expires_in') || 0),
    email: pick('email'),
    userId: pick('userId') || pick('user_id'),
  };
}

onMounted(async () => {
  try {
    const payload = readFromUrl();
    if (!payload.accessToken) {
      status.value = t('auth.tokenNotFound');
      setTimeout(() => router.replace('/'), 1200);
      return;
    }

    authStore.setSession(payload);
    const me = await authStore.loadMe().catch(() => null);
    const hasNickname = !!(me?.nickname && String(me.nickname).trim());
    const hasPersona = !!(
      me?.localPreference && String(me.localPreference).trim()
    );
    const onboardingDone = hasNickname && hasPersona;
    status.value = onboardingDone
      ? t('auth.loginComplete')
      : t('auth.firstLoginSetup');
    const savedRedirect = consumePostLoginRedirect();
    const nextPath = onboardingDone
      ? savedRedirect || resolvePostLoginRedirect(route)
      : '/profile/setup';
    setTimeout(() => router.replace(nextPath), 500);
  } catch {
    status.value = t('auth.error');
    setTimeout(() => router.replace('/'), 1200);
  }
});
</script>

<template>
  <div class="auth-callback">
    <p>{{ status }}</p>
  </div>
</template>

<style scoped>
.auth-callback {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f5f4f0;
  color: #444;
  font-size: 14px;
  font-weight: 700;
}
</style>
