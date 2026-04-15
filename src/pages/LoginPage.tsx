import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { postJson } from "../api/client";
import { getToken, setToken } from "../auth/token";

type LoginRes = { ok: boolean; token: string; expiresAt: string };

export function LoginPage() {
  const navigate = useNavigate();
  useEffect(() => {
    if (getToken()) navigate("/panel", { replace: true });
  }, [navigate]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await postJson<LoginRes>("/api/yeppie/auth/login", {
        password,
      });
      if (res.token) {
        setToken(res.token);
        navigate("/panel", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-10 text-center">
          <h1 className="text-[2rem] font-normal tracking-tight text-[var(--color-yeppie-text)]">
            Yeppie
          </h1>
          <p className="mt-2 text-[15px] text-[var(--color-yeppie-muted)]">
            Панель управления. Введите пароль.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-[var(--color-yeppie-border)] bg-white/80 p-8 shadow-[0_1px_1px_rgba(0,0,0,0.04)] backdrop-blur-sm"
        >
          <label className="block text-left text-sm font-medium text-[var(--color-yeppie-text)]">
            Пароль
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-4 py-3 text-[15px] outline-none ring-0 transition focus:border-[var(--color-yeppie-accent)] focus:ring-2 focus:ring-[rgba(196,92,58,0.25)]"
              placeholder="••••••••"
              required
            />
          </label>

          {error ? (
            <p className="mt-3 text-left text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-[var(--color-yeppie-accent)] py-3 text-[15px] font-medium text-white transition hover:bg-[var(--color-yeppie-accent-hover)] disabled:opacity-60"
          >
            {busy ? "Вход…" : "Продолжить"}
          </button>
        </form>
      </div>
    </div>
  );
}
