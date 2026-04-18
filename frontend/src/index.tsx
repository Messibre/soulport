import React from "react";
import ReactDOM from "react-dom/client";
import "@rainbow-me/rainbowkit/styles.css";

import App from "./App";
import "./index.css";
import { Web3Provider } from "./providers/Web3Provider";

const savedTheme = localStorage.getItem("soulport-theme") || "soulportdark";
document.documentElement.setAttribute("data-theme", savedTheme);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <React.StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </React.StrictMode>,
);
