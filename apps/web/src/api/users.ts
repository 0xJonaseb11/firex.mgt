import type { UserRole } from "@repo/contracts";

import { apiRequest, buildQuery } from "@web/api/client";
import type { PaginatedResponse, User } from "@web/api/types";

export interface UserFilters {
	search?: string;
	role?: UserRole;
	page?: number;
	limit?: number;
}

export const usersApi = {
	list(filters: UserFilters = {}) {
		return apiRequest<PaginatedResponse<User>>(
			`/users${buildQuery(filters)}`,
		);
	},

	updateRole(id: string, role: UserRole) {
		return apiRequest<{ data: User }>(`/users/${id}/role`, {
			method: "PATCH",
			body: JSON.stringify({ role }),
		});
	},
};
