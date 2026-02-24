
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "mirotone/dist/styles.css";
import "./styles/tailwind.css";
import "./styles/theme.css";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(<App />);
