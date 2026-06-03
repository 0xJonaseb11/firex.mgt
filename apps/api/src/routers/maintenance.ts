import { Router } from "express";
import {
	createMaintenanceSchema,
	idParamSchema,
	maintenanceFilterSchema,
	paginationSchema,
} from "@repo/contracts";

import {
	createMaintenanceLog,
	createNotification,
	getExtinguisherById,
	getMaintenanceLogById,
	listMaintenanceLogs,
	updateExtinguisher,
} from "@api/db/queries";
import { ApiError } from "@api/lib/errors";
import { parseBody, parseParams, parseQuery } from "@api/lib/parse-body";
import { serializeMaintenance } from "@api/lib/serializers";
import {
	asyncHandler,
	requireAuth,
	requireRole,
} from "@api/middlewares";
import { generateId } from "@api/utils/generate-id";

export function createMaintenanceRouter(): Router {
	const router = Router();

	router.get(
		"/",
		requireAuth,
		asyncHandler(async (req, res) => {
			const pagination = parseQuery(paginationSchema, req.query);
			const filter = parseQuery(maintenanceFilterSchema, req.query);
			const result = await listMaintenanceLogs(
				filter,
				pagination.page,
				pagination.limit,
			);
			res.json({
				items: result.items.map(serializeMaintenance),
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
			const log = await getMaintenanceLogById(id);
			if (!log) {
				throw new ApiError({
					code: "NOT_FOUND",
					message: "Maintenance log not found",
				});
			}
			res.json({ maintenance: serializeMaintenance(log) });
		}),
	);

	router.post(
		"/",
		requireAuth,
		requireRole("inspector", "admin"),
		asyncHandler(async (req, res) => {
			const body = parseBody(createMaintenanceSchema, req.body);
			const extinguisher = await getExtinguisherById(body.extinguisherId);
			if (!extinguisher) {
				throw new ApiError({
					code: "NOT_FOUND",
					message: "Fire extinguisher not found",
				});
			}

			const log = await createMaintenanceLog({
				id: await generateId(),
				extinguisherId: body.extinguisherId,
				performedBy: req.userId!,
				actionTaken: body.actionTaken,
				maintenanceDate: body.maintenanceDate,
				issuesIdentified: body.issuesIdentified ?? null,
				notes: body.notes ?? null,
			});

			if (body.issuesIdentified) {
				await updateExtinguisher(body.extinguisherId, {
					status: "needs_maintenance",
				});
			}

			await createNotification({
				id: await generateId(),
				userId: extinguisher.createdBy,
				title: "Maintenance logged",
				message: `Maintenance was logged for ${extinguisher.serialNumber}`,
				type: "maintenance_logged",
				relatedEntityType: "maintenance",
				relatedEntityId: log.id,
			});

			res.status(201).json({ maintenance: serializeMaintenance(log) });
		}),
	);

	return router;
}
