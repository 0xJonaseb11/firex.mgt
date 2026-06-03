$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$finalIndex = Get-Content "apps/api/src/index.ts" -Raw
$finalMiddlewaresIndex = Get-Content "apps/api/src/middlewares/index.ts" -Raw
$finalMain = Get-Content "apps/web/src/main.tsx" -Raw

function Set-ApiIndex { param([string]$Content) Set-Content "apps/api/src/index.ts" $Content -NoNewline }
function Set-MiddlewaresIndex { param([string]$Content) Set-Content "apps/api/src/middlewares/index.ts" $Content -NoNewline }
function Set-WebMain { param([string]$Content) Set-Content "apps/web/src/main.tsx" $Content -NoNewline }

function Commit {
	param([string]$Message, [string[]]$Paths)
	if ($Paths.Count -gt 0) { git add @Paths }
	else { git add -A }
	git commit -m $Message
}

$index1 = @'
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
'@

$index3 = $index1 -replace 'import \{ requestLogger \}', 'import { errorHandler, requestLogger }' -replace 'app\.use\(\(req', "app.use(errorHandler);`n`t`tapp.use((req"

$index4 = @'
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
'@

$index5 = $index4 -replace 'import config', "import { createDocsRouter } from `"@api/routers/docs`";`nimport config" -replace 'const app = express', "const app = express();`n`tapp.use(createDocsRouter());`n`tconst appUnused = express"

# fix index5 - bad replace. Do properly:
$index5 = @'
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import config from "@api/config";
import { errorHandler, globalRateLimiter, requestLogger } from "@api/middlewares";
import { createAuthRouter } from "@api/routers/auth";
import { createDocsRouter } from "@api/routers/docs";
import { createHealthRouter } from "@api/routers/health";
import { createUsersRouter } from "@api/routers/users";
import logger from "@api/utils/logger";

async function startServer() {
	const app = express();
	app.use(createDocsRouter());
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
'@

$webMain1 = @'
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@web/styles/app.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<p>FEX platform</p>
	</StrictMode>,
);
'@

Set-ApiIndex $index1
Set-MiddlewaresIndex "export * from `"./async-handler`";`nexport * from `"./request-logger`";`n"
Set-WebMain $webMain1

Commit "initial commit" @(
	".gitignore", ".githooks", ".npmrc", ".vscode", "biome.jsonc", "turbo.json",
	"package.json", "AGENT.md", "scripts/setup-git-hooks.ps1", "scripts/setup-git-hooks.sh",
	"packages/tsconfig", "packages/eslint-config",
	"apps/api/package.json", "apps/api/tsconfig.json", "apps/api/eslint.config.mjs",
	"apps/api/.env.example", "apps/api/drizzle.config.ts",
	"apps/api/src/config.ts", "apps/api/src/express.d.ts", "apps/api/src/types.ts",
	"apps/api/src/index.ts", "apps/api/src/utils/logger.ts", "apps/api/src/utils/generate-id.ts",
	"apps/api/src/middlewares/async-handler.ts", "apps/api/src/middlewares/index.ts",
	"apps/api/src/middlewares/request-logger.ts", "apps/api/src/routers/health.ts",
	"apps/web/package.json", "apps/web/tsconfig.json", "apps/web/tsconfig.app.json",
	"apps/web/tsconfig.node.json", "apps/web/eslint.config.mjs", "apps/web/.env.example",
	"apps/web/index.html", "apps/web/vite.config.ts", "apps/web/public",
	"apps/web/src/main.tsx", "apps/web/src/styles", "apps/web/src/vite-env.d.ts"
)

Commit "feat: setup database" @(
	"apps/api/migrations/0000_users.sql",
	"apps/api/migrations/meta/_journal.json",
	"apps/api/src/db/index.ts",
	"apps/api/src/db/schema.ts",
	"apps/api/src/db/queries/index.ts",
	"apps/api/src/db/queries/users.ts"
)

Set-MiddlewaresIndex "export * from `"./async-handler`";`nexport * from `"./error-handler`";`nexport * from `"./request-logger`";`n"
Set-ApiIndex $index3
Commit "feat: error codes" @(
	"apps/api/src/lib/constants.ts", "apps/api/src/lib/errors.ts",
	"apps/api/src/middlewares/error-handler.ts", "apps/api/src/middlewares/index.ts",
	"apps/api/src/index.ts"
)

Set-MiddlewaresIndex $finalMiddlewaresIndex
Set-ApiIndex $index4
Commit "feat: auth roles, auth routes and rate-limiting" @(
	"apps/api/src/lib/password.ts", "apps/api/src/middlewares/auth.ts",
	"apps/api/src/middlewares/rate-limit.ts", "apps/api/src/middlewares/index.ts",
	"apps/api/src/routers/auth.ts", "apps/api/src/routers/users.ts",
	"apps/api/src/schemas", "apps/api/src/utils/create-auth-tokens.ts",
	"apps/api/src/utils/sanitize-user.ts", "apps/api/src/db/queries/password-reset.ts",
	"apps/api/src/index.ts"
)

Set-ApiIndex $index5
Commit "feat: openapi and swagger setup" @(
	"apps/api/src/openapi.ts", "apps/api/src/routers/docs.ts", "apps/api/src/index.ts"
)

Commit "[chore]: npm only lockfile support" @("package-lock.json")

Commit "[init]: schema setup + scaffold" @(
	"apps/api/migrations/0001_fire_extinguishers.sql",
	"apps/api/migrations/0002_inspections_maintenance_notifications.sql",
	"apps/api/migrations/meta/_journal.json",
	"apps/api/src/db/queries/extinguishers.ts"
)

Set-ApiIndex $finalIndex
Set-WebMain $finalMain
Commit "[update]: api + contracts" @()

Write-Host (git log --oneline)
