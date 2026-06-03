import { useCallback, useEffect, useState } from "react";

import { reportsApi } from "@web/api/reports";
import { ApiError } from "@web/api/client";
import type { ReportSummary } from "@web/api/types";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import { JsonPreview } from "@web/components/JsonPreview";
import { ViewModeToggle, type ViewMode } from "@web/components/ViewModeToggle";
import { useConfirm } from "@web/contexts/ConfirmContext";
import { useToast } from "@web/contexts/ToastContext";
import {
	extinguisherStatusLabels,
	extinguisherTypeLabels,
	formatDate,
} from "@web/lib/labels";

export function ReportsPage() {
	const { confirm } = useConfirm();
	const toast = useToast();

	const [summary, setSummary] = useState<ReportSummary | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("ui");
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [loading, setLoading] = useState(true);
	const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
	const [error, setError] = useState<string | null>(null);

	const loadSummary = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await reportsApi.summary({
				fromDate: fromDate || undefined,
				toDate: toDate || undefined,
			});
			setSummary(response.data);
		} catch (err) {
			const message =
				err instanceof ApiError ? err.message : "Unable to load report summary.";
			setError(message);
			toast.error(message);
		} finally {
			setLoading(false);
		}
	}, [fromDate, toDate, toast]);

	useEffect(() => {
		void loadSummary();
	}, [loadSummary]);

	const handleExport = async (format: "csv" | "pdf") => {
		const confirmed = await confirm({
			title: `Export ${format.toUpperCase()} report`,
			message: `Generate and download a ${format.toUpperCase()} report for the selected date range?`,
			confirmLabel: "Export",
		});
		if (!confirmed) {
			return;
		}

		setExporting(format);
		setError(null);
		try {
			const response = await reportsApi.export(format, {
				fromDate: fromDate || undefined,
				toDate: toDate || undefined,
			});
			if (!response.ok) {
				throw new ApiError(response.status, "Export failed");
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = `tzw-report.${format}`;
			anchor.click();
			URL.revokeObjectURL(url);
			toast.success(`${format.toUpperCase()} report downloaded.`);
		} catch (err) {
			const message =
				err instanceof ApiError ? err.message : "Unable to export report.";
			setError(message);
			toast.error(message);
		} finally {
			setExporting(null);
		}
	};

	return (
		<div className="page">
			<PageHeader
				title="Reports"
				description="Review compliance summary and export records."
				actions={
					<div className="page-header__action-group">
						<ViewModeToggle mode={viewMode} onChange={setViewMode} />
						<button
							type="button"
							className="btn btn-secondary"
							onClick={() => void handleExport("csv")}
							disabled={exporting !== null}
						>
							{exporting === "csv" ? "Exporting CSV..." : "Export CSV"}
						</button>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={() => void handleExport("pdf")}
							disabled={exporting !== null}
						>
							{exporting === "pdf" ? "Exporting PDF..." : "Export PDF"}
						</button>
					</div>
				}
			/>

			<section className="panel filters-panel">
				<div className="filters-row">
					<FormField
						label="From date"
						type="date"
						name="fromDate"
						value={fromDate}
						onChange={(event) => setFromDate(event.target.value)}
					/>
					<FormField
						label="To date"
						type="date"
						name="toDate"
						value={toDate}
						onChange={(event) => setToDate(event.target.value)}
					/>
					<button type="button" className="btn btn-primary" onClick={() => void loadSummary()}>
						Refresh summary
					</button>
				</div>
			</section>

			{error ? <ErrorAlert message={error} onDismiss={() => setError(null)} /> : null}

			{loading ? (
				<LoadingState message="Loading report summary..." />
			) : viewMode === "json" && summary ? (
				<JsonPreview data={{ report: summary }} label="Report summary (JSON)" />
			) : summary ? (
				<>
					<p className="report-meta">
						Generated {formatDate(summary.generatedAt)}
					</p>
					<div className="metric-grid">
						<article className="metric-card">
							<p className="metric-card__label">Total extinguishers</p>
							<p className="metric-card__value">{summary.inventory.total}</p>
						</article>
						<article className="metric-card">
							<p className="metric-card__label">Inspections completed</p>
							<p className="metric-card__value">{summary.inspections.completed}</p>
						</article>
						<article className="metric-card">
							<p className="metric-card__label">Inspections overdue</p>
							<p className="metric-card__value">{summary.inspections.overdue}</p>
						</article>
						<article className="metric-card">
							<p className="metric-card__label">Maintenance records</p>
							<p className="metric-card__value">{summary.maintenance.totalLogs}</p>
						</article>
					</div>

					<div className="report-columns">
						<section className="panel">
							<h2 className="panel__title">By status</h2>
							<ul className="summary-list">
								{Object.entries(summary.inventory.byStatus).map(([key, value]) => (
									<li key={key}>
										<span>
											{extinguisherStatusLabels[
												key as keyof typeof extinguisherStatusLabels
											] ?? key}
										</span>
										<strong>{String(value)}</strong>
									</li>
								))}
							</ul>
						</section>
						<section className="panel">
							<h2 className="panel__title">By type</h2>
							<ul className="summary-list">
								{Object.entries(summary.inventory.byType).map(([key, value]) => (
									<li key={key}>
										<span>
											{extinguisherTypeLabels[
												key as keyof typeof extinguisherTypeLabels
											] ?? key}
										</span>
										<strong>{String(value)}</strong>
									</li>
								))}
							</ul>
						</section>
					</div>
				</>
			) : null}
		</div>
	);
}
