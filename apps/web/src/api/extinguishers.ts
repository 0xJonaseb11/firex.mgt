import type {
	CreateExtinguisherInput,
	UpdateExtinguisherInput,
} from "@repo/contracts";

import { apiRequest, buildQuery } from "@web/api/client";
import type { Extinguisher, PaginatedResponse } from "@web/api/types";

export interface ExtinguisherFilters {
	status?: string;
	type?: string;
	location?: string;
	search?: string;
	page?: number;
	limit?: number;
}

type ListResponse = {
	items: Extinguisher[];
	total: number;
	page: number;
	limit: number;
};

export const extinguishersApi = {
	async list(filters: ExtinguisherFilters = {}) {
		const response = await apiRequest<ListResponse>(
			`/extinguishers${buildQuery(filters)}`,
		);
		return {
			data: response.items,
			meta: {
				page: response.page,
				limit: response.limit,
				total: response.total,
				totalPages: Math.ceil(response.total / response.limit) || 1,
			},
			raw: response,
		} satisfies PaginatedResponse<Extinguisher> & { raw: ListResponse };
	},

	async getById(id: string) {
		const response = await apiRequest<{ extinguisher: Extinguisher }>(
			`/extinguishers/${id}`,
		);
		return { data: response.extinguisher, raw: response };
	},

	async create(input: CreateExtinguisherInput) {
		const response = await apiRequest<{ extinguisher: Extinguisher }>(
			"/extinguishers",
			{
				method: "POST",
				body: JSON.stringify(input),
			},
		);
		return { data: response.extinguisher };
	},

	async update(id: string, input: UpdateExtinguisherInput) {
		const response = await apiRequest<{ extinguisher: Extinguisher }>(
			`/extinguishers/${id}`,
			{
				method: "PATCH",
				body: JSON.stringify(input),
			},
		);
		return { data: response.extinguisher };
	},

	remove(id: string) {
		return apiRequest<{ success: boolean }>(`/extinguishers/${id}`, {
			method: "DELETE",
		});
	},
};
