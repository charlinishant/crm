import React from "react";
import ReactDOM from "react-dom/client";
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import App from "./App";
import { AppAlertProvider } from "./components/AppAlertDialog";
import reportWebVitals from "./reportWebVitals";


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <AppAlertProvider>
    <App />
  </AppAlertProvider>
);

reportWebVitals();
