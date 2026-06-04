import { Router } from "express";
import {
	cancelInspectionSchema,
	completeInspectionSchema,
	idParamSchema,
	inspectionFilterSchema,
	paginationSchema,
	scheduleInspectionSchema,
} from "@tzw-firex/contracts";

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
import {
	enrichInspection,
	enrichInspections,
} from "@api/lib/record-enrichment";
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

			const result = await listInspections(
				{
					...filter,
					...(req.userRole === "inspector"
						? { forInspectorUserId: req.userId! }
						: {}),
					...(req.userRole === "user"
						? { scheduledByUserId: req.userId! }
						: {}),
				},
				pagination.page,
				pagination.limit,
			);
			res.json({
				items: await enrichInspections(result.items),
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
			res.json({ inspection: await enrichInspection(inspection) });
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

			const canAssignInspector =
				req.userRole === "admin" || req.userRole === "inspector";

			if (body.assignedInspectorId && !canAssignInspector) {
				throw new ApiError({
					code: "FORBIDDEN",
					message:
						"Only inspectors and administrators can assign inspections to staff. Your request will be visible to the inspector team.",
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
				assignedInspectorId: canAssignInspector
					? (body.assignedInspectorId ?? null)
					: null,
				scheduledDate: body.scheduledDate,
				scheduledTime: body.scheduledTime,
				notes: body.notes ?? null,
				status: "scheduled",
			});

			const inspectorIds = await inspectorRecipientIds(body.assignedInspectorId);
			await notifyInspectionScheduled(inspection, extinguisher, inspectorIds);

			res.status(201).json({ inspection: await enrichInspection(inspection) });
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
				inspection: inspection ? await enrichInspection(inspection) : null,
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
				inspection: inspection ? await enrichInspection(inspection) : null,
			});
		}),
	);

	return router;
}
