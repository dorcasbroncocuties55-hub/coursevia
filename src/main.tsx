import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Preserve the hash before React Router strips it
// This is needed for Supabase implicit OAuth flow
if (window.location.pathname === "/auth/callback" && window.location.hash) {
  sessionStorage.setItem("oauth_hash", window.location.hash);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);