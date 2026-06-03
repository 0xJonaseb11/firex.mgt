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
	getExtinguisherById,
	getInspectionById,
	getUserById,
	listInspectors,
	listInspections,
	updateInspection,
} from "@api/db/queries";
import {
	notifyInspectionCancelled,
	notifyInspectionCompleted,
	notifyInspectionScheduled,
} from "@api/lib/email/notify-inspection";
import { ApiError } from "@api/lib/errors";
import { parseBody, parseParams, parseQuery } from "@api/lib/parse-body";
import { serializeInspection } from "@api/lib/serializers";
import {
	asyncHandler,
	requireAuth,
	requireRole,
	requireVerifiedEmail,
} from "@api/middlewares";
import { generateId } from "@api/utils/generate-id";

async function inspectorRecipientIds(
	assignedInspectorId?: string | null,
): Promise<string[]> {
	if (assignedInspectorId) {
		return [assignedInspectorId];
	}
	return (await listInspectors()).map((inspector) => inspector.id);
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
		requireVerifiedEmail,
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

			const inspectorIds = await inspectorRecipientIds(body.assignedInspectorId);
			await notifyInspectionScheduled(inspection, extinguisher, inspectorIds);

			res.status(201).json({ inspection: serializeInspection(inspection) });
		}),
	);

	router.post(
		"/:id/complete",
		requireAuth,
		requireVerifiedEmail,
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
				await notifyInspectionCompleted(inspection, extinguisher);
			}

			res.json({
				inspection: inspection ? serializeInspection(inspection) : null,
			});
		}),
	);

	router.post(
		"/:id/cancel",
		requireAuth,
		requireVerifiedEmail,
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

			if (inspection) {
				const extinguisher = await getExtinguisherById(
					inspection.extinguisherId,
				);
				const recipients = new Set<string>([inspection.scheduledBy]);
				if (inspection.assignedInspectorId) {
					recipients.add(inspection.assignedInspectorId);
				}
				await notifyInspectionCancelled(
					inspection,
					extinguisher,
					[...recipients],
				);
			}

			res.json({
				inspection: inspection ? serializeInspection(inspection) : null,
			});
		}),
	);

	return router;
}
