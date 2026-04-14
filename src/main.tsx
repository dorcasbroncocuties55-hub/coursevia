import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { pingBackend } from "./lib/backendApi";

// Wake up the backend server on load (Render free tier sleeps after inactivity)
pingBackend().then(ok => {
  if (!ok) console.info("Backend warming up — payments will be ready shortly.");
});

// When a new deploy happens, old lazy-loaded chunk filenames no longer exist.
// This catches the load error and does a hard reload to fetch the new build.
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

// Also catch generic chunk load failures (dynamic import errors)
window.addEventListener("unhandledrejection", (event) => {
  const msg = event?.reason?.message ?? "";
  if (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  ) {
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
