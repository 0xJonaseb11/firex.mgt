import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

import {
	resolveDatabaseUrlFromEnv,
	resolveMigrationDatabaseUrl,
} from "./src/lib/database";

dotenv.config();

let databaseUrl = "";
try {
	databaseUrl = resolveDatabaseUrlFromEnv(process.env);
} catch {
	databaseUrl = "";
}
const migrationUrl = databaseUrl
	? resolveMigrationDatabaseUrl(
			databaseUrl,
			process.env.DATABASE_URL_DIRECT?.trim(),
		)
	: "";

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: migrationUrl || databaseUrl,
	},
});
