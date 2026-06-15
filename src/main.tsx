import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import "@/globals.css";

const rootElement = document.getElementById("root");

if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  // Trigger post-mount setup
  setTimeout(() => {
    // Attempt to remove initial loader UI
    try {
      const loader = document.getElementById("initial-loader");
      if (loader) {
        loader.style.opacity = "0";
        setTimeout(() => loader.remove(), 800);
      }
    } catch (e) {
      console.warn("Failed to remove initial loader", e);
    }
  }, 100);
}
