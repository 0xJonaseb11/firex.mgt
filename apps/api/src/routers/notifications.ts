import { Router } from "express";
import { idParamSchema, paginationSchema } from "@repo/contracts";
import { z } from "zod";

import {
	getUnreadCount,
	listNotificationsForUser,
	markAllNotificationsRead,
	markNotificationRead,
} from "@api/db/queries";
import { ApiError } from "@api/lib/errors";
import { parseParams, parseQuery } from "@api/lib/parse-body";
import { serializeNotification } from "@api/lib/serializers";
import { asyncHandler, requireAuth } from "@api/middlewares";

const notificationQuerySchema = paginationSchema.extend({
	unreadOnly: z
		.enum(["true", "false"])
		.optional()
		.transform((value) => value === "true"),
});

export function createNotificationsRouter(): Router {
	const router = Router();

	router.get(
		"/",
		requireAuth,
		asyncHandler(async (req, res) => {
			const query = parseQuery(notificationQuerySchema, req.query);
			const result = await listNotificationsForUser(
				req.userId!,
				query.page,
				query.limit,
				query.unreadOnly,
			);
			const unreadCount = await getUnreadCount(req.userId!);
			res.json({
				items: result.items.map(serializeNotification),
				total: result.total,
				unreadCount,
				page: query.page,
				limit: query.limit,
			});
		}),
	);

	router.patch(
		"/:id/read",
		requireAuth,
		asyncHandler(async (req, res) => {
			const { id } = parseParams(idParamSchema, req.params);
			const notification = await markNotificationRead(id, req.userId!);
			if (!notification) {
				throw new ApiError({
					code: "NOT_FOUND",
					message: "Notification not found",
				});
			}
			res.json({ notification: serializeNotification(notification) });
		}),
	);

	router.post(
		"/read-all",
		requireAuth,
		asyncHandler(async (req, res) => {
			const count = await markAllNotificationsRead(req.userId!);
			res.json({ success: true, updated: count });
		}),
	);

	return router;
}
