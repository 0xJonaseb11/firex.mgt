import type {
	CancelInspectionInput,
	CompleteInspectionInput,
	ScheduleInspectionInput,
} from "@repo/contracts";

import { apiRequest, buildQuery } from "@web/api/client";
import type { Inspection, PaginatedResponse } from "@web/api/types";

export interface InspectionFilters {
	status?: string;
	extinguisherId?: string;
	assignedInspectorId?: string;
	fromDate?: string;
	toDate?: string;
	page?: number;
	limit?: number;
}

type ListResponse = {
	items: Inspection[];
	total: number;
	page: number;
	limit: number;
};

export const inspectionsApi = {
	async list(filters: InspectionFilters = {}) {
		const response = await apiRequest<ListResponse>(
			`/inspections${buildQuery(filters)}`,
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
		} satisfies PaginatedResponse<Inspection> & { raw: ListResponse };
	},

	async schedule(input: ScheduleInspectionInput) {
		const response = await apiRequest<{ inspection: Inspection }>("/inspections", {
			method: "POST",
			body: JSON.stringify(input),
		});
		return { data: response.inspection };
	},

	async complete(id: string, input: CompleteInspectionInput) {
		const response = await apiRequest<{ inspection: Inspection }>(
			`/inspections/${id}/complete`,
			{
				method: "POST",
				body: JSON.stringify(input),
			},
		);
		return { data: response.inspection };
	},

	async cancel(id: string, input: CancelInspectionInput) {
		const response = await apiRequest<{ inspection: Inspection }>(
			`/inspections/${id}/cancel`,
			{
				method: "POST",
				body: JSON.stringify(input),
			},
		);
		return { data: response.inspection };
	},
};
