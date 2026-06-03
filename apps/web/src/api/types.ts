import type { UserRole } from "@repo/contracts";

import { apiPath } from "@web/lib/api-path";

export interface ApiErrorBody {
	error?: string;
	message?: string;
	details?: unknown;
}

export class ApiError extends Error {
	status: number;
	code?: string;
	details?: unknown;

	constructor(
		status: number,
		message: string,
		code?: string,
		details?: unknown,
	) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

export interface PaginatedResponse<T> {
	data: T[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface User {
	id: string;
	email: string;
	emailVerified: boolean;
	firstName: string;
	lastName: string;
	role: UserRole;
	createdAt: string;
	updatedAt: string;
}

export interface Extinguisher {
	id: string;
	serialNumber: string;
	location: string;
	type: string;
	size: string;
	installationDate: string;
	expiryDate: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

export interface Inspection {
	id: string;
	extinguisherId: string;
	scheduledDate: string;
	scheduledTime: string;
	status: string;
	assignedInspectorId?: string | null;
	assignedInspector?: Pick<User, "id" | "firstName" | "lastName"> | null;
	extinguisher?: Pick<Extinguisher, "id" | "serialNumber" | "location"> | null;
	notes?: string | null;
	completedAt?: string | null;
	cancelledAt?: string | null;
	cancelReason?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface MaintenanceRecord {
	id: string;
	extinguisherId: string;
	actionTaken: string;
	maintenanceDate: string;
	issuesIdentified?: string | null;
	notes?: string | null;
	performedById: string;
	performedBy?: Pick<User, "id" | "firstName" | "lastName"> | null;
	extinguisher?: Pick<Extinguisher, "id" | "serialNumber" | "location"> | null;
	createdAt: string;
}

export interface DashboardMetrics {
	totalExtinguishers: number;
	activeExtinguishers: number;
	expiredExtinguishers: number;
	needsMaintenance: number;
	scheduledInspections: number;
	overdueInspections: number;
	completedInspectionsThisMonth: number;
}

export interface ReportSummary {
	generatedAt: string;
	inventory: {
		total: number;
		byStatus: Record<string, number>;
		byType: Record<string, number>;
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
	};
	maintenance: {
		totalLogs: number;
		last30Days: number;
	};
}

export interface NotificationItem {
	id: string;
	title: string;
	message: string;
	read: boolean;
	createdAt: string;
}

export interface NotificationsResponse {
	unreadCount: number;
	items: NotificationItem[];
}

async function parseJson<T>(response: Response): Promise<T | null> {
	const text = await response.text();
	if (!text) {
		return null;
	}
	return JSON.parse(text) as T;
}

export async function apiRequest<T>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const headers = new Headers(options.headers);

	if (options.body && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	const response = await fetch(apiPath(path), {
		...options,
		headers,
		credentials: "include",
	});

	if (!response.ok) {
		const body = await parseJson<ApiErrorBody>(response);
		throw new ApiError(
			response.status,
			body?.message ?? `Request failed with status ${response.status}`,
			body?.error,
			body?.details,
		);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	const body = await parseJson<T>(response);
	return body as T;
}

export function buildQuery(
	params: object,
): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
		if (value !== undefined && value !== "") {
			search.set(key, String(value));
		}
	}
	const query = search.toString();
	return query ? `?${query}` : "";
}
