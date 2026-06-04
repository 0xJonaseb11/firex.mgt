import { Router } from "express";
import { z } from "zod";

import { generateReportSummary } from "@api/db/queries";
import { exportReportCsv, exportReportPdf } from "@api/lib/report-export";
import { parseQuery } from "@api/lib/parse-body";
import { serializeReportSummary } from "@api/lib/serializers";
import {
	asyncHandler,
	requireAuth,
	requireRole,
} from "@api/middlewares";

const reportFilterSchema = z.object({
	fromDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	toDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
});

const exportQuerySchema = reportFilterSchema.extend({
	format: z.enum(["csv", "pdf"]).default("csv"),
});

export function createReportsRouter(): Router {
	const router = Router();

	router.get(
		"/summary",
		requireAuth,
		requireRole("admin", "inspector"),
		asyncHandler(async (req, res) => {
			const filter = parseQuery(reportFilterSchema, req.query);
			const summary = await generateReportSummary(filter);
			res.json({ report: serializeReportSummary(summary) });
		}),
	);

	router.get(
		"/export",
		requireAuth,
		requireRole("admin", "inspector"),
		asyncHandler(async (req, res) => {
			const { format, ...filter } = parseQuery(exportQuerySchema, req.query);
			const summary = await generateReportSummary(filter);
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

			if (format === "pdf") {
				const buffer = await exportReportPdf(summary);
				res.setHeader("Content-Type", "application/pdf");
				res.setHeader(
					"Content-Disposition",
					`attachment; filename="firex-report-${timestamp}.pdf"`,
				);
				res.send(buffer);
				return;
			}

			const buffer = exportReportCsv(summary);
			res.setHeader("Content-Type", "text/csv");
			res.setHeader(
				"Content-Disposition",
				`attachment; filename="firex-report-${timestamp}.csv"`,
			);
			res.send(buffer);
		}),
	);

	return router;
}
