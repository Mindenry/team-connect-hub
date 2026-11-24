import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";
import { installDemoMode } from "./lib/demo/install";

// In demo mode this swaps window.fetch for an in-browser mock backend.
// It is a no-op for normal builds.
installDemoMode();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
