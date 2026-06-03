/**
 * Exports a plain SQL backup using pg_dump when available.
 * Resolves the DB URL from apps/api/.env (same rules as the API).
 *
 * Usage: npm run db:backup
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, "apps", "api", ".env");
const outDir = path.join(repoRoot, "backups");

const PLACEHOLDER_MARKERS = ["YOUR-PASSWORD", "[YOUR-PASSWORD]"];

function parseEnvFile(filePath) {
	if (!existsSync(filePath)) {
		return {};
	}

	const env = {};
	for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}
		const eq = trimmed.indexOf("=");
		if (eq === -1) {
			continue;
		}
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		env[key] = value;
	}
	return env;
}

function isUsableUrl(url) {
	if (!url?.trim()) {
		return false;
	}
	return !PLACEHOLDER_MARKERS.some((marker) => url.includes(marker));
}

function buildDirectSupabaseUrl(projectRef, password) {
	const encoded = encodeURIComponent(password);
	return `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`;
}

function buildSessionPoolerUrl(projectRef, password, poolerHost) {
	const encoded = encodeURIComponent(password);
	return `postgresql://postgres.${projectRef}:${encoded}@${poolerHost}:5432/postgres`;
}

function resolveDatabaseUrlCandidates() {
	const fromProcess = process.env.DATABASE_URL?.trim();
	if (isUsableUrl(fromProcess)) {
		return [fromProcess];
	}

	const env = { ...parseEnvFile(envPath), ...process.env };

	if (isUsableUrl(env.DATABASE_URL)) {
		return [env.DATABASE_URL.trim()];
	}

	const ref = env.SUPABASE_PROJECT_REF?.trim();
	const password = env.SUPABASE_DB_PASSWORD?.trim();
	const poolerHost = env.SUPABASE_POOLER_HOST?.trim();

	const candidates = [];
	if (ref && password && poolerHost) {
		candidates.push(buildSessionPoolerUrl(ref, password, poolerHost));
	}
	if (ref && password) {
		candidates.push(buildDirectSupabaseUrl(ref, password));
	}

	return candidates.length > 0 ? candidates : null;
}

const urls = resolveDatabaseUrlCandidates();
if (!urls) {
	console.error(
		"[db-backup] No database URL found. Set DATABASE_URL or SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD in apps/api/.env",
	);
	process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outfile = path.join(outDir, `tzw-backup-${stamp}.sql`);

function runPgDump(url, index) {
	let host = "database";
	try {
		host = new URL(url.replace(/^postgres:/, "http:")).hostname;
	} catch {
		// ignore
	}

	if (index > 0) {
		console.log(`[db-backup] Retrying with ${host}...`);
	} else {
		console.log(`[db-backup] Target: ${host}`);
		console.log(`[db-backup] Writing ${outfile}`);
	}

	const child = spawn("pg_dump", ["--dbname", url, "--file", outfile, "--no-owner"], {
		stdio: "inherit",
		shell: process.platform === "win32",
	});

	child.on("close", (code) => {
		if (code === 0) {
			console.log("[db-backup] Backup completed.");
			process.exit(0);
		}

		const next = index + 1;
		if (next < urls.length) {
			runPgDump(urls[next], next);
			return;
		}

		console.error(
			"[db-backup] pg_dump failed for all configured hosts. Install PostgreSQL client tools (https://www.postgresql.org/download/windows/)",
		);
		console.error(
			"[db-backup] Or use Supabase Dashboard → Database → Backups for a managed export.",
		);
		process.exit(code ?? 1);
	});
}

runPgDump(urls[0], 0);
