import { and, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@api/db";
import {
	fireExtinguishers,
	inspections,
	maintenanceLogs,
	users,
} from "@api/db/schema";
import {
	countComplianceMetrics,
	countExtinguishersByStatus,
	countExtinguishersByType,
	markExpiredExtinguishers,
} from "@api/db/queries/extinguishers.js";
import {
	countInspectionsByStatus,
	markOverdueInspections,
} from "@api/db/queries/inspections.js";
import { countMaintenanceLogs } from "@api/db/queries/maintenance.js";
import { getUserById } from "@api/db/queries/users.js";
import type { UserRole } from "@api/db/schema";

export type ChartSegment = { label: string; value: number; color: string };

export type DashboardHighlight = {
	label: string;
	value: number;
	to?: string;
	accent?: "slate" | "sage" | "clay" | "mist";
};

export type DashboardUpcomingInspection = {
	id: string;
	scheduledDate: string;
	scheduledTime: string;
	status: string;
	extinguisherSerial: string;
	extinguisherLocation: string;
};

export type DashboardPayload = {
	role: UserRole;
	generatedAt: string;
	scope: string;
	greeting?: string;
	metrics: Record<string, number>;
	charts: {
		extinguisherStatus: ChartSegment[];
		extinguisherTypes?: ChartSegment[];
		inspectionStatus: ChartSegment[];
		userRoles?: ChartSegment[];
	};
	highlights: DashboardHighlight[];
	upcomingInspections?: DashboardUpcomingInspection[];
	permissions: {
		canViewReports: boolean;
		canViewUsers: boolean;
		canViewMaintenance: boolean;
		canManageInventory: boolean;
		canViewAllInspections: boolean;
		canScheduleInspections: boolean;
		canAssignInspector: boolean;
	};
};

const CHART_SEQUENCE = [
	"#5b7c99",
	"#6b8f71",
	"#9a7b4f",
	"#8b7a9a",
	"#7a8fa8",
	"#a8a29e",
];

const CHART_COLOR_BY_KEY: Record<string, string> = {
	active: "#6b8f71",
	expired: "#9a6b6b",
	decommissioned: "#a8a29e",
	needs_maintenance: "#9a8b5c",
	scheduled: "#5b7c99",
	completed: "#6b8f71",
	cancelled: "#a8a29e",
	overdue: "#a67c5b",
	water: "#6b90a8",
	co2: "#7a8490",
	foam: "#6b9a7a",
	dry_chemical: "#a08c6b",
	user: "#7a8fb8",
	inspector: "#6b9aaa",
	admin: "#8a7aa8",
};

function chartColor(key: string, index: number): string {
	return CHART_COLOR_BY_KEY[key] ?? CHART_SEQUENCE[index % CHART_SEQUENCE.length] ?? "#9ca3af";
}

function toChartSegments(record: Record<string, number>): ChartSegment[] {
	return Object.entries(record)
		.filter(([, value]) => value > 0)
		.map(([label, value], index) => ({
			label: label.replace(/_/g, " "),
			value,
			color: chartColor(label, index),
		}));
}

const INSPECTION_STATUS_ORDER = [
	"scheduled",
	"overdue",
	"completed",
	"cancelled",
] as const;

function toInspectionStatusChart(
	record: Record<string, number>,
): ChartSegment[] {
	return INSPECTION_STATUS_ORDER.map((key, index) => ({
		label: key.replace(/_/g, " "),
		value: record[key] ?? 0,
		color: chartColor(key, index),
	}));
}

async function listUpcomingForScheduler(
	userId: string,
	limit = 5,
): Promise<DashboardUpcomingInspection[]> {
	await markOverdueInspections();

	const rows = await db
		.select({
			id: inspections.id,
			scheduledDate: inspections.scheduledDate,
			scheduledTime: inspections.scheduledTime,
			status: inspections.status,
			serial: fireExtinguishers.serialNumber,
			location: fireExtinguishers.location,
		})
		.from(inspections)
		.innerJoin(
			fireExtinguishers,
			eq(inspections.extinguisherId, fireExtinguishers.id),
		)
		.where(
			and(
				eq(inspections.scheduledBy, userId),
				or(
					eq(inspections.status, "scheduled"),
					eq(inspections.status, "overdue"),
				),
			),
		)
		.orderBy(inspections.scheduledDate)
		.limit(limit);

	return rows.map((row) => ({
		id: row.id,
		scheduledDate: row.scheduledDate,
		scheduledTime: row.scheduledTime,
		status: row.status,
		extinguisherSerial: row.serial,
		extinguisherLocation: row.location,
	}));
}

function basePermissions(role: UserRole) {
	return {
		canViewReports: role === "admin" || role === "inspector",
		canViewUsers: role === "admin",
		canViewMaintenance: role === "admin" || role === "inspector",
		canManageInventory: role === "admin" || role === "inspector",
		canViewAllInspections: role === "admin" || role === "inspector",
		canScheduleInspections: true,
		canAssignInspector: role === "admin" || role === "inspector",
	};
}

async function countInspectionsScoped(
	role: UserRole,
	userId: string,
): Promise<Record<string, number>> {
	await markOverdueInspections();

	let where;
	if (role === "inspector") {
		where = or(
			eq(inspections.assignedInspectorId, userId),
			isNull(inspections.assignedInspectorId),
		);
	} else if (role === "user") {
		where = eq(inspections.scheduledBy, userId);
	} else {
		where = undefined;
	}

	const rows = await db
		.select({
			status: inspections.status,
			count: sql<number>`count(*)::int`,
		})
		.from(inspections)
		.where(where)
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

async function countAssignedToInspector(userId: string): Promise<number> {
	await markOverdueInspections();
	const row = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(inspections)
		.where(
			and(
				eq(inspections.assignedInspectorId, userId),
				or(
					eq(inspections.status, "scheduled"),
					eq(inspections.status, "overdue"),
				),
			),
		);
	return row[0]?.count ?? 0;
}

async function countOpenQueueInspections(): Promise<number> {
	await markOverdueInspections();
	const row = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(inspections)
		.where(
			and(
				isNull(inspections.assignedInspectorId),
				or(
					eq(inspections.status, "scheduled"),
					eq(inspections.status, "overdue"),
				),
			),
		);
	return row[0]?.count ?? 0;
}

async function countUsersByRole(): Promise<Record<string, number>> {
	const rows = await db
		.select({
			role: users.role,
			count: sql<number>`count(*)::int`,
		})
		.from(users)
		.groupBy(users.role);

	const result: Record<string, number> = { user: 0, inspector: 0, admin: 0 };
	for (const row of rows) {
		result[row.role] = row.count;
	}
	return result;
}

async function countMaintenanceForUser(userId: string): Promise<number> {
	const row = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(maintenanceLogs)
		.where(eq(maintenanceLogs.performedBy, userId));
	return row[0]?.count ?? 0;
}

export async function generateDashboard(
	userId: string,
	role: UserRole,
): Promise<DashboardPayload> {
	await markExpiredExtinguishers();

	const profile = await getUserById(userId);
	const firstName = profile?.firstName ?? "there";
	const generatedAt = new Date().toISOString();
	const permissions = basePermissions(role);

	if (role === "admin") {
		const byStatus = await countExtinguishersByStatus();
		const byType = await countExtinguishersByType();
		const inspectionCounts = await countInspectionsByStatus();
		const compliance = await countComplianceMetrics();
		const maintenance = await countMaintenanceLogs();
		const userRoles = await countUsersByRole();
		const totalExtinguishers = Object.values(byStatus).reduce(
			(sum, n) => sum + n,
			0,
		);

		return {
			role,
			generatedAt,
			greeting: `Welcome back, ${firstName}`,
			scope: "Organization-wide metrics for administrators.",
			metrics: {
				totalExtinguishers,
				activeExtinguishers: byStatus.active ?? 0,
				expiredExtinguishers: compliance.expired,
				needsMaintenance: compliance.needsMaintenance,
				scheduledInspections: inspectionCounts.scheduled ?? 0,
				overdueInspections: inspectionCounts.overdue ?? 0,
				completedInspections: inspectionCounts.completed ?? 0,
				totalUsers:
					(userRoles.user ?? 0) +
					(userRoles.inspector ?? 0) +
					(userRoles.admin ?? 0),
				maintenanceLogs: maintenance.total,
			},
			charts: {
				extinguisherStatus: toChartSegments(byStatus),
				extinguisherTypes: toChartSegments(byType),
				inspectionStatus: toInspectionStatusChart(inspectionCounts),
				userRoles: toChartSegments(userRoles),
			},
			highlights: [
				{
					label: "Total extinguishers",
					value: totalExtinguishers,
					to: "/extinguishers",
					accent: "slate",
				},
				{
					label: "Overdue inspections",
					value: inspectionCounts.overdue ?? 0,
					to: "/inspections",
					accent: "clay",
				},
				{
					label: "System users",
					value:
						(userRoles.user ?? 0) +
						(userRoles.inspector ?? 0) +
						(userRoles.admin ?? 0),
					to: "/users",
				},
				{
					label: "Maintenance logs",
					value: maintenance.total,
					to: "/maintenance",
				},
			],
			permissions,
		};
	}

	if (role === "inspector") {
		const byStatus = await countExtinguishersByStatus();
		const inspectionCounts = await countInspectionsScoped("inspector", userId);
		const assignedToMe = await countAssignedToInspector(userId);
		const openQueue = await countOpenQueueInspections();
		const myMaintenance = await countMaintenanceForUser(userId);
		const totalExtinguishers = Object.values(byStatus).reduce(
			(sum, n) => sum + n,
			0,
		);

		return {
			role,
			generatedAt,
			greeting: `Welcome back, ${firstName}`,
			scope:
				"Your inspector workspace: assignments, open queue, and inventory overview.",
			metrics: {
				totalExtinguishers,
				assignedToMe,
				openQueueInspections: openQueue,
				scheduledInspections: inspectionCounts.scheduled ?? 0,
				overdueInspections: inspectionCounts.overdue ?? 0,
				completedInspections: inspectionCounts.completed ?? 0,
				myMaintenanceLogs: myMaintenance,
			},
			charts: {
				extinguisherStatus: toChartSegments(byStatus),
				inspectionStatus: toInspectionStatusChart(inspectionCounts),
			},
			highlights: [
				{
					label: "Assigned to you",
					value: assignedToMe,
					to: "/inspections",
					accent: "slate",
				},
				{
					label: "Open queue",
					value: openQueue,
					to: "/inspections",
					accent: "mist",
				},
				{
					label: "Overdue (your scope)",
					value: inspectionCounts.overdue ?? 0,
					to: "/inspections",
					accent: "clay",
				},
				{
					label: "Completed",
					value: inspectionCounts.completed ?? 0,
					to: "/inspections",
					accent: "sage",
				},
				{
					label: "Maintenance you logged",
					value: myMaintenance,
					to: "/maintenance",
					accent: "sage",
				},
			],
			permissions,
		};
	}

	const inspectionCounts = await countInspectionsScoped("user", userId);
	const byStatus = await countExtinguishersByStatus();
	const byType = await countExtinguishersByType();
	const upcomingInspections = await listUpcomingForScheduler(userId);
	const totalExtinguishers = Object.values(byStatus).reduce(
		(sum, n) => sum + n,
		0,
	);
	const scheduledCount = inspectionCounts.scheduled ?? 0;
	const overdueCount = inspectionCounts.overdue ?? 0;

	return {
		role,
		generatedAt,
		greeting: `Good to see you, ${firstName}`,
		scope:
			"Your workspace: schedule inspections for the fleet, track outcomes you requested, and browse extinguisher status (read-only). Assignments are handled by inspectors.",
		metrics: {
			totalExtinguishers,
			myScheduledInspections: scheduledCount,
			myOverdueInspections: overdueCount,
			myCompletedInspections: inspectionCounts.completed ?? 0,
			myCancelledInspections: inspectionCounts.cancelled ?? 0,
			myUpcomingCount: upcomingInspections.length,
		},
		charts: {
			extinguisherStatus: toChartSegments(byStatus),
			extinguisherTypes: toChartSegments(byType),
			inspectionStatus: toInspectionStatusChart(inspectionCounts),
		},
		highlights: [
			{
				label: "Scheduled by you",
				value: scheduledCount,
				to: "/inspections",
				accent: "slate",
			},
			{
				label: "Needs attention",
				value: overdueCount,
				to: "/inspections",
				accent: "clay",
			},
			{
				label: "Completed",
				value: inspectionCounts.completed ?? 0,
				to: "/inspections",
				accent: "sage",
			},
			{
				label: "Fleet overview",
				value: totalExtinguishers,
				to: "/extinguishers",
				accent: "mist",
			},
		],
		upcomingInspections,
		permissions,
	};
}
