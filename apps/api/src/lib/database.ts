import dns from "node:dns/promises";

import postgres from "postgres";
import type { Sql } from "postgres";

export type DatabaseProvider = "local" | "supabase";

const normalizeUrl = (url: string): string =>
	url.replace(/^postgres:\/\//, "https://").replace(/^postgresql:\/\//, "https://");

export const isSupabaseDatabaseUrl = (url: string): boolean => {
	try {
		const host = new URL(normalizeUrl(url)).hostname.toLowerCase();
		return host.endsWith(".supabase.co") || host.includes("supabase.com");
	} catch {
		return false;
	}
};

export const detectDatabaseProvider = (url: string): DatabaseProvider =>
	isSupabaseDatabaseUrl(url) ? "supabase" : "local";

export const isSupavisorTransactionPooler = (url: string): boolean => {
	try {
		const parsed = new URL(normalizeUrl(url));
		return (
			parsed.port === "6543" ||
			parsed.searchParams.get("pgbouncer") === "true"
		);
	} catch {
		return false;
	}
};

const isPostgresPoolerPort = (url: string): boolean => {
	try {
		const port = new URL(normalizeUrl(url)).port;
		return port === "6543" || port === "6432";
	} catch {
		return false;
	}
};

export const buildSupabaseDatabaseUrl = (
	projectRef: string,
	password: string,
): string => {
	const encoded = encodeURIComponent(password);
	return `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`;
};

/** Session pooler (IPv4-friendly). Host from Supabase Connect → Direct → Session pooler. */
export const buildSupabaseSessionPoolerUrl = (
	projectRef: string,
	password: string,
	poolerHost: string,
): string => {
	const encoded = encodeURIComponent(password);
	return `postgresql://postgres.${projectRef}:${encoded}@${poolerHost}:5432/postgres`;
};

const PLACEHOLDER_MARKERS = ["YOUR-PASSWORD", "[YOUR-PASSWORD]"];

export const isUsableDatabaseUrl = (url?: string): url is string => {
	if (!url?.trim()) {
		return false;
	}
	const trimmed = url.trim();
	return !PLACEHOLDER_MARKERS.some((marker) => trimmed.includes(marker));
};

export type DatabaseEnv = {
	DATABASE_URL?: string;
	SUPABASE_PROJECT_REF?: string;
	SUPABASE_DB_PASSWORD?: string;
	SUPABASE_POOLER_HOST?: string;
};

export const resolveDatabaseUrlFromEnv = (env: DatabaseEnv): string => {
	if (isUsableDatabaseUrl(env.DATABASE_URL)) {
		return env.DATABASE_URL.trim();
	}

	const ref = env.SUPABASE_PROJECT_REF?.trim();
	const password = env.SUPABASE_DB_PASSWORD?.trim();
	const poolerHost = env.SUPABASE_POOLER_HOST?.trim();

	if (ref && password && poolerHost) {
		return buildSupabaseSessionPoolerUrl(ref, password, poolerHost);
	}

	if (ref && password) {
		return buildSupabaseDatabaseUrl(ref, password);
	}

	throw new Error(
		"Set DATABASE_URL, or SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD (+ SUPABASE_POOLER_HOST for session pooler).",
	);
};

const isSupabaseDirectHost = (hostname: string): boolean =>
	hostname.startsWith("db.") && hostname.endsWith(".supabase.co");

/** Windows Node often cannot resolve IPv6-only Supabase direct hosts via lookup(). */
export const resolveDatabaseUrlForConnect = async (
	url: string,
): Promise<string> => {
	if (!isSupabaseDatabaseUrl(url)) {
		return url;
	}

	let parsed: URL;
	try {
		parsed = new URL(normalizeUrl(url));
	} catch {
		return url;
	}

	if (!isSupabaseDirectHost(parsed.hostname.toLowerCase())) {
		return url;
	}

	try {
		await dns.lookup(parsed.hostname, { family: 4 });
		return url;
	} catch {
		// Direct host may be IPv6-only; fall through to resolve6.
	}

	try {
		const addresses = await dns.resolve6(parsed.hostname);
		const ipv6 = addresses[0];
		if (!ipv6) {
			return url;
		}

		const resolved = new URL(
			url.replace(/^postgres:\/\//, "postgresql://"),
		);
		resolved.hostname = `[${ipv6}]`;
		return resolved.toString();
	} catch {
		return url;
	}
};

export const resolveMigrationDatabaseUrl = (
	databaseUrl: string,
	directUrl?: string,
): string => {
	const direct = directUrl?.trim();
	if (direct) {
		return direct;
	}
	if (isSupabaseDatabaseUrl(databaseUrl) && isPostgresPoolerPort(databaseUrl)) {
		throw new Error(
			"Supabase migrations require DATABASE_URL_DIRECT (port 5432), not the transaction pooler on 6543.",
		);
	}
	return databaseUrl;
};

const parsePostgresUrl = (url: string): URL =>
	new URL(url.replace(/^postgres:\/\//, "postgresql://"));

const ipv6LiteralHost = (hostname: string): string | null => {
	if (!hostname.startsWith("[") || !hostname.endsWith("]")) {
		return null;
	}
	return hostname.slice(1, -1);
};

export const createSqlClient = (url: string): Sql => {
	const supabase = isSupabaseDatabaseUrl(url);
	const transactionPooler = isSupavisorTransactionPooler(url);
	const sslOptions = supabase
		? {
				ssl: "require" as const,
				...(transactionPooler ? { prepare: false } : {}),
			}
		: {};
	const poolOptions = {
		max: supabase ? 10 : 20,
		idle_timeout: 20,
		connect_timeout: 15,
		...sslOptions,
	};

	const parsed = parsePostgresUrl(url);
	const ipv6Host = ipv6LiteralHost(parsed.hostname);
	if (ipv6Host) {
		const port = Number(parsed.port) || 5432;
		return postgres({
			host: [ipv6Host],
			port: [port],
			username: decodeURIComponent(parsed.username),
			password: decodeURIComponent(parsed.password),
			database: parsed.pathname.replace(/^\//, "") || "postgres",
			...poolOptions,
		});
	}

	return postgres(url, poolOptions);
};

export const verifyDatabaseConnection = async (client: Sql): Promise<void> => {
	await client`select 1 as ok`;
};
