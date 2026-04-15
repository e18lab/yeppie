import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { PanelLayout } from "./layout/PanelLayout";
import { DashboardPage } from "./pages/panel/DashboardPage";
import { ProjectsPage } from "./pages/panel/ProjectsPage";
import { SettingsPage } from "./pages/panel/SettingsPage";
import { RequireAuth } from "./auth/RequireAuth";
import { isLoginHost, isPanelHost, useSplitHosts } from "./auth/hosts";

function panelRouteTree() {
  return (
    <Route
      path="/panel"
      element={
        <RequireAuth>
          <PanelLayout />
        </RequireAuth>
      }
    >
      <Route index element={<DashboardPage />} />
      <Route path="projects" element={<ProjectsPage />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>
  );
}

function AppRoutes() {
  const split = useSplitHosts();

  if (!split) {
    return (
      <Routes>
        <Route path="/" element={<LoginPage />} />
        {panelRouteTree()}
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
        {panelRouteTree()}
        <Route path="*" element={<Navigate to="/panel" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      {panelRouteTree()}
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
