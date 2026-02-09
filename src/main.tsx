import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { QuickNoteWindow } from "./QuickNoteWindow";
import App from "./App";
import "./index.css";

let RootComponent = App;

try {
  const currentWindow = getCurrentWindow();
  if (currentWindow.label === 'quick-note') {
    RootComponent = QuickNoteWindow;
  }
} catch (error) {
  console.log('Running in browser mode (no Tauri window detected)');
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
);
