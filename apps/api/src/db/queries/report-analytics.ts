import { and, asc, gte, lte, ne, sql } from "drizzle-orm";

import { db } from "@api/db";
import { fireExtinguishers, maintenanceLogs } from "@api/db/schema";

export type ReportPeriodFilter = {
	fromDate?: string;
	toDate?: string;
};

export type PeriodCount = { period: string; count: number };

export type UpcomingExpiration = {
	serialNumber: string;
	location: string;
	expiryDate: string;
	status: string;
	daysUntilExpiry: number;
};

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
	return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);
}

function resolveRange(
	filter: ReportPeriodFilter | undefined,
	defaultDays: number,
): { from: string; to: string } {
	return {
		from: filter?.fromDate ?? daysAgoIso(defaultDays),
		to: filter?.toDate ?? todayIso(),
	};
}

function createdAtInRange(from: string, to: string) {
	return and(
		gte(fireExtinguishers.createdAt, sql`${from}::date`),
		lte(
			fireExtinguishers.createdAt,
			sql`(${to}::date + interval '1 day')`,
		),
	);
}

async function registrationsByDay(
	from: string,
	to: string,
): Promise<PeriodCount[]> {
	const rows = await db
		.select({
			period: sql<string>`to_char(date_trunc('day', ${fireExtinguishers.createdAt}), 'YYYY-MM-DD')`,
			count: sql<number>`count(*)::int`,
		})
		.from(fireExtinguishers)
		.where(createdAtInRange(from, to))
		.groupBy(sql`date_trunc('day', ${fireExtinguishers.createdAt})`)
		.orderBy(asc(sql`date_trunc('day', ${fireExtinguishers.createdAt})`));
	return rows;
}

async function registrationsByMonth(
	from: string,
	to: string,
): Promise<PeriodCount[]> {
	const rows = await db
		.select({
			period: sql<string>`to_char(date_trunc('month', ${fireExtinguishers.createdAt}), 'YYYY-MM')`,
			count: sql<number>`count(*)::int`,
		})
		.from(fireExtinguishers)
		.where(createdAtInRange(from, to))
		.groupBy(sql`date_trunc('month', ${fireExtinguishers.createdAt})`)
		.orderBy(asc(sql`date_trunc('month', ${fireExtinguishers.createdAt})`));
	return rows;
}

async function registrationsByYear(
	from: string,
	to: string,
): Promise<PeriodCount[]> {
	const rows = await db
		.select({
			period: sql<string>`to_char(date_trunc('year', ${fireExtinguishers.createdAt}), 'YYYY')`,
			count: sql<number>`count(*)::int`,
		})
		.from(fireExtinguishers)
		.where(createdAtInRange(from, to))
		.groupBy(sql`date_trunc('year', ${fireExtinguishers.createdAt})`)
		.orderBy(asc(sql`date_trunc('year', ${fireExtinguishers.createdAt})`));
	return rows;
}

export async function inventoryRegistrationSummaries(
	filter?: ReportPeriodFilter,
): Promise<{
	daily: PeriodCount[];
	monthly: PeriodCount[];
	yearly: PeriodCount[];
	registeredToday: number;
	registeredInRange: number;
}> {
	const dailyRange = resolveRange(filter, 30);
	const monthlyRange = resolveRange(filter, 365);
	const yearlyRange = resolveRange(filter, 365 * 5);

	const [daily, monthly, yearly, todayRow, rangeRow] = await Promise.all([
		registrationsByDay(dailyRange.from, dailyRange.to),
		registrationsByMonth(monthlyRange.from, monthlyRange.to),
		registrationsByYear(yearlyRange.from, yearlyRange.to),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(fireExtinguishers)
			.where(
				gte(
					fireExtinguishers.createdAt,
					sql`${todayIso()}::date`,
				),
			),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(fireExtinguishers)
			.where(createdAtInRange(dailyRange.from, dailyRange.to)),
	]);

	return {
		daily,
		monthly,
		yearly,
		registeredToday: todayRow[0]?.count ?? 0,
		registeredInRange: rangeRow[0]?.count ?? 0,
	};
}

export async function listUpcomingExpirations(
	limit = 10,
): Promise<UpcomingExpiration[]> {
	const today = todayIso();
	const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);

	const rows = await db
		.select({
			serialNumber: fireExtinguishers.serialNumber,
			location: fireExtinguishers.location,
			expiryDate: fireExtinguishers.expiryDate,
			status: fireExtinguishers.status,
		})
		.from(fireExtinguishers)
		.where(
			and(
				gte(fireExtinguishers.expiryDate, today),
				lte(fireExtinguishers.expiryDate, in60Days),
				ne(fireExtinguishers.status, "decommissioned"),
			),
		)
		.orderBy(asc(fireExtinguishers.expiryDate))
		.limit(limit);

	const todayMs = new Date(`${today}T00:00:00Z`).getTime();

	return rows.map((row) => {
		const expiryMs = new Date(`${row.expiryDate}T00:00:00Z`).getTime();
		const daysUntilExpiry = Math.round(
			(expiryMs - todayMs) / (24 * 60 * 60 * 1000),
		);
		return {
			serialNumber: row.serialNumber,
			location: row.location,
			expiryDate: row.expiryDate,
			status: row.status,
			daysUntilExpiry,
		};
	});
}

export async function maintenanceActivitySummaries(
	filter?: ReportPeriodFilter,
): Promise<{
	logsByMonth: PeriodCount[];
	recentActivities: number;
	distinctExtinguishersServiced: number;
	averageLogsPerExtinguisher: number;
}> {
	const range = resolveRange(filter, 365);
	const from = range.from;
	const to = range.to;

	const dateCondition = and(
		gte(maintenanceLogs.maintenanceDate, from),
		lte(maintenanceLogs.maintenanceDate, to),
	);

	const [byMonth, recentRow, distinctRow] = await Promise.all([
		db
			.select({
				period: sql<string>`to_char(date_trunc('month', ${maintenanceLogs.maintenanceDate}::timestamp), 'YYYY-MM')`,
				count: sql<number>`count(*)::int`,
			})
			.from(maintenanceLogs)
			.where(dateCondition)
			.groupBy(sql`date_trunc('month', ${maintenanceLogs.maintenanceDate}::timestamp)`)
			.orderBy(
				asc(
					sql`date_trunc('month', ${maintenanceLogs.maintenanceDate}::timestamp)`,
				),
			),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(maintenanceLogs)
			.where(dateCondition),
		db
			.select({
				count: sql<number>`count(distinct ${maintenanceLogs.extinguisherId})::int`,
			})
			.from(maintenanceLogs)
			.where(dateCondition),
	]);

	const recentActivities = recentRow[0]?.count ?? 0;
	const distinctExtinguishersServiced = distinctRow[0]?.count ?? 0;
	const averageLogsPerExtinguisher =
		distinctExtinguishersServiced > 0
			? Math.round((recentActivities / distinctExtinguishersServiced) * 10) /
				10
			: 0;

	return {
		logsByMonth: byMonth.map((row) => ({
			period: row.period,
			count: row.count,
		})),
		recentActivities,
		distinctExtinguishersServiced,
		averageLogsPerExtinguisher,
	};
}
