import PDFDocument from "pdfkit";

import type { ReportSummary } from "@api/lib/serializers";

function escapeCsvValue(value: string | number): string {
	const str = String(value);
	if (str.includes(",") || str.includes('"') || str.includes("\n")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

function buildCsvRows(summary: ReportSummary): string[] {
	const rows: string[] = [];
	rows.push("Section,Metric,Value");
	rows.push(
		`Inventory,Total Extinguishers,${escapeCsvValue(summary.inventory.total)}`,
	);

	for (const [status, count] of Object.entries(summary.inventory.byStatus)) {
		rows.push(`Inventory,Status ${status},${escapeCsvValue(count)}`);
	}

	for (const [type, count] of Object.entries(summary.inventory.byType)) {
		rows.push(`Inventory,Type ${type},${escapeCsvValue(count)}`);
	}

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
	rows.push(
		`Maintenance,Total Logs,${escapeCsvValue(summary.maintenance.totalLogs)}`,
	);
	rows.push(
		`Maintenance,Last 30 Days,${escapeCsvValue(summary.maintenance.last30Days)}`,
	);
	rows.push(
		`Generated At,Timestamp,${escapeCsvValue(summary.generatedAt)}`,
	);

	return rows;
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

		doc.fontSize(18).text("TZW Fire Extinguisher Report", { align: "center" });
		doc.moveDown();
		doc.fontSize(10).text(`Generated: ${summary.generatedAt}`);
		doc.moveDown();

		doc.fontSize(14).text("Inventory");
		doc.fontSize(10).text(`Total: ${summary.inventory.total}`);
		for (const [status, count] of Object.entries(summary.inventory.byStatus)) {
			doc.text(`  ${status}: ${count}`);
		}
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
		doc.moveDown();

		doc.fontSize(14).text("Maintenance");
		doc.fontSize(10);
		doc.text(`Total logs: ${summary.maintenance.totalLogs}`);
		doc.text(`Last 30 days: ${summary.maintenance.last30Days}`);

		doc.end();
	});
}
