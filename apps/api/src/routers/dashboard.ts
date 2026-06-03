import { Router } from "express";

import { generateDashboard } from "@api/db/queries/dashboard";
import { asyncHandler, requireAuth } from "@api/middlewares";

export function createDashboardRouter(): Router {
	const router = Router();

	router.get(
		"/",
		requireAuth,
		asyncHandler(async (req, res) => {
			const dashboard = await generateDashboard(req.userId!, req.userRole!);
			res.json({ dashboard });
		}),
	);

	return router;
}
