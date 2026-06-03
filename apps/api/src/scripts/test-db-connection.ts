import config from "@api/config";
import { sql } from "@api/db";
import {
	detectDatabaseProvider,
	verifyDatabaseConnection,
} from "@api/lib/database";

const provider = detectDatabaseProvider(config.databaseUrl);

try {
	await verifyDatabaseConnection(sql);
	console.log(`Database connection OK (${provider})`);
	process.exit(0);
} catch (error) {
	console.error(`Database connection failed (${provider})`);
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
