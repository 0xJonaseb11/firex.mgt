import { useCallback, useEffect, useState } from "react";

import { notificationsApi } from "@web/api/notifications";
import { ApiError } from "@web/api/client";
import type { NotificationItem } from "@web/api/types";
import { EmptyState } from "@web/components/EmptyState";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { JsonPreview } from "@web/components/JsonPreview";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import { ViewModeToggle, type ViewMode } from "@web/components/ViewModeToggle";
import { useToast } from "@web/contexts/ToastContext";
import { formatDate } from "@web/lib/labels";

export function NotificationsPage() {
	const toast = useToast();
	const [items, setItems] = useState<NotificationItem[]>([]);
	const [rawPayload, setRawPayload] = useState<unknown>(null);
	const [unreadCount, setUnreadCount] = useState(0);
	const [unreadOnly, setUnreadOnly] = useState(false);
	const [viewMode, setViewMode] = useState<ViewMode>("ui");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [markingId, setMarkingId] = useState<string | null>(null);
	const [markingAll, setMarkingAll] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await notificationsApi.list({
				unreadOnly: unreadOnly || undefined,
			});
			setItems(response.items);
			setUnreadCount(response.unreadCount);
			setRawPayload(response.raw);
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to load notifications.";
			setError(message);
			toast.error(message);
		} finally {
			setLoading(false);
		}
	}, [toast, unreadOnly]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleMarkRead = async (id: string) => {
		setMarkingId(id);
		try {
			await notificationsApi.markRead(id);
			toast.success("Notification marked as read.");
			await load();
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to update notification.";
			toast.error(message);
		} finally {
			setMarkingId(null);
		}
	};

	const handleMarkAllRead = async () => {
		setMarkingAll(true);
		try {
			const response = await notificationsApi.markAllRead();
			toast.success(
				response.updated > 0
					? `${response.updated} notification(s) marked as read.`
					: "No unread notifications.",
			);
			await load();
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to mark notifications as read.";
			toast.error(message);
		} finally {
			setMarkingAll(false);
		}
	};

	return (
		<div className="page">
			<PageHeader
				title="Notifications"
				description={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
				actions={
					<div className="page-header__action-group">
						<ViewModeToggle mode={viewMode} onChange={setViewMode} />
						<button
							type="button"
							className="btn btn-secondary"
							disabled={markingAll || unreadCount === 0}
							onClick={() => void handleMarkAllRead()}
						>
							{markingAll ? "Updating..." : "Mark all read"}
						</button>
					</div>
				}
			/>

			<section className="panel filters-panel">
				<label className="form-field">
					<span className="form-field__label">Show unread only</span>
					<input
						type="checkbox"
						checked={unreadOnly}
						onChange={(event) => setUnreadOnly(event.target.checked)}
					/>
				</label>
			</section>

			{error ? <ErrorAlert message={error} onDismiss={() => setError(null)} /> : null}

			{loading ? (
				<LoadingState message="Loading notifications..." />
			) : viewMode === "json" ? (
				<JsonPreview data={rawPayload ?? { items, unreadCount }} />
			) : items.length === 0 ? (
				<EmptyState
					title="No notifications"
					description={
						unreadOnly
							? "You have no unread notifications."
							: "Alerts about inspections and maintenance will appear here."
					}
				/>
			) : (
				<ul className="notification-list">
					{items.map((item) => (
						<li
							key={item.id}
							className={
								item.read
									? "notification-list__item"
									: "notification-list__item notification-list__item--unread"
							}
						>
							<div className="notification-list__content">
								<p className="notification-list__title">{item.title}</p>
								<p className="notification-list__message">{item.message}</p>
								<p className="notification-list__meta">{formatDate(item.createdAt)}</p>
							</div>
							{!item.read ? (
								<button
									type="button"
									className="btn btn-secondary btn-sm"
									disabled={markingId === item.id}
									onClick={() => void handleMarkRead(item.id)}
								>
									{markingId === item.id ? "Saving..." : "Mark read"}
								</button>
							) : null}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
