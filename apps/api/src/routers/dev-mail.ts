import { Router } from "express";

import config from "@api/config";
import { listDevMail } from "@api/lib/email/dev-outbox";
import { asyncHandler, requireAuth, requireRole } from "@api/middlewares";

/** Development-only sent-mail viewer for demos (no real inbox needed). */
export function createDevMailRouter(): Router {
	const router = Router();

	router.get(
		"/",
		requireAuth,
		requireRole("admin"),
		asyncHandler(async (_req, res) => {
			if (!config.isDevelopment) {
				res.status(404).json({ error: "NOT_FOUND" });
				return;
			}
			res.json({ items: listDevMail() });
		}),
	);

	return router;
}
