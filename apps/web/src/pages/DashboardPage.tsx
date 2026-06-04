import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { dashboardApi } from "@web/api/dashboard";
import { notificationsApi } from "@web/api/notifications";
import type { DashboardData } from "@web/api/types";
import { ApiError } from "@web/api/client";
import { BarChart } from "@web/components/dashboard/BarChart";
import { DonutChart } from "@web/components/dashboard/DonutChart";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import { StatusBadge } from "@web/components/StatusBadge";
import { JsonPreview } from "@web/components/JsonPreview";
import { ViewModeToggle, type ViewMode } from "@web/components/ViewModeToggle";
import { useAuth } from "@web/contexts/AuthContext";
import { useToast } from "@web/contexts/ToastContext";
import { formatDate, roleLabels } from "@web/lib/labels";

function highlightAccentClass(accent?: string) {
	if (!accent) {
		return "";
	}
	return `metric-card--accent-${accent}`;
}

export function DashboardPage() {
	const { user } = useAuth();
	const toast = useToast();
	const [dashboard, setDashboard] = useState<DashboardData | null>(null);
	const [rawPayload, setRawPayload] = useState<unknown>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("ui");
	const [unreadCount, setUnreadCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!user) {
			return;
		}

		let active = true;

		(async () => {
			setLoading(true);
			setError(null);
			try {
				const [dashboardResult, notificationsResult] =
					await Promise.allSettled([
						dashboardApi.get(),
						notificationsApi.list(),
					]);

				if (!active) {
					return;
				}

				if (dashboardResult.status === "fulfilled") {
					setDashboard(dashboardResult.value.data);
					setRawPayload(dashboardResult.value);
				} else {
					throw dashboardResult.reason;
				}

				if (notificationsResult.status === "fulfilled") {
					setUnreadCount(notificationsResult.value.unreadCount);
				}
			} catch (err) {
				if (active) {
					const message =
						err instanceof ApiError
							? err.message
							: "Unable to load dashboard.";
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
	}, [user, toast]);

	if (loading || !user) {
		return <LoadingState message="Loading dashboard..." />;
	}

	if (!dashboard) {
		return (
			<div className="page">
				<ErrorAlert message={error ?? "Dashboard unavailable."} />
			</div>
		);
	}

	const overdueKey =
		user.role === "user" ? "myOverdueInspections" : "overdueInspections";
	const overdueCount = dashboard.metrics[overdueKey] ?? 0;

	const inspectionChartTitle =
		user.role === "admin"
			? "All inspections by status"
			: user.role === "inspector"
				? "Your inspections (assigned + open queue)"
				: "Your inspection requests by status";

	const fleetChartTitle =
		user.role === "user"
			? "Fleet health (read-only)"
			: "Extinguisher fleet by status";

	const typeChartTitle =
		user.role === "user"
			? "Fleet mix by extinguisher type"
			: "Extinguishers by type";

	const pageTitle = dashboard.greeting ?? `Welcome, ${user.firstName}`;

	return (
		<div className="page">
			<section className={`dashboard-hero dashboard-hero--${user.role}`}>
				<div className="dashboard-hero__content">
					<p className="dashboard-hero__eyebrow">TZW FireEx</p>
					<h1 className="dashboard-hero__title">{pageTitle}</h1>
					<p className="dashboard-hero__scope">
						<span
							className={`dashboard-role-badge dashboard-role-badge--${user.role}`}
						>
							{roleLabels[user.role]}
						</span>
						{dashboard.scope}
					</p>
					<p className="dashboard-hero__meta">
						Updated {formatDate(dashboard.generatedAt)}
					</p>
				</div>
				<div className="dashboard-hero__actions">
					<ViewModeToggle mode={viewMode} onChange={setViewMode} />
					{user.role === "user" ? (
						<Link to="/inspections" className="btn btn-primary">
							Schedule inspection
						</Link>
					) : (
						<Link to="/extinguishers" className="btn btn-primary">
							View extinguishers
						</Link>
					)}
				</div>
			</section>

			{error ? <ErrorAlert message={error} onDismiss={() => setError(null)} /> : null}

			{overdueCount > 0 ? (
				<div className="dashboard-alert" role="status">
					<strong>
						{overdueCount} overdue inspection
						{overdueCount === 1 ? "" : "s"}
					</strong>
					<span>
						{user.role === "user"
							? " — inspections you requested need follow-up."
							: " — review assigned and open-queue work."}
					</span>
					<Link to="/inspections" className="dashboard-alert__link">
						View inspections
					</Link>
				</div>
			) : null}

			{viewMode === "json" ? (
				<JsonPreview data={rawPayload ?? { dashboard }} />
			) : (
				<>
					<section className="dashboard-highlights">
						{dashboard.highlights.map((card) => {
							const className = [
								"metric-card",
								"metric-card--link",
								highlightAccentClass(card.accent),
							]
								.filter(Boolean)
								.join(" ");

							const body = (
								<>
									<p className="metric-card__label">{card.label}</p>
									<p className="metric-card__value">{card.value}</p>
								</>
							);

							return card.to ? (
								<Link key={card.label} to={card.to} className={className}>
									{body}
								</Link>
							) : (
								<article key={card.label} className={className}>
									{body}
								</article>
							);
						})}
						<Link
							to="/notifications"
							className="metric-card metric-card--link metric-card--accent-mist"
						>
							<p className="metric-card__label">Unread notifications</p>
							<p className="metric-card__value">{unreadCount}</p>
						</Link>
					</section>

					{user.role === "user" &&
					dashboard.upcomingInspections &&
					dashboard.upcomingInspections.length > 0 ? (
						<section className="panel dashboard-upcoming">
							<h2 className="panel__title">Your upcoming inspections</h2>
							<ul className="dashboard-upcoming-list">
								{dashboard.upcomingInspections.map((item) => (
									<li key={item.id} className="dashboard-upcoming-list__item">
										<div>
											<p className="dashboard-upcoming-list__serial">
												{item.extinguisherSerial}
											</p>
											<p className="dashboard-upcoming-list__location">
												{item.extinguisherLocation}
											</p>
											<p className="dashboard-upcoming-list__when">
												{formatDate(item.scheduledDate)} at{" "}
												{item.scheduledTime}
											</p>
										</div>
										<StatusBadge value={item.status} />
									</li>
								))}
							</ul>
							<Link to="/inspections" className="btn btn-secondary btn-sm">
								Manage my inspections
							</Link>
						</section>
					) : null}

					<div className="dashboard-charts">
						<DonutChart title={fleetChartTitle} segments={dashboard.charts.extinguisherStatus} />
						<BarChart
							title={inspectionChartTitle}
							segments={dashboard.charts.inspectionStatus}
							showZeros
							emptyLabel={
								user.role === "user"
									? "No inspections scheduled yet — use Schedule inspection to add one."
									: "No data yet"
							}
						/>
						{dashboard.charts.extinguisherTypes ? (
							<BarChart
								title={typeChartTitle}
								segments={dashboard.charts.extinguisherTypes}
							/>
						) : null}
						{dashboard.charts.userRoles ? (
							<DonutChart
								title="Users by role (admin only)"
								segments={dashboard.charts.userRoles}
							/>
						) : null}
					</div>

					<section className="panel dashboard-access-panel">
						<h2 className="panel__title">Your access</h2>
						<ul className="dashboard-access-list">
							<li>
								{dashboard.permissions.canViewUsers
									? "Manage users"
									: "User management restricted to administrators"}
							</li>
							<li>
								{dashboard.permissions.canViewReports
									? "View organization reports"
									: "Reports restricted to inspectors and administrators"}
							</li>
							<li>
								{dashboard.permissions.canScheduleInspections
									? user.role === "user"
										? "Schedule inspections (inspector team fulfills them)"
										: "Schedule and manage inspections"
									: "Inspection scheduling unavailable"}
							</li>
							<li>
								{dashboard.permissions.canAssignInspector
									? "Assign inspections to inspectors"
									: "Cannot assign inspectors — requests join the open queue"}
							</li>
							<li>
								{dashboard.permissions.canViewMaintenance
									? "Log and view maintenance"
									: "Maintenance logging restricted to staff"}
							</li>
						</ul>
					</section>

					<section className="panel">
						<h2 className="panel__title">Quick actions</h2>
						<div className="action-row">
							{dashboard.permissions.canManageInventory ? (
								<Link to="/extinguishers/new" className="btn btn-secondary">
									Add extinguisher
								</Link>
							) : null}
							<Link to="/notifications" className="btn btn-secondary">
								Notifications
								{unreadCount > 0 ? ` (${unreadCount})` : ""}
							</Link>
							<Link to="/inspections" className="btn btn-secondary">
								{user.role === "user"
									? "My inspections"
									: "Inspections"}
							</Link>
							{user.role === "user" ? (
								<Link to="/extinguishers" className="btn btn-secondary">
									Browse fleet
								</Link>
							) : null}
							{dashboard.permissions.canViewReports ? (
								<Link to="/reports" className="btn btn-secondary">
									Reports
								</Link>
							) : null}
							{dashboard.permissions.canViewUsers ? (
								<Link to="/users" className="btn btn-secondary">
									Users
								</Link>
							) : null}
						</div>
					</section>
				</>
			)}
		</div>
	);
}
