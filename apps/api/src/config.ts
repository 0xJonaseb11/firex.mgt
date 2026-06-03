import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { z } from "zod";

import { resolveDatabaseUrlFromEnv } from "@api/lib/database";

const apiRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
dotenv.config({ path: path.join(apiRoot, ".env") });

const configSchema = z
	.object({
		PORT: z.coerce.number().default(8080),
		DATABASE_URL: z.string().optional(),
		DATABASE_URL_DIRECT: z.string().optional(),
		SUPABASE_PROJECT_REF: z.string().optional(),
		SUPABASE_DB_PASSWORD: z.string().optional(),
		SUPABASE_POOLER_HOST: z.string().optional(),
		SUPABASE_URL: z.string().url().optional(),
		SUPABASE_ANON_KEY: z.string().optional(),
		SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		DOMAIN: z.string().optional(),
		LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
		MAX_FILE_SIZE_MB: z.coerce.number().default(50),
		COMMAND_TIMEOUT_MS: z.coerce.number().default(30000),
		RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
		RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
		CORS_ORIGIN: z.string().default("http://localhost:5173"),
		REFRESH_TOKEN_SECRET: z.string(),
		ACCESS_TOKEN_SECRET: z.string(),
		EMAIL_PROVIDER: z
			.enum(["resend", "brevo", "ethereal", "smtp", "auto"])
			.default("auto"),
		RESEND_API_KEY: z.string().optional(),
		BREVO_API_KEY: z.string().optional(),
		BREVO_SENDER_EMAIL: z.string().email().optional(),
		BREVO_SENDER_NAME: z.string().default("TZW Fire Safety"),
		SMTP_HOST: z.string().default("smtp.gmail.com"),
		SMTP_PORT: z.coerce.number().default(587),
		SMTP_SECURE: z
			.enum(["true", "false"])
			.default("false")
			.transform((v) => v === "true"),
		SMTP_USER: z.string().optional(),
		SMTP_PASS: z.string().optional(),
		EMAIL_FROM: z.string().default("TZW Fire Safety <onboarding@resend.dev>"),
		APP_PUBLIC_URL: z.string().url().default("http://localhost:5173"),
	})
	.superRefine((env, ctx) => {
		const hasDatabaseUrl = Boolean(env.DATABASE_URL?.trim());
		const hasSupabaseParts =
			Boolean(env.SUPABASE_DB_PASSWORD?.trim()) &&
			Boolean(env.SUPABASE_PROJECT_REF?.trim());

		if (!hasDatabaseUrl && !hasSupabaseParts) {
			const message = env.SUPABASE_PROJECT_REF?.trim()
				? "SUPABASE_DB_PASSWORD is required (Supabase Dashboard → Project Settings → Database)."
				: "Set DATABASE_URL for local Postgres, or SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD for Supabase.";
			ctx.addIssue({
				code: "custom",
				path: ["SUPABASE_DB_PASSWORD"],
				message,
			});
		}

		if (env.NODE_ENV !== "production") {
			return;
		}

		for (const key of ["REFRESH_TOKEN_SECRET", "ACCESS_TOKEN_SECRET"] as const) {
			if (env[key].length < 32) {
				ctx.addIssue({
					code: "custom",
					path: [key],
					message: `${key} must be at least 32 characters in production`,
				});
			}
		}

		if (env.REFRESH_TOKEN_SECRET === env.ACCESS_TOKEN_SECRET) {
			ctx.addIssue({
				code: "custom",
				path: ["ACCESS_TOKEN_SECRET"],
				message: "ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must differ",
			});
		}

		if (!env.DOMAIN) {
			ctx.addIssue({
				code: "custom",
				path: ["DOMAIN"],
				message: "DOMAIN is required in production (used to scope auth cookies)",
			});
		}

		if (env.CORS_ORIGIN === "*") {
			ctx.addIssue({
				code: "custom",
				path: ["CORS_ORIGIN"],
				message:
					"CORS_ORIGIN must be an explicit origin in production (credentials cannot be sent to '*')",
			});
		}
	});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("Invalid environment variables:", z.treeifyError(parsed.error));
	process.exit(1);
}

const databaseUrl = resolveDatabaseUrlFromEnv(parsed.data);
const migrationDatabaseUrl =
	parsed.data.DATABASE_URL_DIRECT?.trim() || databaseUrl;

export const config = {
	port: parsed.data.PORT,
	databaseUrl,
	migrationDatabaseUrl,
	nodeEnv: parsed.data.NODE_ENV,
	logLevel: parsed.data.LOG_LEVEL,
	maxFileSizeMB: parsed.data.MAX_FILE_SIZE_MB,
	commandTimeoutMs: parsed.data.COMMAND_TIMEOUT_MS,
	rateLimitWindowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
	rateLimitMaxRequests: parsed.data.RATE_LIMIT_MAX_REQUESTS,
	corsOrigin: parsed.data.CORS_ORIGIN,
	isDevelopment: parsed.data.NODE_ENV === "development",
	isProduction: parsed.data.NODE_ENV === "production",
	domain: parsed.data.DOMAIN,
	supabaseUrl: parsed.data.SUPABASE_URL,
	supabaseAnonKey: parsed.data.SUPABASE_ANON_KEY,
	supabaseServiceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
	supabaseProjectRef: parsed.data.SUPABASE_PROJECT_REF,
	refreshTokenSecret: parsed.data.REFRESH_TOKEN_SECRET,
	accessTokenSecret: parsed.data.ACCESS_TOKEN_SECRET,
	emailProvider: parsed.data.EMAIL_PROVIDER,
	resendApiKey: parsed.data.RESEND_API_KEY?.trim() || undefined,
	brevoApiKey: parsed.data.BREVO_API_KEY?.trim() || undefined,
	brevoSenderEmail: parsed.data.BREVO_SENDER_EMAIL?.trim() || undefined,
	brevoSenderName: parsed.data.BREVO_SENDER_NAME,
	smtpHost: parsed.data.SMTP_HOST.trim(),
	smtpPort: parsed.data.SMTP_PORT,
	smtpSecure: parsed.data.SMTP_SECURE,
	smtpUser: parsed.data.SMTP_USER?.trim() || undefined,
	smtpPass: parsed.data.SMTP_PASS?.trim() || undefined,
	emailFrom: parsed.data.EMAIL_FROM,
	appPublicUrl: parsed.data.APP_PUBLIC_URL.replace(/\/$/, ""),
};

export default config;
