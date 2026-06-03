import { apiRequest, buildQuery } from "@web/api/client";
import { apiPath } from "@web/lib/api-path";
import type { ReportSummary } from "@web/api/types";

export interface ReportFilters {
	fromDate?: string;
	toDate?: string;
}

export const reportsApi = {
	async summary(filters: ReportFilters = {}) {
		const response = await apiRequest<{ report: ReportSummary }>(
			`/reports/summary${buildQuery(filters)}`,
		);
		return { data: response.report };
	},

	export(format: "csv" | "pdf", filters: ReportFilters = {}) {
		return fetch(
			apiPath(`/reports/export${buildQuery({ ...filters, format })}`),
			{ credentials: "include" },
		);
	},
};
