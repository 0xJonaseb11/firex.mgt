import { useCallback, useEffect, useState } from "react";

import { reportsApi } from "@web/api/reports";
import { ApiError } from "@web/api/client";
import type { ReportPeriodCount, ReportSummary } from "@web/api/types";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import { JsonPreview } from "@web/components/JsonPreview";
import { StatusBadge } from "@web/components/StatusBadge";
import { ViewModeToggle, type ViewMode } from "@web/components/ViewModeToggle";
import { useConfirm } from "@web/contexts/ConfirmContext";
import { useToast } from "@web/contexts/ToastContext";
import {
	extinguisherStatusLabels,
	extinguisherTypeLabels,
	formatDate,
} from "@web/lib/labels";

function PeriodTable({
	title,
	rows,
	emptyLabel,
}: {
	title: string;
	rows: ReportPeriodCount[];
	emptyLabel: string;
}) {
	return (
		<section className="panel report-period-panel">
			<h2 className="panel__title">{title}</h2>
			{rows.length === 0 ? (
				<p className="chart-panel__empty">{emptyLabel}</p>
			) : (
				<ul className="summary-list">
					{rows.map((row) => (
						<li key={row.period}>
							<span>{row.period}</span>
							<strong>{row.count}</strong>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

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
				description="Real-time inventory, inspection, compliance, and maintenance analytics with PDF/CSV export."
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
						hint="Filters inventory registrations and maintenance activity summaries."
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
						{summary.period?.fromDate || summary.period?.toDate
							? ` · Period ${summary.period.fromDate ?? "…"} to ${summary.period.toDate ?? "…"}`
							: null}
					</p>

					<div className="metric-grid">
						<article className="metric-card metric-card--accent-slate">
							<p className="metric-card__label">Total extinguishers</p>
							<p className="metric-card__value">{summary.inventory.total}</p>
						</article>
						<article className="metric-card metric-card--accent-sage">
							<p className="metric-card__label">Registered today</p>
							<p className="metric-card__value">
								{summary.inventory.summaries.registeredToday}
							</p>
						</article>
						<article className="metric-card metric-card--accent-clay">
							<p className="metric-card__label">Inspections overdue</p>
							<p className="metric-card__value">{summary.inspections.overdue}</p>
						</article>
						<article className="metric-card metric-card--accent-mist">
							<p className="metric-card__label">Expiring within 30 days</p>
							<p className="metric-card__value">
								{summary.compliance.expiringWithin30Days}
							</p>
						</article>
					</div>

					<div className="report-columns">
						<section className="panel">
							<h2 className="panel__title">Fleet by status</h2>
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
							<h2 className="panel__title">Fleet by type</h2>
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
						<section className="panel">
							<h2 className="panel__title">Inspections</h2>
							<ul className="summary-list">
								<li>
									<span>Pending</span>
									<strong>{summary.inspections.pending}</strong>
								</li>
								<li>
									<span>Completed</span>
									<strong>{summary.inspections.completed}</strong>
								</li>
								<li>
									<span>Overdue</span>
									<strong>{summary.inspections.overdue}</strong>
								</li>
								<li>
									<span>Cancelled</span>
									<strong>{summary.inspections.cancelled}</strong>
								</li>
							</ul>
						</section>
						<section className="panel">
							<h2 className="panel__title">Compliance</h2>
							<ul className="summary-list">
								<li>
									<span>Expired</span>
									<strong>{summary.compliance.expired}</strong>
								</li>
								<li>
									<span>Expiring (30 days)</span>
									<strong>{summary.compliance.expiringWithin30Days}</strong>
								</li>
								<li>
									<span>Needs maintenance</span>
									<strong>{summary.compliance.needsMaintenance}</strong>
								</li>
							</ul>
						</section>
					</div>

					<section className="panel">
						<h2 className="panel__title">Upcoming expirations (next 60 days)</h2>
						{summary.compliance.upcomingExpirations.length === 0 ? (
							<p className="chart-panel__empty">No upcoming expirations in the next 60 days.</p>
						) : (
							<ul className="dashboard-upcoming-list">
								{summary.compliance.upcomingExpirations.map((item) => (
									<li
										key={`${item.serialNumber}-${item.expiryDate}`}
										className="dashboard-upcoming-list__item"
									>
										<div>
											<p className="dashboard-upcoming-list__serial">
												{item.serialNumber}
											</p>
											<p className="dashboard-upcoming-list__location">
												{item.location}
											</p>
											<p className="dashboard-upcoming-list__when">
												Expires {formatDate(item.expiryDate)} · in{" "}
												{item.daysUntilExpiry} day
												{item.daysUntilExpiry === 1 ? "" : "s"}
											</p>
										</div>
										<StatusBadge value={item.status} />
									</li>
								))}
							</ul>
						)}
					</section>

					<div className="dashboard-charts report-period-grid">
						<PeriodTable
							title="Daily inventory summary (registrations)"
							rows={summary.inventory.summaries.daily}
							emptyLabel="No registrations in the daily window."
						/>
						<PeriodTable
							title="Monthly inventory summary"
							rows={summary.inventory.summaries.monthly}
							emptyLabel="No registrations in the monthly window."
						/>
						<PeriodTable
							title="Yearly inventory summary"
							rows={summary.inventory.summaries.yearly}
							emptyLabel="No registrations in the yearly window."
						/>
						<PeriodTable
							title="Maintenance frequency (by month)"
							rows={summary.maintenance.logsByMonth}
							emptyLabel="No maintenance logs in range."
						/>
					</div>

					<section className="panel">
						<h2 className="panel__title">Maintenance analytics</h2>
						<ul className="summary-list">
							<li>
								<span>Total logs (all time)</span>
								<strong>{summary.maintenance.totalLogs}</strong>
							</li>
							<li>
								<span>Last 30 days</span>
								<strong>{summary.maintenance.last30Days}</strong>
							</li>
							<li>
								<span>Activities in selected range</span>
								<strong>{summary.maintenance.recentActivities}</strong>
							</li>
							<li>
								<span>Distinct extinguishers serviced</span>
								<strong>{summary.maintenance.distinctExtinguishersServiced}</strong>
							</li>
							<li>
								<span>Average logs per extinguisher</span>
								<strong>{summary.maintenance.averageLogsPerExtinguisher}</strong>
							</li>
						</ul>
					</section>
				</>
			) : null}
		</div>
	);
}
