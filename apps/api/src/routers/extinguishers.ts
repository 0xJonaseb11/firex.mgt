import { Router } from "express";
import {
	createExtinguisherSchema,
	extinguisherFilterSchema,
	idParamSchema,
	paginationSchema,
	updateExtinguisherSchema,
} from "@repo/contracts";

import {
	createExtinguisher,
	deleteExtinguisher,
	getExtinguisherById,
	getExtinguisherBySerial,
	listExtinguishers,
	markExpiredExtinguishers,
	updateExtinguisher,
} from "@api/db/queries";
import { ApiError } from "@api/lib/errors";
import { parseBody, parseParams, parseQuery } from "@api/lib/parse-body";
import { serializeExtinguisher } from "@api/lib/serializers";
import {
	asyncHandler,
	requireAuth,
	requireRole,
	requireVerifiedEmail,
} from "@api/middlewares";
import { generateId } from "@api/utils/generate-id";

export function createExtinguishersRouter(): Router {
	const router = Router();

	router.get(
		"/",
		requireAuth,
		asyncHandler(async (req, res) => {
			await markExpiredExtinguishers();
			const pagination = parseQuery(paginationSchema, req.query);
			const filter = parseQuery(extinguisherFilterSchema, req.query);
			const result = await listExtinguishers(
				filter,
				pagination.page,
				pagination.limit,
			);
			res.json({
				items: result.items.map(serializeExtinguisher),
				total: result.total,
				page: pagination.page,
				limit: pagination.limit,
			});
		}),
	);

	router.get(
		"/:id",
		requireAuth,
		asyncHandler(async (req, res) => {
			const { id } = parseParams(idParamSchema, req.params);
			const record = await getExtinguisherById(id);
			if (!record) {
				throw new ApiError({
					code: "NOT_FOUND",
					message: "Fire extinguisher not found",
				});
			}
			res.json({ extinguisher: serializeExtinguisher(record) });
		}),
	);

	router.post(
		"/",
		requireAuth,
		requireVerifiedEmail,
		requireRole("admin", "inspector"),
		asyncHandler(async (req, res) => {
			const body = parseBody(createExtinguisherSchema, req.body);
			if (await getExtinguisherBySerial(body.serialNumber)) {
				throw new ApiError({
					code: "CONFLICT",
					message: "A fire extinguisher with this serial number already exists",
				});
			}

			const record = await createExtinguisher({
				id: await generateId(),
				serialNumber: body.serialNumber,
				location: body.location,
				type: body.type,
				size: body.size,
				installationDate: body.installationDate,
				expiryDate: body.expiryDate,
				status: body.status,
				createdBy: req.userId!,
			});

			res.status(201).json({ extinguisher: serializeExtinguisher(record) });
		}),
	);

	router.patch(
		"/:id",
		requireAuth,
		requireVerifiedEmail,
		requireRole("admin", "inspector"),
		asyncHandler(async (req, res) => {
			const { id } = parseParams(idParamSchema, req.params);
			const body = parseBody(updateExtinguisherSchema, req.body);

			if (body.serialNumber) {
				const existing = await getExtinguisherBySerial(body.serialNumber);
				if (existing && existing.id !== id) {
					throw new ApiError({
						code: "CONFLICT",
						message:
							"A fire extinguisher with this serial number already exists",
					});
				}
			}

			const record = await updateExtinguisher(id, body);
			if (!record) {
				throw new ApiError({
					code: "NOT_FOUND",
					message: "Fire extinguisher not found",
				});
			}
			res.json({ extinguisher: serializeExtinguisher(record) });
		}),
	);

	router.delete(
		"/:id",
		requireAuth,
		requireVerifiedEmail,
		requireRole("admin"),
		asyncHandler(async (req, res) => {
			const { id } = parseParams(idParamSchema, req.params);
			const deleted = await deleteExtinguisher(id);
			if (!deleted) {
				throw new ApiError({
					code: "NOT_FOUND",
					message: "Fire extinguisher not found",
				});
			}
			res.json({ success: true });
		}),
	);

	return router;
}
