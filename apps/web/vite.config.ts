import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "../..");
const contractsEntry = path.resolve(
	repoRoot,
	"packages/contracts/src/index.ts",
);
const apiPort = Number(process.env.VITE_API_PORT ?? 8080);
const apiTarget = `http://localhost:${apiPort}`;

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@web": path.resolve(dirname, "src"),
			// Use contracts source in dev so Vite resolves ./common.js → common.ts
			"@tzw-firex/contracts": contractsEntry,
		},
	},
	optimizeDeps: {
		include: ["@tzw-firex/contracts", "zod"],
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
