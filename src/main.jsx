import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
// Phase F: Service Worker 비활성화
// import { registerServiceWorker } from "./registerSW.js";

// Phase F: Service Worker 등록 중단
// registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);