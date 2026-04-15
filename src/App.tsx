import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { PanelPage } from "./pages/PanelPage";
import { RequireAuth } from "./auth/RequireAuth";
import { isLoginHost, isPanelHost, useSplitHosts } from "./auth/hosts";

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
