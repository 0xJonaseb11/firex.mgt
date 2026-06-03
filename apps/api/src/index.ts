import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import config from "@api/config";
import { requestLogger } from "@api/middlewares";
import { createHealthRouter } from "@api/routers/health";
import logger from "@api/utils/logger";

async function startServer() {
	try {
		const app = express();
		app.use(helmet());
		app.use(cors({ origin: config.corsOrigin, credentials: true }));
		app.set("trust proxy", 1);
		app.use(express.json({ limit: "10mb" }));
		app.use(express.urlencoded({ extended: true }));
		app.use(cookieParser());
		app.use(compression());
		app.use(requestLogger);
		app.use(createHealthRouter());
		app.use((req, res) => {
			res.status(404).json({ error: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` });
		});
		const server = app.listen(config.port, () => {
			logger.info("API service started", { port: config.port, environment: config.nodeEnv });
		});
		process.on("SIGTERM", () => server.close(() => process.exit(0)));
		process.on("SIGINT", () => server.close(() => process.exit(0)));
		return server;
	} catch (error) {
		logger.error("Server initialization failed", { error });
		throw error;
	}
}

startServer().catch(() => process.exit(1));