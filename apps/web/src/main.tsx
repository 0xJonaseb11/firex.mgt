import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppRoutes } from "@web/routes";
import "@web/styles/app.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<AppRoutes />
	</StrictMode>,
);
