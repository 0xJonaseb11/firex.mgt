import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import config from "@api/config";
import { sql } from "@api/db";
import {
	detectDatabaseProvider,
	verifyDatabaseConnection,
} from "@api/lib/database";
import {
	errorHandler,
	globalRateLimiter,
	requestLogger,
} from "@api/middlewares";
import { createAuthRouter } from "@api/routers/auth";
import { createDocsRouter } from "@api/routers/docs";
import { createExtinguishersRouter } from "@api/routers/extinguishers";
import { createHealthRouter } from "@api/routers/health";
import { createInspectionsRouter } from "@api/routers/inspections";
import { createMaintenanceRouter } from "@api/routers/maintenance";
import { createNotificationsRouter } from "@api/routers/notifications";
import { createReportsRouter } from "@api/routers/reports";
import { createUsersRouter } from "@api/routers/users";
import logger from "@api/utils/logger";

async function startServer() {
	try {
		const databaseProvider = detectDatabaseProvider(config.databaseUrl);
		await verifyDatabaseConnection(sql);
		logger.info("Database connected", { provider: databaseProvider });

		const app = express();

		app.use(createDocsRouter());
		app.use(helmet());
		app.use(
			cors({
				origin: config.corsOrigin,
				credentials: true,
			}),
		);
		app.set("trust proxy", 1);
		app.use(express.json({ limit: "10mb" }));
		app.use(express.urlencoded({ extended: true }));
		app.use(cookieParser());
		app.use(compression());
		app.use(globalRateLimiter);
		app.use(requestLogger);

		app.use(createHealthRouter());

		const api = express.Router();
		api.use("/auth", createAuthRouter());
		api.use("/users", createUsersRouter());
		api.use("/extinguishers", createExtinguishersRouter());
		api.use("/inspections", createInspectionsRouter());
		api.use("/maintenance", createMaintenanceRouter());
		api.use("/notifications", createNotificationsRouter());
		api.use("/reports", createReportsRouter());
		app.use("/api", api);

		app.use((req, res) => {
			res.status(404).json({
				error: "NOT_FOUND",
				message: `Route ${req.method} ${req.path} not found`,
			});
		});

		app.use(errorHandler);

		const server = app.listen(config.port, () => {
			logger.info("API service started", {
				port: config.port,
				environment: config.nodeEnv,
			});
		});

		server.on("error", (err: Error) => {
			logger.error("Server startup error", {
				error: err.message,
				stack: err.stack,
				port: config.port,
			});
			process.exit(1);
		});

		const shutdown = async (signal: string) => {
			logger.info(`Received ${signal}, starting graceful shutdown...`);
			server.close(() => {
				logger.info("HTTP server closed");
				process.exit(0);
			});
			setTimeout(() => {
				logger.error("Forced shutdown after timeout");
				process.exit(1);
			}, 10000);
		};

		process.on("SIGTERM", () => shutdown("SIGTERM"));
		process.on("SIGINT", () => shutdown("SIGINT"));
		process.on("uncaughtException", (error) => {
			logger.error("Uncaught exception", { error });
			process.exit(1);
		});
		process.on("unhandledRejection", (reason, promise) => {
			logger.error("Unhandled rejection", { reason, promise });
			process.exit(1);
		});

		return server;
	} catch (initError) {
		logger.error("Server initialization failed", {
			error:
				initError instanceof Error ? initError.message : String(initError),
			stack:
				initError instanceof Error ? initError.stack : "No stack trace",
		});
		throw initError;
	}
}

startServer().catch((error) => {
	logger.error("Failed to start server", { error });
	process.exit(1);
});
