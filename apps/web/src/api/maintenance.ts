import type { CreateMaintenanceInput } from "@repo/contracts";

import { apiRequest, buildQuery } from "@web/api/client";
import type { MaintenanceRecord, PaginatedResponse } from "@web/api/types";

export interface MaintenanceFilters {
	extinguisherId?: string;
	performedBy?: string;
	fromDate?: string;
	toDate?: string;
	page?: number;
	limit?: number;
}

type ListResponse = {
	items: MaintenanceRecord[];
	total: number;
	page: number;
	limit: number;
};

export const maintenanceApi = {
	async list(filters: MaintenanceFilters = {}) {
		const response = await apiRequest<ListResponse>(
			`/maintenance${buildQuery(filters)}`,
		);
		return {
			data: response.items,
			meta: {
				page: response.page,
				limit: response.limit,
				total: response.total,
				totalPages: Math.ceil(response.total / response.limit) || 1,
			},
		} satisfies PaginatedResponse<MaintenanceRecord>;
	},

	async create(input: CreateMaintenanceInput) {
		const response = await apiRequest<{ maintenance: MaintenanceRecord }>(
			"/maintenance",
			{
				method: "POST",
				body: JSON.stringify(input),
			},
		);
		return { data: response.maintenance };
	},
};
