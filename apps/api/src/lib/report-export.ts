import PDFDocument from "pdfkit";

import type { ReportSummary } from "@api/lib/serializers";

function escapeCsvValue(value: string | number): string {
	const str = String(value);
	if (str.includes(",") || str.includes('"') || str.includes("\n")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

function appendPeriodRows(
	rows: string[],
	section: string,
	label: string,
	entries: { period: string; count: number }[],
) {
	for (const entry of entries) {
		rows.push(
			`${section},${label} ${entry.period},${escapeCsvValue(entry.count)}`,
		);
	}
}

function buildCsvRows(summary: ReportSummary): string[] {
	const rows: string[] = [];
	rows.push("Section,Metric,Value");
	rows.push(
		`Inventory,Total Extinguishers,${escapeCsvValue(summary.inventory.total)}`,
	);
	rows.push(
		`Inventory,Registered Today,${escapeCsvValue(summary.inventory.summaries.registeredToday)}`,
	);
	rows.push(
		`Inventory,Registered In Filter Range,${escapeCsvValue(summary.inventory.summaries.registeredInRange)}`,
	);

	for (const [status, count] of Object.entries(summary.inventory.byStatus)) {
		rows.push(`Inventory,Status ${status},${escapeCsvValue(count)}`);
	}

	for (const [type, count] of Object.entries(summary.inventory.byType)) {
		rows.push(`Inventory,Type ${type},${escapeCsvValue(count)}`);
	}

	appendPeriodRows(
		rows,
		"Inventory Daily",
		"Registrations",
		summary.inventory.summaries.daily,
	);
	appendPeriodRows(
		rows,
		"Inventory Monthly",
		"Registrations",
		summary.inventory.summaries.monthly,
	);
	appendPeriodRows(
		rows,
		"Inventory Yearly",
		"Registrations",
		summary.inventory.summaries.yearly,
	);

	rows.push(
		`Inspections,Pending,${escapeCsvValue(summary.inspections.pending)}`,
	);
	rows.push(
		`Inspections,Completed,${escapeCsvValue(summary.inspections.completed)}`,
	);
	rows.push(
		`Inspections,Overdue,${escapeCsvValue(summary.inspections.overdue)}`,
	);
	rows.push(
		`Inspections,Cancelled,${escapeCsvValue(summary.inspections.cancelled)}`,
	);

	rows.push(`Compliance,Expired,${escapeCsvValue(summary.compliance.expired)}`);
	rows.push(
		`Compliance,Expiring Within 30 Days,${escapeCsvValue(summary.compliance.expiringWithin30Days)}`,
	);
	rows.push(
		`Compliance,Needs Maintenance,${escapeCsvValue(summary.compliance.needsMaintenance)}`,
	);

	for (const item of summary.compliance.upcomingExpirations) {
		rows.push(
			`Compliance Upcoming,${escapeCsvValue(item.serialNumber)} @ ${escapeCsvValue(item.location)},${escapeCsvValue(item.expiryDate)} (${item.daysUntilExpiry} days)`,
		);
	}

	rows.push(
		`Maintenance,Total Logs,${escapeCsvValue(summary.maintenance.totalLogs)}`,
	);
	rows.push(
		`Maintenance,Last 30 Days,${escapeCsvValue(summary.maintenance.last30Days)}`,
	);
	rows.push(
		`Maintenance,Activities In Range,${escapeCsvValue(summary.maintenance.recentActivities)}`,
	);
	rows.push(
		`Maintenance,Distinct Extinguishers Serviced,${escapeCsvValue(summary.maintenance.distinctExtinguishersServiced)}`,
	);
	rows.push(
		`Maintenance,Avg Logs Per Extinguisher,${escapeCsvValue(summary.maintenance.averageLogsPerExtinguisher)}`,
	);

	appendPeriodRows(
		rows,
		"Maintenance Monthly",
		"Logs",
		summary.maintenance.logsByMonth,
	);

	rows.push(
		`Generated At,Timestamp,${escapeCsvValue(summary.generatedAt)}`,
	);

	return rows;
}

function writePeriodSection(
	doc: InstanceType<typeof PDFDocument>,
	entries: { period: string; count: number }[],
) {
	if (entries.length === 0) {
		doc.text("  (no records in range)");
		return;
	}
	for (const entry of entries) {
		doc.text(`  ${entry.period}: ${entry.count}`);
	}
}

export function exportReportCsv(summary: ReportSummary): Buffer {
	return Buffer.from(buildCsvRows(summary).join("\n"), "utf-8");
}

export function exportReportPdf(summary: ReportSummary): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ margin: 50 });
		const chunks: Buffer[] = [];

		doc.on("data", (chunk: Buffer) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);

		doc.fontSize(18).text("TZW FireEx — Extinguisher Report", { align: "center" });
		doc.moveDown();
		doc.fontSize(10).text(`Generated: ${summary.generatedAt}`);
		if (summary.period?.fromDate || summary.period?.toDate) {
			doc.text(
				`Period: ${summary.period.fromDate ?? "…"} to ${summary.period.toDate ?? "…"}`,
			);
		}
		doc.moveDown();

		doc.fontSize(14).text("Inventory");
		doc.fontSize(10).text(`Total: ${summary.inventory.total}`);
		doc.text(`Registered today: ${summary.inventory.summaries.registeredToday}`);
		for (const [status, count] of Object.entries(summary.inventory.byStatus)) {
			doc.text(`  ${status}: ${count}`);
		}
		doc.moveDown();
		doc.fontSize(12).text("Daily registrations");
		writePeriodSection(doc, summary.inventory.summaries.daily);
		doc.moveDown();
		doc.fontSize(12).text("Monthly registrations");
		writePeriodSection(doc, summary.inventory.summaries.monthly);
		doc.moveDown();
		doc.fontSize(12).text("Yearly registrations");
		writePeriodSection(doc, summary.inventory.summaries.yearly);
		doc.moveDown();

		doc.fontSize(14).text("Inspections");
		doc.fontSize(10);
		doc.text(`Pending: ${summary.inspections.pending}`);
		doc.text(`Completed: ${summary.inspections.completed}`);
		doc.text(`Overdue: ${summary.inspections.overdue}`);
		doc.text(`Cancelled: ${summary.inspections.cancelled}`);
		doc.moveDown();

		doc.fontSize(14).text("Compliance");
		doc.fontSize(10);
		doc.text(`Expired: ${summary.compliance.expired}`);
		doc.text(
			`Expiring within 30 days: ${summary.compliance.expiringWithin30Days}`,
		);
		doc.text(`Needs maintenance: ${summary.compliance.needsMaintenance}`);
		doc.text("Upcoming expirations:");
		for (const item of summary.compliance.upcomingExpirations) {
			doc.text(
				`  ${item.serialNumber} (${item.location}) — ${item.expiryDate} in ${item.daysUntilExpiry}d`,
			);
		}
		doc.moveDown();

		doc.fontSize(14).text("Maintenance");
		doc.fontSize(10);
		doc.text(`Total logs: ${summary.maintenance.totalLogs}`);
		doc.text(`Last 30 days: ${summary.maintenance.last30Days}`);
		doc.text(
			`Avg logs per extinguisher (range): ${summary.maintenance.averageLogsPerExtinguisher}`,
		);
		doc.fontSize(12).text("Maintenance by month");
		writePeriodSection(doc, summary.maintenance.logsByMonth);

		doc.end();
	});
}
