import { useCallback, useEffect, useState } from "react";
import { userRoleSchema } from "@repo/contracts";

import { usersApi } from "@web/api/users";
import { ApiError } from "@web/api/client";
import type { User } from "@web/api/types";
import { EmptyState } from "@web/components/EmptyState";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import { StatusBadge } from "@web/components/StatusBadge";
import { formatDate, formatUserName, roleLabels } from "@web/lib/labels";

export function AdminUsersPage() {
	const [items, setItems] = useState<User[]>([]);
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [updatingId, setUpdatingId] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await usersApi.list({
				search: search || undefined,
				role: roleFilter ? userRoleSchema.parse(roleFilter) : undefined,
			});
			setItems(response.data);
		} catch (err) {
			setError(
				err instanceof ApiError ? err.message : "Unable to load users.",
			);
		} finally {
			setLoading(false);
		}
	}, [search, roleFilter]);

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
			await load();
		} catch (err) {
			setError(
				err instanceof ApiError ? err.message : "Unable to update user role.",
			);
		} finally {
			setUpdatingId(null);
		}
	};

	return (
		<div className="page">
			<PageHeader
				title="Users"
				description="Manage account roles and access levels."
			/>

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
					<button type="button" className="btn btn-secondary" onClick={() => void load()}>
						Apply filters
					</button>
				</div>
			</section>

			{error ? <ErrorAlert message={error} onDismiss={() => setError(null)} /> : null}

			{loading ? (
				<LoadingState message="Loading users..." />
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
								<th scope="col">Update role</th>
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
