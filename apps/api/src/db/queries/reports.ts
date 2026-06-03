import { sql } from "drizzle-orm";

import { db } from "@api/db";
import { fireExtinguishers } from "@api/db/schema";
import {
	countComplianceMetrics,
	countExtinguishersByStatus,
	countExtinguishersByType,
	markExpiredExtinguishers,
} from "@api/db/queries/extinguishers.js";
import { countInspectionsByStatus } from "@api/db/queries/inspections.js";
import { countMaintenanceLogs } from "@api/db/queries/maintenance.js";
import {
	inventoryRegistrationSummaries,
	listUpcomingExpirations,
	maintenanceActivitySummaries,
	type ReportPeriodFilter,
} from "@api/db/queries/report-analytics.js";
import type { ReportSummary } from "@api/lib/serializers";

export type { ReportPeriodFilter };

export async function generateReportSummary(
	filter?: ReportPeriodFilter,
): Promise<ReportSummary> {
	await markExpiredExtinguishers();

	const [
		totalRow,
		byStatus,
		byType,
		inspectionCounts,
		compliance,
		maintenance,
		inventorySummaries,
		upcomingExpirations,
		maintenanceSummaries,
	] = await Promise.all([
		db
			.select({ total: sql<number>`count(*)::int` })
			.from(fireExtinguishers),
		countExtinguishersByStatus(),
		countExtinguishersByType(),
		countInspectionsByStatus(),
		countComplianceMetrics(),
		countMaintenanceLogs(),
		inventoryRegistrationSummaries(filter),
		listUpcomingExpirations(15),
		maintenanceActivitySummaries(filter),
	]);

	return {
		period: filter?.fromDate || filter?.toDate ? filter : undefined,
		inventory: {
			total: totalRow[0]?.total ?? 0,
			byStatus,
			byType,
			summaries: inventorySummaries,
		},
		inspections: {
			pending: inspectionCounts.scheduled ?? 0,
			completed: inspectionCounts.completed ?? 0,
			overdue: inspectionCounts.overdue ?? 0,
			cancelled: inspectionCounts.cancelled ?? 0,
		},
		compliance: {
			...compliance,
			upcomingExpirations,
		},
		maintenance: {
			totalLogs: maintenance.total,
			last30Days: maintenance.last30Days,
			...maintenanceSummaries,
		},
		generatedAt: new Date().toISOString(),
	};
}
