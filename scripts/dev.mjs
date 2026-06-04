import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiEnvPath = path.join(repoRoot, "apps", "api", ".env");

function readApiPort() {
	const fromEnv = Number(process.env.PORT ?? process.env.API_PORT);
	if (Number.isFinite(fromEnv) && fromEnv > 0) {
		return fromEnv;
	}

	try {
		const raw = readFileSync(apiEnvPath, "utf8");
		const match = raw.match(/^PORT=(\d+)/m);
		if (match) {
			return Number(match[1]);
		}
	} catch {}

	return 8080;
}

const apiPort = readApiPort();
const healthUrl = `http://127.0.0.1:${apiPort}/health`;
const children = [];

function spawnDev(name, args) {
	const child = spawn("npm", args, {
		cwd: repoRoot,
		shell: true,
		stdio: "inherit",
		env: { ...process.env, FORCE_COLOR: "1" },
	});

	child.on("error", (err) => {
		console.error(`[dev] Failed to start ${name}:`, err.message);
		shutdown(1);
	});

	children.push(child);
	return child;
}

async function waitForApi(timeoutMs = 120_000) {
	const started = Date.now();
	process.stdout.write(`[dev] Waiting for API at ${healthUrl} …\n`);

	while (Date.now() - started < timeoutMs) {
		try {
			const response = await fetch(healthUrl, {
				signal: AbortSignal.timeout(3_000),
			});
			if (response.ok) {
				process.stdout.write("[dev] API is ready.\n");
				return;
			}
		} catch {}
		await new Promise((resolve) => setTimeout(resolve, 400));
	}

	throw new Error(
		`API did not become ready within ${timeoutMs / 1000}s (${healthUrl})`,
	);
}

function shutdown(code = 0) {
	for (const child of children) {
		if (!child.killed) {
			child.kill("SIGTERM");
		}
	}
	setTimeout(() => process.exit(code), 300);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

try {
	spawnDev("api", ["run", "dev", "--workspace=@tzw-firex/api"]);
	await waitForApi();
	spawnDev("web", ["run", "dev", "--workspace=@tzw-firex/web"]);
	process.stdout.write(
		"[dev] API + web running (API :{port}, web http://localhost:5173)\n".replace(
			"{port}",
			String(apiPort),
		),
	);
} catch (err) {
	console.error("[dev]", err instanceof Error ? err.message : err);
	shutdown(1);
}
