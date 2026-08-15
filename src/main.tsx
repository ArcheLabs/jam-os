import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { JamOsPreview } from "./preview/JamOsPreview";

const previewMode = new URLSearchParams(window.location.search).get("preview") === "1" || window.location.hash === "#preview";
const Root = previewMode ? JamOsPreview : App;

createRoot(document.getElementById("root")!).render(<StrictMode><Root /></StrictMode>);
