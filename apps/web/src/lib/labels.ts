import type {
	ExtinguisherSize,
	ExtinguisherStatus,
	ExtinguisherType,
	InspectionStatus,
	UserRole,
} from "@tzw-firex/contracts";

export const roleLabels: Record<UserRole, string> = {
	user: "User",
	inspector: "Inspector",
	admin: "Administrator",
};

export const extinguisherTypeLabels: Record<ExtinguisherType, string> = {
	water: "Water",
	co2: "CO2",
	foam: "Foam",
	dry_chemical: "Dry Chemical",
};

export const extinguisherSizeLabels: Record<ExtinguisherSize, string> = {
	"2.5 lbs.": "2.5 lbs.",
	"5 lbs.": "5 lbs.",
	"9 lbs.": "9 lbs.",
	"12 lbs.": "12 lbs.",
};

export const extinguisherStatusLabels: Record<ExtinguisherStatus, string> = {
	active: "Active",
	expired: "Expired",
	decommissioned: "Decommissioned",
	needs_maintenance: "Needs Maintenance",
};

export const inspectionStatusLabels: Record<InspectionStatus, string> = {
	scheduled: "Scheduled",
	completed: "Completed",
	cancelled: "Cancelled",
	overdue: "Overdue",
};

export function formatDate(value: string | Date): string {
	const date = typeof value === "string" ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) {
		return String(value);
	}
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export function formatDateTime(value: string | Date): string {
	const date = typeof value === "string" ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) {
		return String(value);
	}
	return date.toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatUserName(
	firstName: string,
	lastName: string,
): string {
	return `${firstName} ${lastName}`.trim();
}

export function formatUserBrief(
	user?: { firstName?: string; lastName?: string } | null,
	fallback = "Unknown",
): string {
	if (!user) {
		return fallback;
	}
	const name = formatUserName(user.firstName ?? "", user.lastName ?? "");
	return name || fallback;
}
