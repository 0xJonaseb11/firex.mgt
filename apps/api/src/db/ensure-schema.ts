import { sql } from "@api/db";
import logger from "@api/utils/logger";

/** Applies email verification schema if migration was not run manually. */
export async function ensureEmailVerificationSchema(): Promise<void> {
	try {
		await sql`
			ALTER TABLE users
			ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false NOT NULL
		`;
		await sql`
			UPDATE users SET email_verified = true WHERE email_verified = false
		`;
		await sql`
			CREATE TABLE IF NOT EXISTS email_verification_tokens (
				id text PRIMARY KEY NOT NULL,
				user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				token_hash text NOT NULL,
				expires_at timestamptz NOT NULL,
				created_at timestamptz DEFAULT now() NOT NULL
			)
		`;
		logger.info("Email verification schema ensured");
	} catch (err) {
		logger.warn("Could not ensure email verification schema", {
			error: err instanceof Error ? err.message : String(err),
		});
	}
}
