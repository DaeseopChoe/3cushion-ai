// src/registerSW.js
// PWA Service Worker 등록 유틸

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Worker not supported in this browser.");
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log(
          "✅ Service Worker registered:",
          registration.scope
        );
      })
      .catch((error) => {
        console.error(
          "❌ Service Worker registration failed:",
          error
        );
      });
  });
}
