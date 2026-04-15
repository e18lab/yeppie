import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { postJson } from "../api/client";
import { clearToken, getToken } from "../auth/token";
import { isPanelHost, loginOrigin, useSplitHosts } from "../auth/hosts";

const nav = [
  { to: "/panel", label: "Обзор", end: true },
  { to: "/panel/projects", label: "Проекты", end: false },
  { to: "/panel/settings", label: "Настройки", end: false },
] as const;

function panelTitle(pathname: string): string {
  if (pathname === "/panel" || pathname === "/panel/") return "Обзор";
  if (pathname.startsWith("/panel/projects")) return "Проекты";
  if (pathname.startsWith("/panel/settings")) return "Настройки";
  return "Панель";
}

function panelSubtitle(pathname: string): string {
  if (pathname.startsWith("/panel/projects"))
    return "GitHub, webhook, поддомен и вызов deploy-hook на вашем VPS.";
  if (pathname.startsWith("/panel/settings"))
    return "Окружение и выход из панели.";
  return "Сводка по сессии и API.";
}

export function PanelLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const title = panelTitle(location.pathname);
  const subtitle = panelSubtitle(location.pathname);

  async function logout() {
    const t = getToken();
    if (t) {
      try {
        await postJson("/api/yeppie/auth/logout", {}, { token: t });
      } catch {
        /* ignore */
      }
    }
    clearToken();
    if (useSplitHosts() && isPanelHost()) {
      window.location.href = `${loginOrigin()}/`;
    } else {
      navigate("/", { replace: true });
    }
  }

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-white/10 bg-[var(--color-yeppie-sidebar)] text-[var(--color-yeppie-sidebar-text)]">
        <div className="border-b border-white/10 px-5 py-4">
          <span className="text-[15px] font-medium tracking-tight">Yeppie</span>
          <p className="mt-0.5 text-[11px] font-normal text-white/45">
            инфраструктура
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "rounded-lg px-3 py-2.5 text-sm transition",
                  isActive
                    ? "bg-white/12 font-medium text-white"
                    : "text-white/70 hover:bg-white/8 hover:text-white/90",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-white/75 hover:bg-white/10"
          >
            Выйти
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-surface)]/90 px-8 py-5 backdrop-blur">
          <h1 className="text-lg font-medium tracking-tight text-[var(--color-yeppie-text)]">
            {title}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-yeppie-muted)]">
            {subtitle}
          </p>
        </header>
        <main className="min-h-0 flex-1 overflow-auto bg-[var(--color-yeppie-bg)] p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
