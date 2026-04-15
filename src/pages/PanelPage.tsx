import { useNavigate } from "react-router-dom";
import { postJson } from "../api/client";
import { clearToken, getToken } from "../auth/token";
import { isPanelHost, loginOrigin, useSplitHosts } from "../auth/hosts";

export function PanelPage() {
  const navigate = useNavigate();
  const token = getToken();

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
          <span className="text-[15px] font-medium">Yeppie</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <div className="rounded-lg bg-white/10 px-3 py-2 text-sm">Обзор</div>
          <div className="rounded-lg px-3 py-2 text-sm text-white/50">
            Проекты (скоро)
          </div>
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-[var(--color-yeppie-bg)]">
        <header className="border-b border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-surface)]/80 px-8 py-5 backdrop-blur">
          <h2 className="text-lg font-medium text-[var(--color-yeppie-text)]">
            Обзор
          </h2>
          <p className="mt-1 text-sm text-[var(--color-yeppie-muted)]">
            Панель управления инфраструктурой. Дальше добавим проекты и
            сервисы.
          </p>
        </header>
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-yeppie-bg)] p-8">
          <div className="rounded-2xl border border-[var(--color-yeppie-border)] bg-white/80 p-8 shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
            <p className="text-[15px] leading-relaxed text-[var(--color-yeppie-muted)]">
              Сессия активна. API:{" "}
              <code className="rounded bg-[var(--color-yeppie-surface)] px-1.5 py-0.5 text-sm text-[var(--color-yeppie-text)]">
                {token ? "Bearer токен сохранён" : "нет токена"}
              </code>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
