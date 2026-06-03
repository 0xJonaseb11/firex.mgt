import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const apiPort = Number(process.env.VITE_API_PORT ?? 8080);
const apiTarget = `http://localhost:${apiPort}`;

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@web": path.resolve(dirname, "src"),
		},
	},
	server: {
		port: 5173,
		proxy: {
			"/api": { target: apiTarget, changeOrigin: true },
			"/health": { target: apiTarget, changeOrigin: true },
			"/docs.json": { target: apiTarget, changeOrigin: true },
		},
	},
});
