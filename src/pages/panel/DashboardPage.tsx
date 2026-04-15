import { useEffect, useState } from "react";
import { getJson } from "../../api/client";
import { getToken } from "../../auth/token";

type MeRes = { ok?: boolean; panel?: string };

export function DashboardPage() {
  const [me, setMe] = useState<MeRes | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    getJson<MeRes>("/api/yeppie/auth/me", { token: t })
      .then(setMe)
      .catch((e: unknown) =>
        setErr(e instanceof Error ? e.message : "Ошибка запроса")
      );
  }, []);

  const apiBase =
    (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
    "(тот же origin / dev proxy)";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl border border-[var(--color-yeppie-border)] bg-white/90 p-6 shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
        <h2 className="text-base font-medium text-[var(--color-yeppie-text)]">
          Сессия и API
        </h2>
        <dl className="mt-4 space-y-3 text-[15px] text-[var(--color-yeppie-muted)]">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <dt className="shrink-0 text-sm font-medium text-[var(--color-yeppie-text)]">
              GET /api/yeppie/auth/me
            </dt>
            <dd>
              {me?.ok ? (
                <span className="text-emerald-700">ok, панель авторизована</span>
              ) : err ? (
                <span className="text-red-600">{err}</span>
              ) : (
                <span>проверка…</span>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <dt className="shrink-0 text-sm font-medium text-[var(--color-yeppie-text)]">
              База API (VITE_API_URL)
            </dt>
            <dd>
              <code className="rounded-md bg-[var(--color-yeppie-surface)] px-2 py-0.5 text-sm text-[var(--color-yeppie-text)]">
                {apiBase}
              </code>
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-dashed border-[var(--color-yeppie-border)] bg-white/50 p-6">
        <p className="text-[15px] leading-relaxed text-[var(--color-yeppie-muted)]">
          Карточки проектов (репо, ветка, заметки) редактируются в разделе{" "}
          <span className="text-[var(--color-yeppie-text)]">Проекты</span>.
          Сюда позже можно добавить статус VPS, PM2 и последний деплой.
        </p>
      </section>
    </div>
  );
}
