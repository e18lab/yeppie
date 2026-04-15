import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Старый токен только в localStorage на apex ломал split-логин (панель его не видела)
if (typeof window !== "undefined") {
  const h = window.location.hostname;
  if (h.endsWith(".maks1mio.su")) {
    try {
      localStorage.removeItem("yeppie_token");
    } catch {
      /* ignore */
    }
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
