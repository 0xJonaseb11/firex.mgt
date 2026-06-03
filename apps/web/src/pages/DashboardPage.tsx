import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { notificationsApi } from "@web/api/notifications";
import { reportsApi } from "@web/api/reports";
import type { DashboardMetrics, ReportSummary } from "@web/api/types";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import { JsonPreview } from "@web/components/JsonPreview";
import { ViewModeToggle, type ViewMode } from "@web/components/ViewModeToggle";
import { useAuth } from "@web/contexts/AuthContext";
import { useToast } from "@web/contexts/ToastContext";
import { formatDate } from "@web/lib/labels";

function mapSummaryToMetrics(summary: ReportSummary): DashboardMetrics {
	return {
		totalExtinguishers: summary.inventory.total,
		activeExtinguishers: summary.inventory.byStatus.active ?? 0,
		expiredExtinguishers: summary.compliance.expired,
		needsMaintenance: summary.compliance.needsMaintenance,
		scheduledInspections: summary.inspections.pending,
		overdueInspections: summary.inspections.overdue,
		completedInspectionsThisMonth: summary.inspections.completed,
	};
}

export function DashboardPage() {
	const { user } = useAuth();
	const isStaff = user?.role === "admin" || user?.role === "inspector";
	const toast = useToast();
	const [summaryRaw, setSummaryRaw] = useState<ReportSummary | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("ui");
	const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
	const [unreadCount, setUnreadCount] = useState(0);
	const [generatedAt, setGeneratedAt] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;

		(async () => {
			setLoading(true);
			setError(null);
			try {
				const [summaryResult, notificationsResult] = await Promise.allSettled([
					reportsApi.summary(),
					notificationsApi.list(),
				]);

				if (!active) {
					return;
				}

				if (summaryResult.status === "fulfilled") {
					setSummaryRaw(summaryResult.value.data);
					setMetrics(mapSummaryToMetrics(summaryResult.value.data));
					setGeneratedAt(summaryResult.value.data.generatedAt);
				} else {
					throw summaryResult.reason;
				}

				if (notificationsResult.status === "fulfilled") {
					setUnreadCount(notificationsResult.value.unreadCount);
				}
			} catch (err) {
				if (active) {
					const message =
						err instanceof Error
							? err.message
							: "Unable to load dashboard metrics.";
					setError(message);
					toast.error(message);
				}
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		})();

		return () => {
			active = false;
		};
	}, []);

	if (loading) {
		return <LoadingState message="Loading dashboard..." />;
	}

	const cards = metrics
		? [
				{ label: "Total extinguishers", value: metrics.totalExtinguishers },
				{ label: "Active", value: metrics.activeExtinguishers },
				{ label: "Expired", value: metrics.expiredExtinguishers },
				{ label: "Needs maintenance", value: metrics.needsMaintenance },
				{
					label: "Scheduled inspections",
					value: metrics.scheduledInspections,
				},
				{ label: "Overdue inspections", value: metrics.overdueInspections },
				{
					label: "Completed this month",
					value: metrics.completedInspectionsThisMonth,
				},
				{ label: "Unread notifications", value: unreadCount },
			]
		: [];

	return (
		<div className="page">
			<PageHeader
				title="Dashboard"
				description={
					generatedAt
						? `Summary as of ${formatDate(generatedAt)}`
						: "Operational overview for fire extinguisher management"
				}
				actions={
					<div className="page-header__action-group">
						<ViewModeToggle mode={viewMode} onChange={setViewMode} />
						<Link to="/extinguishers" className="btn btn-primary">
							View extinguishers
						</Link>
					</div>
				}
			/>
			{error ? <ErrorAlert message={error} onDismiss={() => setError(null)} /> : null}
			{viewMode === "json" && summaryRaw ? (
				<JsonPreview data={{ report: summaryRaw }} label="Dashboard metrics (JSON)" />
			) : null}
			{viewMode === "ui" ? (
			<>
			<div className="metric-grid">
				{cards.map((card) => (
					<article key={card.label} className="metric-card">
						<p className="metric-card__label">{card.label}</p>
						<p className="metric-card__value">{card.value}</p>
					</article>
				))}
			</div>
			<section className="panel">
				<h2 className="panel__title">Quick actions</h2>
				<div className="action-row">
					{isStaff ? (
						<Link to="/extinguishers/new" className="btn btn-secondary">
							Add extinguisher
						</Link>
					) : null}
					<Link to="/notifications" className="btn btn-secondary">
						Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
					</Link>
					<Link to="/inspections" className="btn btn-secondary">
						Schedule inspection
					</Link>
					{isStaff ? (
						<Link to="/reports" className="btn btn-secondary">
							View reports
						</Link>
					) : null}
				</div>
			</section>
			</>
			) : null}
		</div>
	);
}
