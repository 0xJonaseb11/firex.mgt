import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { extinguisherFilterSchema } from "@repo/contracts";

import { extinguishersApi } from "@web/api/extinguishers";
import { ApiError } from "@web/api/client";
import type { Extinguisher } from "@web/api/types";
import { EmptyState } from "@web/components/EmptyState";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { JsonPreview } from "@web/components/JsonPreview";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import { StatusBadge } from "@web/components/StatusBadge";
import { ViewModeToggle, type ViewMode } from "@web/components/ViewModeToggle";
import { useAuth } from "@web/contexts/AuthContext";
import { useToast } from "@web/contexts/ToastContext";
import {
	extinguisherStatusLabels,
	extinguisherTypeLabels,
	formatDate,
} from "@web/lib/labels";

export function ExtinguishersPage() {
	const { user } = useAuth();
	const toast = useToast();
	const canManage =
		user?.role === "admin" || user?.role === "inspector";

	const [items, setItems] = useState<Extinguisher[]>([]);
	const [rawPayload, setRawPayload] = useState<unknown>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("ui");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("");
	const [type, setType] = useState("");

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const filters = extinguisherFilterSchema.parse({
				search: search || undefined,
				status: status || undefined,
				type: type || undefined,
			});
			const response = await extinguishersApi.list(filters);
			setItems(response.data);
			setRawPayload(response.raw);
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to load extinguishers.";
			setError(message);
			toast.error(message);
		} finally {
			setLoading(false);
		}
	}, [search, status, type, toast]);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<div className="page">
			<PageHeader
				title="Extinguishers"
				description="Track inventory, locations, and compliance status."
				actions={
					<div className="page-header__action-group">
						<ViewModeToggle mode={viewMode} onChange={setViewMode} />
						{canManage ? (
							<Link to="/extinguishers/new" className="btn btn-primary">
								Add extinguisher
							</Link>
						) : null}
					</div>
				}
			/>

			<section className="panel filters-panel">
				<div className="filters-row">
					<FormField
						label="Search"
						name="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Serial number or location"
					/>
					<FormField
						as="select"
						label="Status"
						name="status"
						value={status}
						onChange={(event) => setStatus(event.target.value)}
					>
						<option value="">All statuses</option>
						{Object.entries(extinguisherStatusLabels).map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</FormField>
					<FormField
						as="select"
						label="Type"
						name="type"
						value={type}
						onChange={(event) => setType(event.target.value)}
					>
						<option value="">All types</option>
						{Object.entries(extinguisherTypeLabels).map(([value, label]) => (
							<option key={value} value={value}>
								{label}
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
				<LoadingState message="Loading extinguishers..." />
			) : viewMode === "json" ? (
				<JsonPreview data={rawPayload ?? { items }} />
			) : items.length === 0 ? (
				<EmptyState
					title="No extinguishers found"
					description="Adjust filters or add a new extinguisher."
					action={
						canManage ? (
							<Link to="/extinguishers/new" className="btn btn-primary">
								Add extinguisher
							</Link>
						) : undefined
					}
				/>
			) : (
				<div className="table-wrap">
					<table className="data-table">
						<thead>
							<tr>
								<th scope="col">Serial</th>
								<th scope="col">Location</th>
								<th scope="col">Type</th>
								<th scope="col">Status</th>
								<th scope="col">Expiry</th>
								<th scope="col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item) => (
								<tr key={item.id}>
									<td>{item.serialNumber}</td>
									<td>{item.location}</td>
									<td>
										{extinguisherTypeLabels[
											item.type as keyof typeof extinguisherTypeLabels
										] ?? item.type}
									</td>
									<td>
										<StatusBadge
											value={item.status}
											label={
												extinguisherStatusLabels[
													item.status as keyof typeof extinguisherStatusLabels
												]
											}
										/>
									</td>
									<td>{formatDate(item.expiryDate)}</td>
									<td>
										<Link
											to={`/extinguishers/${item.id}`}
											className="link-button"
										>
											View
										</Link>
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
