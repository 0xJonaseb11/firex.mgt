import type { UserRole } from "@tzw-firex/contracts";

import { apiRequest, buildQuery } from "@web/api/client";
import type { PaginatedResponse, User } from "@web/api/types";

export interface UserFilters {
	search?: string;
	role?: UserRole;
	page?: number;
	limit?: number;
}

type ListResponse = {
	items: User[];
	total: number;
	page: number;
	limit: number;
};

type InspectorBrief = Pick<User, "id" | "firstName" | "lastName" | "role">;

export const usersApi = {
	async listInspectors() {
		const response = await apiRequest<{ items: InspectorBrief[] }>(
			"/users/inspectors",
		);
		return { data: response.items };
	},

	async list(filters: UserFilters = {}) {
		const response = await apiRequest<ListResponse>(
			`/users${buildQuery(filters)}`,
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
		} satisfies PaginatedResponse<User> & { raw: ListResponse };
	},

	async updateRole(id: string, role: UserRole) {
		const response = await apiRequest<{ user: User }>(`/users/${id}/role`, {
			method: "PATCH",
			body: JSON.stringify({ role }),
		});
		return { data: response.user };
	},

	remove(id: string) {
		return apiRequest<{ success: boolean }>(`/users/${id}`, {
			method: "DELETE",
		});
	},
};
