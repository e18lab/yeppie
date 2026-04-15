import type { ReactNode } from "react";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { getToken, redirectToLogin } from "./token";
import { isPanelHost } from "./hosts";

/** Редирект только из useEffect — иначе цикл с React Router и «маргание». */
export function RequireAuth({ children }: { children: ReactNode }) {
  const t = getToken();
  const onPanel = isPanelHost();

  useEffect(() => {
    if (!getToken() && onPanel) {
      redirectToLogin();
    }
  }, [t, onPanel]);

  if (!t) {
    if (onPanel) {
      return (
        <div className="flex min-h-svh items-center justify-center text-[var(--color-yeppie-muted)]">
          Загрузка…
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
