import { loginOrigin } from "./hosts";

const KEY = "yeppie_token";

/** Cookie на .maks1mio.su — общий для yeppie.* и panel.yeppie.* */
function cookieDomain(): string | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return null;
  if (h.endsWith(".maks1mio.su")) return ".maks1mio.su";
  return null;
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
  );
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

/**
 * На проде (.maks1mio.su) сессия только в cookie (Domain=.maks1mio.su).
 * Не читаем localStorage: на apex он есть, на panel.yeppie — нет → редирект по кругу.
 */
export function getToken(): string | null {
  const domain = cookieDomain();
  if (domain) {
    return readCookie(KEY);
  }
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  const domain = cookieDomain();
  if (domain) {
    const maxAge = 60 * 60 * 24 * 30;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    // Lax иногда режет переход apex → поддомен в SPA; None+Secure для общего домена
    document.cookie = `${KEY}=${encodeURIComponent(token)}; Path=/; Domain=${domain}; Max-Age=${maxAge}; SameSite=None${secure}`;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  } else {
    localStorage.setItem(KEY, token);
  }
}

export function clearToken(): void {
  const domain = cookieDomain();
  if (domain) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${KEY}=; Path=/; Domain=${domain}; Max-Age=0; SameSite=None${secure}`;
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** С панели без сессии — на страницу входа */
export function redirectToLogin(): void {
  window.location.replace(`${loginOrigin()}/`);
}
