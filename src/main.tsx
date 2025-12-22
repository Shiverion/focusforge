import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { QuickNoteWindow } from "./QuickNoteWindow";
import App from "./App";
import "./index.css";

const currentWindow = getCurrentWindow();

// Simple routing based on window label
const RootComponent = currentWindow.label === 'quick-note' ? QuickNoteWindow : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
);
