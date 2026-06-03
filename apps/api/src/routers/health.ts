import { Router } from "express";

import config from "@api/config";
import { sql } from "@api/db";
import { detectDatabaseProvider } from "@api/lib/database";
import { asyncHandler } from "@api/middlewares";

export function createHealthRouter(): Router {
	const router = Router();

	router.get(
		"/health",
		asyncHandler(async (_req, res) => {
			let databaseHealthy = false;
			try {
				await sql`select 1 as ok`;
				databaseHealthy = true;
			} catch {
				databaseHealthy = false;
			}

			const healthy = databaseHealthy;

			res.status(healthy ? 200 : 503).json({
				success: healthy,
				healthy,
				message: healthy
					? "API service is healthy"
					: "API is running but the database is unreachable",
				details: {
					uptime: process.uptime(),
					memory: process.memoryUsage(),
					pid: process.pid,
					database: {
						provider: detectDatabaseProvider(config.databaseUrl),
						healthy: databaseHealthy,
					},
				},
			});
		}),
	);

	return router;
}
