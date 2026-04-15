/** Прод: вход на apex, панель на panel. Локально — один origin, старое поведение. */

export function useSplitHosts(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return false;
  return h === "yeppie.maks1mio.su" || h === "panel.yeppie.maks1mio.su";
}

export function isLoginHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "yeppie.maks1mio.su";
}

export function isPanelHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "panel.yeppie.maks1mio.su";
}

export function loginOrigin(): string {
  return (import.meta.env.VITE_LOGIN_ORIGIN ?? "https://yeppie.maks1mio.su").replace(
    /\/$/,
    ""
  );
}

export function panelOrigin(): string {
  return (import.meta.env.VITE_PANEL_ORIGIN ?? "https://panel.yeppie.maks1mio.su").replace(
    /\/$/,
    ""
  );
}
