import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import config from "@api/config";
import { errorHandler, globalRateLimiter, requestLogger } from "@api/middlewares";
import { createAuthRouter } from "@api/routers/auth";
import { createHealthRouter } from "@api/routers/health";
import { createUsersRouter } from "@api/routers/users";
import logger from "@api/utils/logger";

async function startServer() {
	const app = express();
	app.use(helmet());
	app.use(cors({ origin: config.corsOrigin, credentials: true }));
	app.set("trust proxy", 1);
	app.use(express.json({ limit: "10mb" }));
	app.use(express.urlencoded({ extended: true }));
	app.use(cookieParser());
	app.use(compression());
	app.use(globalRateLimiter);
	app.use(requestLogger);
	app.use(createHealthRouter());
	app.use("/auth", createAuthRouter());
	app.use("/users", createUsersRouter());
	app.use((req, res) => res.status(404).json({ error: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` }));
	app.use(errorHandler);
	app.listen(config.port, () => logger.info("API service started", { port: config.port }));
}

startServer().catch(() => process.exit(1));