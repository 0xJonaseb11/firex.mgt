import { Router } from "express";
import {
	cancelInspectionSchema,
	completeInspectionSchema,
	idParamSchema,
	inspectionFilterSchema,
	paginationSchema,
	scheduleInspectionSchema,
} from "@repo/contracts";

import {
	createInspection,
	createNotification,
	getExtinguisherById,
	getInspectionById,
	getUserById,
	listInspectors,
	listInspections,
	updateInspection,
} from "@api/db/queries";
import { ApiError } from "@api/lib/errors";
import { parseBody, parseParams, parseQuery } from "@api/lib/parse-body";
import { serializeInspection } from "@api/lib/serializers";
import {
	asyncHandler,
	requireAuth,
	requireRole,
} from "@api/middlewares";
import { generateId } from "@api/utils/generate-id";

async function notifyInspectors(
	title: string,
	message: string,
	type: "inspection_scheduled" | "inspection_overdue" | "inspection_completed",
	relatedEntityId: string,
	assignedInspectorId?: string | null,
) {
	if (assignedInspectorId) {
		await createNotification({
			id: await generateId(),
			userId: assignedInspectorId,
			title,
			message,
			type,
			relatedEntityType: "inspection",
			relatedEntityId,
		});
		return;
	}

	for (const inspector of await listInspectors()) {
		await createNotification({
			id: await generateId(),
			userId: inspector.id,
			title,
			message,
			type,
			relatedEntityType: "inspection",
			relatedEntityId,
		});
	}
}

export function createInspectionsRouter(): Router {
	const router = Router();

	router.get(
		"/",
		requireAuth,
		asyncHandler(async (req, res) => {
			const pagination = parseQuery(paginationSchema, req.query);
			const filter = parseQuery(inspectionFilterSchema, req.query);

			if (req.userRole === "inspector") {
				filter.assignedInspectorId = req.userId;
			}

			const result = await listInspections(
				filter,
				pagination.page,
				pagination.limit,
			);
			res.json({
				items: result.items.map(serializeInspection),
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
			const inspection = await getInspectionById(id);
			if (!inspection) {
				throw new ApiError({
					code: "NOT_FOUND",
					message: "Inspection not found",
				});
			}
			res.json({ inspection: serializeInspection(inspection) });
		}),
	);

	router.post(
		"/",
		requireAuth,
		asyncHandler(async (req, res) => {
			const body = parseBody(scheduleInspectionSchema, req.body);
			const extinguisher = await getExtinguisherById(body.extinguisherId);
			if (!extinguisher) {
				throw new ApiError({
					code: "NOT_FOUND",
					message: "Fire extinguisher not found",
				});
			}

			if (body.assignedInspectorId) {
				const inspector = await getUserById(body.assignedInspectorId);
				if (
					!inspector ||
					(inspector.role !== "inspector" && inspector.role !== "admin")
				) {
					throw new ApiError({
						code: "BAD_REQUEST",
						message: "Assigned inspector is invalid",
					});
				}
			}

			const inspection = await createInspection({
				id: await generateId(),
				extinguisherId: body.extinguisherId,
				scheduledBy: req.userId!,
				assignedInspectorId: body.assignedInspectorId ?? null,
				scheduledDate: body.scheduledDate,
				scheduledTime: body.scheduledTime,
				notes: body.notes ?? null,
				status: "scheduled",
			});

			await notifyInspectors(
				"Inspection scheduled",
				`Inspection scheduled for ${extinguisher.serialNumber} on ${body.scheduledDate} at ${body.scheduledTime}`,
				"inspection_scheduled",
				inspection.id,
				body.assignedInspectorId,
			);

			res.status(201).json({ inspection: serializeInspection(inspection) });
		}),
	);

	router.post(
		"/:id/complete",
		requireAuth,
		requireRole("inspector", "admin"),
		asyncHandler(async (req, res) => {
			const { id } = parseParams(idParamSchema, req.params);
			const body = parseBody(completeInspectionSchema, req.body);
			const existing = await getInspectionById(id);
			if (!existing) {
				throw new ApiError({
					code: "NOT_FOUND",
					message: "Inspection not found",
				});
			}
			if (existing.status === "completed" || existing.status === "cancelled") {
				throw new ApiError({
					code: "BAD_REQUEST",
					message: "Inspection cannot be completed in its current state",
				});
			}

			const inspection = await updateInspection(id, {
				status: "completed",
				completedAt: new Date(),
				completedBy: req.userId!,
				notes: body.notes ?? existing.notes,
			});

			if (inspection) {
				const extinguisher = await getExtinguisherById(
					inspection.extinguisherId,
				);
				await createNotification({
					id: await generateId(),
					userId: inspection.scheduledBy,
					title: "Inspection completed",
					message: `Inspection for ${extinguisher?.serialNumber ?? "extinguisher"} was completed`,
					type: "inspection_completed",
					relatedEntityType: "inspection",
					relatedEntityId: inspection.id,
				});
			}

			res.json({
				inspection: inspection ? serializeInspection(inspection) : null,
			});
		}),
	);

	router.post(
		"/:id/cancel",
		requireAuth,
		asyncHandler(async (req, res) => {
			const { id } = parseParams(idParamSchema, req.params);
			const body = parseBody(cancelInspectionSchema, req.body);
			const existing = await getInspectionById(id);
			if (!existing) {
				throw new ApiError({
					code: "NOT_FOUND",
					message: "Inspection not found",
				});
			}

			const isOwner = existing.scheduledBy === req.userId;
			const isPrivileged =
				req.userRole === "admin" || req.userRole === "inspector";
			if (!isOwner && !isPrivileged) {
				throw new ApiError({ code: "FORBIDDEN" });
			}

			if (existing.status === "completed" || existing.status === "cancelled") {
				throw new ApiError({
					code: "BAD_REQUEST",
					message: "Inspection cannot be cancelled in its current state",
				});
			}

			const inspection = await updateInspection(id, {
				status: "cancelled",
				cancelReason: body.reason ?? null,
			});

			res.json({
				inspection: inspection ? serializeInspection(inspection) : null,
			});
		}),
	);

	return router;
}
