import type {
	FireExtinguisher,
	Inspection,
	MaintenanceLog,
	Notification,
	User,
} from "@api/db/schema";

export function serializeUser(user: User) {
	return {
		id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		emailVerified: user.emailVerified,
		role: user.role,
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	};
}

export function serializeExtinguisher(extinguisher: FireExtinguisher) {
	return {
		id: extinguisher.id,
		serialNumber: extinguisher.serialNumber,
		location: extinguisher.location,
		type: extinguisher.type,
		size: extinguisher.size,
		installationDate: extinguisher.installationDate,
		expiryDate: extinguisher.expiryDate,
		status: extinguisher.status,
		createdBy: extinguisher.createdBy,
		createdAt: extinguisher.createdAt.toISOString(),
		updatedAt: extinguisher.updatedAt.toISOString(),
	};
}

export function serializeInspection(inspection: Inspection) {
	return {
		id: inspection.id,
		extinguisherId: inspection.extinguisherId,
		scheduledById: inspection.scheduledBy,
		assignedInspectorId: inspection.assignedInspectorId,
		scheduledDate: inspection.scheduledDate,
		scheduledTime: inspection.scheduledTime,
		status: inspection.status,
		notes: inspection.notes,
		cancelReason: inspection.cancelReason,
		completedAt: inspection.completedAt?.toISOString() ?? null,
		completedById: inspection.completedBy,
		createdAt: inspection.createdAt.toISOString(),
		updatedAt: inspection.updatedAt.toISOString(),
	};
}

export function serializeMaintenance(log: MaintenanceLog) {
	return {
		id: log.id,
		extinguisherId: log.extinguisherId,
		performedById: log.performedBy,
		actionTaken: log.actionTaken,
		maintenanceDate: log.maintenanceDate,
		issuesIdentified: log.issuesIdentified,
		notes: log.notes,
		createdAt: log.createdAt.toISOString(),
	};
}

export function serializeNotification(notification: Notification) {
	return {
		id: notification.id,
		userId: notification.userId,
		title: notification.title,
		message: notification.message,
		type: notification.type,
		read: notification.read,
		relatedEntityType: notification.relatedEntityType,
		relatedEntityId: notification.relatedEntityId,
		createdAt: notification.createdAt.toISOString(),
	};
}

export type ReportPeriodCount = { period: string; count: number };

export type ReportUpcomingExpiration = {
	serialNumber: string;
	location: string;
	expiryDate: string;
	status: string;
	daysUntilExpiry: number;
};

export type ReportSummary = {
	period?: { fromDate?: string; toDate?: string };
	inventory: {
		total: number;
		byStatus: Record<string, number>;
		byType: Record<string, number>;
		summaries: {
			daily: ReportPeriodCount[];
			monthly: ReportPeriodCount[];
			yearly: ReportPeriodCount[];
			registeredToday: number;
			registeredInRange: number;
		};
	};
	inspections: {
		pending: number;
		completed: number;
		overdue: number;
		cancelled: number;
	};
	compliance: {
		expired: number;
		expiringWithin30Days: number;
		needsMaintenance: number;
		upcomingExpirations: ReportUpcomingExpiration[];
	};
	maintenance: {
		totalLogs: number;
		last30Days: number;
		logsByMonth: ReportPeriodCount[];
		recentActivities: number;
		distinctExtinguishersServiced: number;
		averageLogsPerExtinguisher: number;
	};
	generatedAt: string;
};

export function serializeReportSummary(summary: ReportSummary) {
	return summary;
}
