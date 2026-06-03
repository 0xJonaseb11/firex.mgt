import { Router } from "express";
import { idParamSchema, paginationSchema, updateUserRoleSchema } from "@repo/contracts";

import {
	deleteUser,
	getUserById,
	listInspectors,
	listUsers,
	updateUser,
} from "@api/db/queries";
import { ApiError } from "@api/lib/errors";
import { parseBody, parseParams, parseQuery } from "@api/lib/parse-body";
import { serializeUser } from "@api/lib/serializers";
import {
	asyncHandler,
	requireAuth,
	requireRole,
} from "@api/middlewares";

export function createUsersRouter(): Router {
	const router = Router();

	router.get(
		"/",
		requireAuth,
		requireRole("admin"),
		asyncHandler(async (req, res) => {
			const { page, limit } = parseQuery(paginationSchema, req.query);
			const users = await listUsers();
			const offset = (page - 1) * limit;
			const items = users.slice(offset, offset + limit);
			res.json({
				items: items.map(serializeUser),
				total: users.length,
				page,
				limit,
			});
		}),
	);

	router.get(
		"/inspectors",
		requireAuth,
		asyncHandler(async (_req, res) => {
			const inspectors = await listInspectors();
			res.json({
				items: inspectors.map((inspector) => ({
					id: inspector.id,
					firstName: inspector.firstName,
					lastName: inspector.lastName,
					role: inspector.role,
				})),
			});
		}),
	);

	router.get(
		"/:id",
		requireAuth,
		requireRole("admin"),
		asyncHandler(async (req, res) => {
			const { id } = parseParams(idParamSchema, req.params);
			const user = await getUserById(id);
			if (!user) {
				throw new ApiError({ code: "NOT_FOUND", message: "User not found" });
			}
			res.json({ user: serializeUser(user) });
		}),
	);

	router.patch(
		"/:id/role",
		requireAuth,
		requireRole("admin"),
		asyncHandler(async (req, res) => {
			const { id } = parseParams(idParamSchema, req.params);
			const body = parseBody(updateUserRoleSchema, req.body);
			const user = await updateUser(id, { role: body.role });
			if (!user) {
				throw new ApiError({ code: "NOT_FOUND", message: "User not found" });
			}
			res.json({ user: serializeUser(user) });
		}),
	);

	router.delete(
		"/:id",
		requireAuth,
		requireRole("admin"),
		asyncHandler(async (req, res) => {
			const { id } = parseParams(idParamSchema, req.params);
			if (id === req.userId) {
				throw new ApiError({
					code: "BAD_REQUEST",
					message: "You cannot delete your own account",
				});
			}
			const deleted = await deleteUser(id);
			if (!deleted) {
				throw new ApiError({ code: "NOT_FOUND", message: "User not found" });
			}
			res.json({ success: true });
		}),
	);

	return router;
}
