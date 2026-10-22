
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import keycloak from "./auth/keycloak.js";
import "./index.css";

async function startApp() {
  try {
    const authenticated = await keycloak.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      checkLoginIframe: false,
    });

    ReactDOM.createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <App authenticated={authenticated} />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Keycloak initialization failed:", error);

    document.getElementById("root").innerText =
      "Unable to connect to Keycloak. Check the Keycloak server and client settings.";
  }
}

startApp();
