import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = process.env.TZW_FIREX_API_HOST?.trim();

if (!host) {
	console.error(
		"[render-build-web] Missing TZW_FIREX_API_HOST (wire from tzw-firex-api in render.yaml).",
	);
	process.exit(1);
}

const base = host.startsWith("http") ? host : `https://${host}`;
process.env.VITE_API_BASE = `${base.replace(/\/$/, "")}/api`;

console.log(`[render-build-web] VITE_API_BASE=${process.env.VITE_API_BASE}`);

const result = spawnSync(
	"npm",
	["run", "build", "--workspace=@tzw-firex/web"],
	{
		cwd: repoRoot,
		stdio: "inherit",
		env: { ...process.env, FORCE_COLOR: "1" },
	},
);

process.exit(result.status ?? 1);
