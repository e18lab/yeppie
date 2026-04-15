import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { deleteJson, getJson, postJson } from "../../api/client";
import { getToken } from "../../auth/token";
import { useSplitHosts } from "../../auth/hosts";

type CallbackHint = { ok?: boolean; redirectUri?: string };
type GithubStatus = {
  ok?: boolean;
  connected?: boolean;
  login?: string | null;
};

type DiagnoseResult = {
  ok?: boolean;
  githubLogin?: string | null;
  oauthScopes?: string | null;
  repoFullName?: string | null;
  listFirst100ContainsRepo?: boolean | null;
  repoGetStatus?: number | null;
  repoGetMessage?: string | null;
  hints?: string[];
};

export function SettingsPage() {
  const split = useSplitHosts();
  const [searchParams, setSearchParams] = useSearchParams();
  const api = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "";
  const login = (import.meta.env.VITE_LOGIN_ORIGIN as string | undefined)?.trim();
  const panel = (import.meta.env.VITE_PANEL_ORIGIN as string | undefined)?.trim();

  const [gh, setGh] = useState<GithubStatus | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [diagnoseRepo, setDiagnoseRepo] = useState("e18lab/multporn-api-sdk");
  const [diagBusy, setDiagBusy] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<DiagnoseResult | null>(
    null
  );

  useEffect(() => {
    const g = searchParams.get("github");
    if (g === "ok") {
      setBanner("GitHub подключён.");
      searchParams.delete("github");
      setSearchParams(searchParams, { replace: true });
    } else if (g === "error") {
      const r = searchParams.get("reason");
      setBanner(`GitHub: ошибка${r ? ` — ${r}` : ""}`);
      searchParams.delete("github");
      searchParams.delete("reason");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    void (async () => {
      try {
        const [st, hi] = await Promise.all([
          getJson<GithubStatus>("/api/yeppie/github/status", { token: t }),
          getJson<CallbackHint>("/api/yeppie/github/callback-hint", { token: t }),
        ]);
        setGh(st);
        setHint(hi.redirectUri ?? null);
      } catch {
        setGh({ connected: false });
      }
    })();
  }, []);

  async function connectGithub() {
    const t = getToken();
    if (!t) return;
    setBusy(true);
    setBanner(null);
    try {
      const redirectAfter = `${window.location.origin}${window.location.pathname}`;
      const res = await postJson<{ url?: string }>(
        "/api/yeppie/github/oauth/start",
        { redirectAfter },
        { token: t }
      );
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (e: unknown) {
      setBanner(e instanceof Error ? e.message : "Не удалось начать OAuth");
    } finally {
      setBusy(false);
    }
  }

  async function disconnectGithub() {
    const t = getToken();
    if (!t) return;
    if (!window.confirm("Отключить GitHub на этой панели?")) return;
    setBusy(true);
    try {
      await deleteJson("/api/yeppie/github/connection", { token: t });
      setGh({ connected: false, login: null });
      setBanner("GitHub отключён.");
    } catch (e: unknown) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function runDiagnose() {
    const t = getToken();
    if (!t) return;
    setDiagBusy(true);
    setDiagnoseResult(null);
    try {
      const q = diagnoseRepo.trim();
      const path =
        `/api/yeppie/github/diagnose` + (q ? `?repo=${encodeURIComponent(q)}` : "");
      const res = await getJson<DiagnoseResult>(path, { token: t });
      setDiagnoseResult(res);
    } catch (e: unknown) {
      setDiagnoseResult({
        ok: false,
        hints: [e instanceof Error ? e.message : "Ошибка запроса"],
      });
    } finally {
      setDiagBusy(false);
    }
  }

  const cardClass =
    "rounded-2xl border border-[var(--color-yeppie-border)] bg-white/90 p-6 shadow-[0_1px_1px_rgba(0,0,0,0.04)]";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {banner ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {banner}
        </p>
      ) : null}

      <div className={cardClass}>
        <h2 className="text-base font-medium text-[var(--color-yeppie-text)]">
          GitHub
        </h2>
        <p className="mt-2 text-[15px] text-[var(--color-yeppie-muted)]">
          OAuth даёт доступ к вашим репозиториям для создания webhook (push →
          автодеплой). В GitHub → Settings → Developer settings → OAuth Apps
          создайте приложение: Authorization callback URL должен совпадать с
          полем ниже.
        </p>
        {hint ? (
          <p className="mt-3 break-all rounded-lg bg-[var(--color-yeppie-surface)] px-3 py-2 font-mono text-xs text-[var(--color-yeppie-text)]">
            {hint}
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-yeppie-muted)]">
            Загрузка callback URL…
          </p>
        )}
        <p className="mt-3 text-sm text-[var(--color-yeppie-muted)]">
          Статус:{" "}
          {gh?.connected ? (
            <span className="text-emerald-800">
              подключено ({gh.login ?? "user"})
            </span>
          ) : (
            <span>не подключено</span>
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !getToken()}
            onClick={() => void connectGithub()}
            className="rounded-xl bg-[var(--color-yeppie-accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-yeppie-accent-hover)] disabled:opacity-60"
          >
            {busy ? "…" : "Подключить GitHub"}
          </button>
          {gh?.connected ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void disconnectGithub()}
              className="rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-surface)] px-4 py-2.5 text-sm"
            >
              Отключить
            </button>
          ) : null}
        </div>

        {gh?.connected ? (
          <div className="mt-6 border-t border-[var(--color-yeppie-border)] pt-4">
            <h3 className="text-sm font-medium text-[var(--color-yeppie-text)]">
              Диагностика доступа к репозиторию
            </h3>
            <p className="mt-1 text-xs text-[var(--color-yeppie-muted)]">
              Сравниваем ответы GitHub API. Если репо есть в списке, а прямой
              запрос даёт 404 — часто не настроен SAML SSO для OAuth-токена.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={diagnoseRepo}
                onChange={(e) => setDiagnoseRepo(e.target.value)}
                className="min-w-[200px] flex-1 rounded-lg border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-3 py-2 text-sm font-mono"
                placeholder="owner/repo"
              />
              <button
                type="button"
                disabled={diagBusy}
                onClick={() => void runDiagnose()}
                className="rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-surface)] px-4 py-2 text-sm"
              >
                {diagBusy ? "Проверка…" : "Проверить"}
              </button>
            </div>
            {diagnoseResult ? (
              <div className="mt-3 space-y-2">
                {diagnoseResult.hints?.length ? (
                  <ul className="list-inside list-disc text-sm text-amber-900">
                    {diagnoseResult.hints.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                ) : null}
                <pre className="max-h-56 overflow-auto rounded-lg bg-[var(--color-yeppie-surface)] p-3 text-[11px] leading-relaxed">
                  {JSON.stringify(diagnoseResult, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={cardClass}>
        <h2 className="text-base font-medium text-[var(--color-yeppie-text)]">
          Сборка (read-only)
        </h2>
        <p className="mt-2 text-sm text-[var(--color-yeppie-muted)]">
          Значения зашиты в билд через{" "}
          <code className="text-xs">VITE_*</code>. Меняются в{" "}
          <code className="text-xs">.env</code> на сервере и новым{" "}
          <code className="text-xs">yarn build</code>.
        </p>
        <ul className="mt-4 space-y-2 text-[15px] text-[var(--color-yeppie-text)]">
          <li className="flex flex-col gap-1 sm:flex-row sm:gap-2">
            <span className="shrink-0 text-sm text-[var(--color-yeppie-muted)]">
              VITE_API_URL
            </span>
            <code className="break-all rounded-md bg-[var(--color-yeppie-surface)] px-2 py-1 text-sm">
              {api || "—"}
            </code>
          </li>
          {split ? (
            <>
              <li className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                <span className="shrink-0 text-sm text-[var(--color-yeppie-muted)]">
                  VITE_LOGIN_ORIGIN
                </span>
                <code className="break-all rounded-md bg-[var(--color-yeppie-surface)] px-2 py-1 text-sm">
                  {login || "default"}
                </code>
              </li>
              <li className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                <span className="shrink-0 text-sm text-[var(--color-yeppie-muted)]">
                  VITE_PANEL_ORIGIN
                </span>
                <code className="break-all rounded-md bg-[var(--color-yeppie-surface)] px-2 py-1 text-sm">
                  {panel || "default"}
                </code>
              </li>
            </>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
