export const AUTH_EXPIRED_REASON = 'expired';
export const AUTH_EXPIRED_MESSAGE =
  '로그인이 만료되었습니다. 다시 로그인해 주세요.';

export function createAuthExpiredError(message = AUTH_EXPIRED_MESSAGE) {
  const error = new Error(message);
  error.name = 'AuthExpiredError';
  error.code = 'AUTH_EXPIRED';
  return error;
}

export function isAuthExpiredError(error) {
  return (
    error?.code === 'AUTH_EXPIRED' ||
    error?.name === 'AuthExpiredError' ||
    error?.message === '로그인이 만료되었습니다.' ||
    error?.message === AUTH_EXPIRED_MESSAGE
  );
}

export function buildLoginLocation(
  fullPath = '/discover',
  { expired = false } = {},
) {
  const query = {};

  if (fullPath) {
    query.redirect = fullPath;
  }

  if (expired) {
    query.reason = AUTH_EXPIRED_REASON;
  }

  return {
    name: 'landing',
    query,
  };
}

export function resolvePostLoginRedirect(route, fallback = '/discover') {
  const redirect = route?.query?.redirect;

  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    return redirect;
  }
  return fallback;
}

const POST_LOGIN_REDIRECT_KEY = 'bts:post-login-redirect';

export function storePostLoginRedirect(path) {
  if (typeof window === 'undefined') return;
  if (typeof path === 'string' && path.startsWith('/')) {
    window.sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path);
  }
}

export function consumePostLoginRedirect() {
  if (typeof window === 'undefined') return '';
  const saved = window.sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY) || '';
  window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  return saved;
}
