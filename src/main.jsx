import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import ArcanumArchive from "./ArcanumArchive.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ArcanumArchive />
  </StrictMode>,
);
