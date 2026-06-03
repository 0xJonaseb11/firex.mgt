import { apiRequest } from "@web/api/client";
import type { DashboardData } from "@web/api/types";

export const dashboardApi = {
	async get() {
		const response = await apiRequest<{ dashboard: DashboardData }>(
			"/dashboard",
		);
		return { data: response.dashboard };
	},
};
