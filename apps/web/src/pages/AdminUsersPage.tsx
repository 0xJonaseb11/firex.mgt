import { useCallback, useEffect, useMemo, useState } from "react";
import { userRoleSchema } from "@repo/contracts";

import { usersApi } from "@web/api/users";
import { ApiError } from "@web/api/client";
import type { User } from "@web/api/types";
import { EmptyState } from "@web/components/EmptyState";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { JsonPreview } from "@web/components/JsonPreview";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import { StatusBadge } from "@web/components/StatusBadge";
import { ViewModeToggle, type ViewMode } from "@web/components/ViewModeToggle";
import { useAuth } from "@web/contexts/AuthContext";
import { useConfirm } from "@web/contexts/ConfirmContext";
import { useToast } from "@web/contexts/ToastContext";
import { formatDate, formatUserName, roleLabels } from "@web/lib/labels";

export function AdminUsersPage() {
	const { user: currentUser } = useAuth();
	const { confirm } = useConfirm();
	const toast = useToast();

	const [items, setItems] = useState<User[]>([]);
	const [rawPayload, setRawPayload] = useState<unknown>(null);
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState("");
	const [viewMode, setViewMode] = useState<ViewMode>("ui");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [updatingId, setUpdatingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const roleCounts = useMemo(() => {
		const counts = { user: 0, inspector: 0, admin: 0 };
		for (const item of items) {
			counts[item.role] += 1;
		}
		return counts;
	}, [items]);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await usersApi.list({
				search: search || undefined,
				role: roleFilter ? userRoleSchema.parse(roleFilter) : undefined,
			});
			setItems(response.data);
			setRawPayload(response.raw);
		} catch (err) {
			const message =
				err instanceof ApiError ? err.message : "Unable to load users.";
			setError(message);
			toast.error(message);
		} finally {
			setLoading(false);
		}
	}, [search, roleFilter, toast]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleRoleChange = async (userId: string, role: string) => {
		const parsedRole = userRoleSchema.safeParse(role);
		if (!parsedRole.success) {
			return;
		}

		setUpdatingId(userId);
		try {
			await usersApi.updateRole(userId, parsedRole.data);
			toast.success(`Role updated to ${roleLabels[parsedRole.data]}.`);
			await load();
		} catch (err) {
			const message =
				err instanceof ApiError ? err.message : "Unable to update user role.";
			setError(message);
			toast.error(message);
		} finally {
			setUpdatingId(null);
		}
	};

	const handleDelete = async (item: User) => {
		if (item.id === currentUser?.id) {
			toast.error("You cannot delete your own account while signed in.");
			return;
		}

		const confirmed = await confirm({
			title: "Delete user",
			message: `Permanently delete ${item.email}? This cannot be undone.`,
			confirmLabel: "Delete",
			variant: "danger",
		});
		if (!confirmed) {
			return;
		}

		setDeletingId(item.id);
		try {
			await usersApi.remove(item.id);
			toast.success(`User ${item.email} deleted.`);
			await load();
		} catch (err) {
			const message =
				err instanceof ApiError ? err.message : "Unable to delete user.";
			setError(message);
			toast.error(message);
		} finally {
			setDeletingId(null);
		}
	};

	return (
		<div className="page">
			<PageHeader
				title="Users"
				description="Manage account roles and access levels."
				actions={<ViewModeToggle mode={viewMode} onChange={setViewMode} />}
			/>

			<div className="metric-grid metric-grid--compact">
				<article className="metric-card">
					<p className="metric-card__label">Total users</p>
					<p className="metric-card__value">{items.length}</p>
				</article>
				<article className="metric-card">
					<p className="metric-card__label">Admins</p>
					<p className="metric-card__value">{roleCounts.admin}</p>
				</article>
				<article className="metric-card">
					<p className="metric-card__label">Inspectors</p>
					<p className="metric-card__value">{roleCounts.inspector}</p>
				</article>
				<article className="metric-card">
					<p className="metric-card__label">Standard users</p>
					<p className="metric-card__value">{roleCounts.user}</p>
				</article>
			</div>

			<section className="panel filters-panel">
				<div className="filters-row">
					<FormField
						label="Search"
						name="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Name or email"
					/>
					<FormField
						as="select"
						label="Role"
						name="role"
						value={roleFilter}
						onChange={(event) => setRoleFilter(event.target.value)}
					>
						<option value="">All roles</option>
						{userRoleSchema.options.map((value) => (
							<option key={value} value={value}>
								{roleLabels[value]}
							</option>
						))}
					</FormField>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => void load()}
					>
						Apply filters
					</button>
				</div>
			</section>

			{error ? <ErrorAlert message={error} onDismiss={() => setError(null)} /> : null}

			{loading ? (
				<LoadingState message="Loading users..." />
			) : viewMode === "json" ? (
				<JsonPreview data={rawPayload ?? { items, total: items.length }} />
			) : items.length === 0 ? (
				<EmptyState title="No users found" description="Adjust search filters." />
			) : (
				<div className="table-wrap">
					<table className="data-table">
						<thead>
							<tr>
								<th scope="col">Name</th>
								<th scope="col">Email</th>
								<th scope="col">Role</th>
								<th scope="col">Created</th>
								<th scope="col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item) => (
								<tr key={item.id}>
									<td>{formatUserName(item.firstName, item.lastName)}</td>
									<td>{item.email}</td>
									<td>
										<StatusBadge value={item.role} label={roleLabels[item.role]} />
									</td>
									<td>{formatDate(item.createdAt)}</td>
									<td>
										<div className="table-actions">
											<select
												className="form-field__control"
												value={item.role}
												disabled={updatingId === item.id}
												onChange={(event) =>
													void handleRoleChange(item.id, event.target.value)
												}
												aria-label={`Role for ${item.email}`}
											>
												{userRoleSchema.options.map((value) => (
													<option key={value} value={value}>
														{roleLabels[value]}
													</option>
												))}
											</select>
											<button
												type="button"
												className="btn btn-ghost btn-sm btn-danger-text"
												disabled={
													deletingId === item.id ||
													item.id === currentUser?.id
												}
												onClick={() => void handleDelete(item)}
											>
												{deletingId === item.id ? "Deleting..." : "Delete"}
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
