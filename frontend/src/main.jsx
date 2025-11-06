import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import "./index.css";     // <-- this file now exists again

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
