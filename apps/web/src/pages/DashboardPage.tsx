import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { notificationsApi } from "@web/api/notifications";
import { reportsApi } from "@web/api/reports";
import type { DashboardMetrics, ReportSummary } from "@web/api/types";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import { useAuth } from "@web/contexts/AuthContext";
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
					setError(
						err instanceof Error
							? err.message
							: "Unable to load dashboard metrics.",
					);
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
					<Link to="/extinguishers" className="btn btn-primary">
						View extinguishers
					</Link>
				}
			/>
			{error ? <ErrorAlert message={error} /> : null}
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
		</div>
	);
}
