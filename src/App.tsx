import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { PanelPage } from "./pages/PanelPage";
import { getToken, redirectToLogin } from "./auth/token";
import { isLoginHost, isPanelHost, useSplitHosts } from "./auth/hosts";

function RequireAuth({ children }: { children: ReactNode }) {
  const t = getToken();
  if (!t) {
    if (isPanelHost()) {
      redirectToLogin();
      return (
        <p className="p-8 text-center text-[var(--color-yeppie-muted)]">
          Перенаправление на вход…
        </p>
      );
    }
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const split = useSplitHosts();

  if (!split) {
    return (
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/panel"
          element={
            <RequireAuth>
              <PanelPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (isLoginHost()) {
    return (
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (isPanelHost()) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/panel" replace />} />
        <Route
          path="/panel"
          element={
            <RequireAuth>
              <PanelPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/panel" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/panel"
        element={
          <RequireAuth>
            <PanelPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
