import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@api/db";
import type { MaintenanceLog } from "@api/db/schema";
import { maintenanceLogs } from "@api/db/schema";

type MaintenanceFilter = {
	extinguisherId?: string;
	performedBy?: string;
	fromDate?: string;
	toDate?: string;
};

export async function createMaintenanceLog(
	data: typeof maintenanceLogs.$inferInsert,
): Promise<MaintenanceLog> {
	const [record] = await db.insert(maintenanceLogs).values(data).returning();
	if (!record) {
		throw new Error("Failed to create maintenance log");
	}
	return record;
}

export async function getMaintenanceLogById(
	id: string,
): Promise<MaintenanceLog | undefined> {
	const [record] = await db
		.select()
		.from(maintenanceLogs)
		.where(eq(maintenanceLogs.id, id))
		.limit(1);
	return record;
}

function buildFilterConditions(filter: MaintenanceFilter) {
	const conditions = [];
	if (filter.extinguisherId) {
		conditions.push(eq(maintenanceLogs.extinguisherId, filter.extinguisherId));
	}
	if (filter.performedBy) {
		conditions.push(eq(maintenanceLogs.performedBy, filter.performedBy));
	}
	if (filter.fromDate) {
		conditions.push(gte(maintenanceLogs.maintenanceDate, filter.fromDate));
	}
	if (filter.toDate) {
		conditions.push(lte(maintenanceLogs.maintenanceDate, filter.toDate));
	}
	return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listMaintenanceLogs(
	filter: MaintenanceFilter = {},
	page = 1,
	limit = 20,
): Promise<{ items: MaintenanceLog[]; total: number }> {
	const where = buildFilterConditions(filter);
	const offset = (page - 1) * limit;

	const items = await db
		.select()
		.from(maintenanceLogs)
		.where(where)
		.orderBy(maintenanceLogs.maintenanceDate)
		.limit(limit)
		.offset(offset);

	const countRow = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(maintenanceLogs)
		.where(where);

	return { items, total: countRow[0]?.count ?? 0 };
}

export async function countMaintenanceLogs(): Promise<{
	total: number;
	last30Days: number;
}> {
	const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);

	const totalRow = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(maintenanceLogs);

	const last30Row = await db
		.select({ last30Days: sql<number>`count(*)::int` })
		.from(maintenanceLogs)
		.where(gte(maintenanceLogs.maintenanceDate, since));

	return {
		total: totalRow[0]?.total ?? 0,
		last30Days: last30Row[0]?.last30Days ?? 0,
	};
}
