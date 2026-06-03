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
import type { ReportSummary } from "@api/lib/serializers";

export async function generateReportSummary(): Promise<ReportSummary> {
	await markExpiredExtinguishers();

	const totalRow = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(fireExtinguishers);

	const byStatus = await countExtinguishersByStatus();
	const byType = await countExtinguishersByType();
	const inspectionCounts = await countInspectionsByStatus();
	const compliance = await countComplianceMetrics();
	const maintenance = await countMaintenanceLogs();

	return {
		inventory: {
			total: totalRow[0]?.total ?? 0,
			byStatus,
			byType,
		},
		inspections: {
			pending: inspectionCounts.scheduled ?? 0,
			completed: inspectionCounts.completed ?? 0,
			overdue: inspectionCounts.overdue ?? 0,
			cancelled: inspectionCounts.cancelled ?? 0,
		},
		compliance,
		maintenance: {
			totalLogs: maintenance.total,
			last30Days: maintenance.last30Days,
		},
		generatedAt: new Date().toISOString(),
	};
}
