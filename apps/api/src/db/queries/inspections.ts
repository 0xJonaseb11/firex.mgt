import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "@api/db";
import type { Inspection } from "@api/db/schema";
import { inspections } from "@api/db/schema";
import { getExtinguisherById } from "@api/db/queries/extinguishers.js";
import { notifyInspectionOverdue } from "@api/lib/email/notify-inspection";
import { listInspectors } from "@api/db/queries/users.js";
import { OVERDUE_GRACE_HOURS } from "@api/lib/constants";

type InspectionFilter = {
	status?: Inspection["status"];
	extinguisherId?: string;
	assignedInspectorId?: string;
	/** Inspector sees assigned jobs plus unassigned pool */
	forInspectorUserId?: string;
	/** Regular users see inspections they scheduled */
	scheduledByUserId?: string;
	fromDate?: string;
	toDate?: string;
};

export async function createInspection(
	data: typeof inspections.$inferInsert,
): Promise<Inspection> {
	const [record] = await db.insert(inspections).values(data).returning();
	if (!record) {
		throw new Error("Failed to create inspection");
	}
	return record;
}

export async function getInspectionById(
	id: string,
): Promise<Inspection | undefined> {
	const [record] = await db
		.select()
		.from(inspections)
		.where(eq(inspections.id, id))
		.limit(1);
	return record;
}

function buildFilterConditions(filter: InspectionFilter) {
	const conditions = [];
	if (filter.status) {
		conditions.push(eq(inspections.status, filter.status));
	}
	if (filter.extinguisherId) {
		conditions.push(eq(inspections.extinguisherId, filter.extinguisherId));
	}
	if (filter.assignedInspectorId) {
		conditions.push(
			eq(inspections.assignedInspectorId, filter.assignedInspectorId),
		);
	}
	if (filter.forInspectorUserId) {
		conditions.push(
			or(
				eq(inspections.assignedInspectorId, filter.forInspectorUserId),
				isNull(inspections.assignedInspectorId),
			)!,
		);
	}
	if (filter.scheduledByUserId) {
		conditions.push(eq(inspections.scheduledBy, filter.scheduledByUserId));
	}
	if (filter.fromDate) {
		conditions.push(gte(inspections.scheduledDate, filter.fromDate));
	}
	if (filter.toDate) {
		conditions.push(lte(inspections.scheduledDate, filter.toDate));
	}
	return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listInspections(
	filter: InspectionFilter = {},
	page = 1,
	limit = 20,
): Promise<{ items: Inspection[]; total: number }> {
	await markOverdueInspections();

	const where = buildFilterConditions(filter);
	const offset = (page - 1) * limit;

	const items = await db
		.select()
		.from(inspections)
		.where(where)
		.orderBy(inspections.scheduledDate)
		.limit(limit)
		.offset(offset);

	const countRow = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(inspections)
		.where(where);

	return { items, total: countRow[0]?.count ?? 0 };
}

export async function updateInspection(
	id: string,
	updates: Partial<
		Omit<
			typeof inspections.$inferInsert,
			"id" | "extinguisherId" | "scheduledBy"
		>
	>,
): Promise<Inspection | undefined> {
	const [record] = await db
		.update(inspections)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(inspections.id, id))
		.returning();
	return record;
}

export async function markOverdueInspections(): Promise<number> {
	const cutoff = new Date(Date.now() - OVERDUE_GRACE_HOURS * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);

	const pending = await db
		.select()
		.from(inspections)
		.where(
			and(
				eq(inspections.status, "scheduled"),
				lte(inspections.scheduledDate, cutoff),
			),
		);

	if (pending.length === 0) {
		return 0;
	}

	const result = await db
		.update(inspections)
		.set({ status: "overdue", updatedAt: new Date() })
		.where(
			and(
				eq(inspections.status, "scheduled"),
				lte(inspections.scheduledDate, cutoff),
			),
		)
		.returning();

	for (const inspection of result) {
		const extinguisher = await getExtinguisherById(inspection.extinguisherId);
		const inspectorIds = inspection.assignedInspectorId
			? [inspection.assignedInspectorId]
			: (await listInspectors()).map((inspector) => inspector.id);
		await notifyInspectionOverdue(inspection, extinguisher, inspectorIds);
	}

	return result.length;
}

export async function countInspectionsByStatus(): Promise<
	Record<string, number>
> {
	await markOverdueInspections();

	const rows = await db
		.select({
			status: inspections.status,
			count: sql<number>`count(*)::int`,
		})
		.from(inspections)
		.groupBy(inspections.status);

	const result: Record<string, number> = {
		scheduled: 0,
		completed: 0,
		cancelled: 0,
		overdue: 0,
	};
	for (const row of rows) {
		result[row.status] = row.count;
	}
	return result;
}
