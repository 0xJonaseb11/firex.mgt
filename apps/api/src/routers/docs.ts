import { Router } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { openApiDocument } from "@api/openapi";


const swaggerCsp = helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			imgSrc: ["'self'", "data:"],
		},
	},
});

/**
 * Serves the OpenAPI spec at `/docs.json` and interactive Swagger UI at `/docs`.
 */
export const createDocsRouter = (): Router => {
	const router = Router();

	router.get("/docs.json", swaggerCsp, (_req, res) => {
		res.json(openApiDocument);
	});

	router.use(
		"/docs",
		swaggerCsp,
		swaggerUi.serve,
		swaggerUi.setup(openApiDocument, {
			customSiteTitle: "TZW FireEx API Docs",
		}),
	);

	return router;
};
