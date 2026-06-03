import { and, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";

import { db } from "@api/db";
import type { FireExtinguisher } from "@api/db/schema";
import { fireExtinguishers } from "@api/db/schema";

type ExtinguisherFilter = {
	status?: FireExtinguisher["status"];
	type?: FireExtinguisher["type"];
	location?: string;
	search?: string;
};

export async function createExtinguisher(
	data: typeof fireExtinguishers.$inferInsert,
): Promise<FireExtinguisher> {
	const [record] = await db.insert(fireExtinguishers).values(data).returning();
	if (!record) {
		throw new Error("Failed to create fire extinguisher");
	}
	return record;
}

export async function getExtinguisherById(
	id: string,
): Promise<FireExtinguisher | undefined> {
	const [record] = await db
		.select()
		.from(fireExtinguishers)
		.where(eq(fireExtinguishers.id, id))
		.limit(1);
	return record;
}

export type ExtinguisherBrief = Pick<
	FireExtinguisher,
	"id" | "serialNumber" | "location"
>;

export async function getExtinguishersByIds(
	ids: string[],
): Promise<Map<string, ExtinguisherBrief>> {
	const unique = [...new Set(ids.filter(Boolean))];
	if (unique.length === 0) {
		return new Map();
	}

	const rows = await db
		.select({
			id: fireExtinguishers.id,
			serialNumber: fireExtinguishers.serialNumber,
			location: fireExtinguishers.location,
		})
		.from(fireExtinguishers)
		.where(inArray(fireExtinguishers.id, unique));

	return new Map(rows.map((row) => [row.id, row]));
}

export async function getExtinguisherBySerial(
	serialNumber: string,
): Promise<FireExtinguisher | undefined> {
	const [record] = await db
		.select()
		.from(fireExtinguishers)
		.where(eq(fireExtinguishers.serialNumber, serialNumber))
		.limit(1);
	return record;
}

function buildFilterConditions(filter: ExtinguisherFilter) {
	const conditions = [];
	if (filter.status) {
		conditions.push(eq(fireExtinguishers.status, filter.status));
	}
	if (filter.type) {
		conditions.push(eq(fireExtinguishers.type, filter.type));
	}
	if (filter.location) {
		conditions.push(ilike(fireExtinguishers.location, `%${filter.location}%`));
	}
	if (filter.search) {
		conditions.push(
			or(
				ilike(fireExtinguishers.serialNumber, `%${filter.search}%`),
				ilike(fireExtinguishers.location, `%${filter.search}%`),
			),
		);
	}
	return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listExtinguishers(
	filter: ExtinguisherFilter = {},
	page = 1,
	limit = 20,
): Promise<{ items: FireExtinguisher[]; total: number }> {
	const where = buildFilterConditions(filter);
	const offset = (page - 1) * limit;

	const items = await db
		.select()
		.from(fireExtinguishers)
		.where(where)
		.orderBy(fireExtinguishers.createdAt)
		.limit(limit)
		.offset(offset);

	const countRow = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(fireExtinguishers)
		.where(where);

	return { items, total: countRow[0]?.count ?? 0 };
}

export async function updateExtinguisher(
	id: string,
	updates: Partial<
		Omit<typeof fireExtinguishers.$inferInsert, "id" | "createdBy">
	>,
): Promise<FireExtinguisher | undefined> {
	const [record] = await db
		.update(fireExtinguishers)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(fireExtinguishers.id, id))
		.returning();
	return record;
}

export async function deleteExtinguisher(id: string): Promise<boolean> {
	const result = await db
		.delete(fireExtinguishers)
		.where(eq(fireExtinguishers.id, id))
		.returning();
	return result.length > 0;
}

export async function markExpiredExtinguishers(): Promise<number> {
	const today = new Date().toISOString().slice(0, 10);
	const result = await db
		.update(fireExtinguishers)
		.set({ status: "expired", updatedAt: new Date() })
		.where(
			and(
				lte(fireExtinguishers.expiryDate, today),
				sql`${fireExtinguishers.status} != 'decommissioned'`,
			),
		)
		.returning();
	return result.length;
}

export async function countExtinguishersByStatus(): Promise<
	Record<string, number>
> {
	const rows = await db
		.select({
			status: fireExtinguishers.status,
			count: sql<number>`count(*)::int`,
		})
		.from(fireExtinguishers)
		.groupBy(fireExtinguishers.status);

	const result: Record<string, number> = {};
	for (const row of rows) {
		result[row.status] = row.count;
	}
	return result;
}

export async function countExtinguishersByType(): Promise<
	Record<string, number>
> {
	const rows = await db
		.select({
			type: fireExtinguishers.type,
			count: sql<number>`count(*)::int`,
		})
		.from(fireExtinguishers)
		.groupBy(fireExtinguishers.type);

	const result: Record<string, number> = {};
	for (const row of rows) {
		result[row.type] = row.count;
	}
	return result;
}

export async function countComplianceMetrics(): Promise<{
	expired: number;
	expiringWithin30Days: number;
	needsMaintenance: number;
}> {
	const today = new Date().toISOString().slice(0, 10);
	const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);

	const expiredRow = await db
		.select({ expired: sql<number>`count(*)::int` })
		.from(fireExtinguishers)
		.where(
			or(
				eq(fireExtinguishers.status, "expired"),
				lte(fireExtinguishers.expiryDate, today),
			),
		);

	const expiringRow = await db
		.select({ expiringWithin30Days: sql<number>`count(*)::int` })
		.from(fireExtinguishers)
		.where(
			and(
				gte(fireExtinguishers.expiryDate, today),
				lte(fireExtinguishers.expiryDate, in30Days),
				sql`${fireExtinguishers.status} != 'decommissioned'`,
			),
		);

	const maintenanceRow = await db
		.select({ needsMaintenance: sql<number>`count(*)::int` })
		.from(fireExtinguishers)
		.where(eq(fireExtinguishers.status, "needs_maintenance"));

	return {
		expired: expiredRow[0]?.expired ?? 0,
		expiringWithin30Days: expiringRow[0]?.expiringWithin30Days ?? 0,
		needsMaintenance: maintenanceRow[0]?.needsMaintenance ?? 0,
	};
}
