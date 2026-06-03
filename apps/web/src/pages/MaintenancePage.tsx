import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createMaintenanceSchema, maintenanceFilterSchema } from "@repo/contracts";

import { extinguishersApi } from "@web/api/extinguishers";
import { maintenanceApi } from "@web/api/maintenance";
import { ApiError } from "@web/api/client";
import type { Extinguisher, MaintenanceRecord } from "@web/api/types";
import { EmptyState } from "@web/components/EmptyState";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { LoadingState } from "@web/components/LoadingState";
import { JsonPreview } from "@web/components/JsonPreview";
import { PageHeader } from "@web/components/PageHeader";
import { ViewModeToggle, type ViewMode } from "@web/components/ViewModeToggle";
import { useToast } from "@web/contexts/ToastContext";
import { formatDate, formatUserName } from "@web/lib/labels";
import { zodFieldErrors } from "@web/lib/form-errors";

const formDefaults = {
	extinguisherId: "",
	actionTaken: "",
	maintenanceDate: "",
	issuesIdentified: "",
	notes: "",
};

export function MaintenancePage() {
	const toast = useToast();
	const [items, setItems] = useState<MaintenanceRecord[]>([]);
	const [rawPayload, setRawPayload] = useState<unknown>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("ui");
	const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
	const [form, setForm] = useState(formDefaults);
	const [fieldErrors, setFieldErrors] = useState<
		Record<string, string | undefined>
	>({});
	const [extinguisherFilter, setExtinguisherFilter] = useState("");
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const filters = maintenanceFilterSchema.parse({
				extinguisherId: extinguisherFilter || undefined,
			});
			const [maintenanceResponse, extinguishersResponse] = await Promise.all([
				maintenanceApi.list(filters),
				extinguishersApi.list({ limit: 100 }),
			]);
			setItems(maintenanceResponse.data);
			setRawPayload(maintenanceResponse.raw);
			setExtinguishers(extinguishersResponse.data);
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to load maintenance records.";
			setError(message);
			toast.error(message);
		} finally {
			setLoading(false);
		}
	}, [extinguisherFilter, toast]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setFieldErrors({});
		const parsed = createMaintenanceSchema.safeParse({
			...form,
			issuesIdentified: form.issuesIdentified || undefined,
			notes: form.notes || undefined,
		});
		if (!parsed.success) {
			setFieldErrors(zodFieldErrors(parsed.error));
			return;
		}

		setSubmitting(true);
		try {
			await maintenanceApi.create(parsed.data);
			toast.success("Maintenance activity logged.");
			setForm(formDefaults);
			setShowForm(false);
			await load();
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to create maintenance record.";
			setError(message);
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="page">
			<PageHeader
				title="Maintenance log"
				description="Record service actions and identified issues."
				actions={
					<div className="page-header__action-group">
						<ViewModeToggle mode={viewMode} onChange={setViewMode} />
						<button
							type="button"
							className="btn btn-primary"
							onClick={() => setShowForm((value) => !value)}
						>
							{showForm ? "Close form" : "Log maintenance"}
						</button>
					</div>
				}
			/>

			{error ? <ErrorAlert message={error} onDismiss={() => setError(null)} /> : null}

			{showForm ? (
				<form className="panel form-stack" onSubmit={handleSubmit} noValidate>
					<h2 className="panel__title">New maintenance record</h2>
					<FormField
						as="select"
						label="Extinguisher"
						name="extinguisherId"
						value={form.extinguisherId}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								extinguisherId: event.target.value,
							}))
						}
						error={fieldErrors.extinguisherId}
						required
					>
						<option value="">Select extinguisher</option>
						{extinguishers.map((item) => (
							<option key={item.id} value={item.id}>
								{item.serialNumber} - {item.location}
							</option>
						))}
					</FormField>
					<FormField
						label="Maintenance date"
						type="date"
						name="maintenanceDate"
						value={form.maintenanceDate}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								maintenanceDate: event.target.value,
							}))
						}
						error={fieldErrors.maintenanceDate}
						required
					/>
					<FormField
						label="Action taken"
						name="actionTaken"
						value={form.actionTaken}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								actionTaken: event.target.value,
							}))
						}
						error={fieldErrors.actionTaken}
						required
					/>
					<FormField
						as="textarea"
						label="Issues identified"
						name="issuesIdentified"
						rows={3}
						value={form.issuesIdentified}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								issuesIdentified: event.target.value,
							}))
						}
						error={fieldErrors.issuesIdentified}
					/>
					<FormField
						as="textarea"
						label="Notes"
						name="notes"
						rows={3}
						value={form.notes}
						onChange={(event) =>
							setForm((current) => ({ ...current, notes: event.target.value }))
						}
						error={fieldErrors.notes}
					/>
					<button type="submit" className="btn btn-primary" disabled={submitting}>
						{submitting ? "Saving..." : "Save record"}
					</button>
				</form>
			) : null}

			<section className="panel filters-panel">
				<FormField
					as="select"
					label="Filter by extinguisher"
					name="extinguisherFilter"
					value={extinguisherFilter}
					onChange={(event) => setExtinguisherFilter(event.target.value)}
				>
					<option value="">All extinguishers</option>
					{extinguishers.map((item) => (
						<option key={item.id} value={item.id}>
							{item.serialNumber}
						</option>
					))}
				</FormField>
			</section>

			{loading ? (
				<LoadingState message="Loading maintenance records..." />
			) : viewMode === "json" ? (
				<JsonPreview data={rawPayload ?? { items }} />
			) : items.length === 0 ? (
				<EmptyState
					title="No maintenance records"
					description="Log the first maintenance action for an extinguisher."
				/>
			) : (
				<div className="table-wrap">
					<table className="data-table">
						<thead>
							<tr>
								<th scope="col">Date</th>
								<th scope="col">Extinguisher</th>
								<th scope="col">Action</th>
								<th scope="col">Performed by</th>
								<th scope="col">Issues</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item) => (
								<tr key={item.id}>
									<td>{formatDate(item.maintenanceDate)}</td>
									<td>
										{item.extinguisher?.serialNumber ?? item.extinguisherId}
									</td>
									<td>{item.actionTaken}</td>
									<td>
										{item.performedBy
											? formatUserName(
													item.performedBy.firstName,
													item.performedBy.lastName,
												)
											: item.performedById}
									</td>
									<td>{item.issuesIdentified ?? "None recorded"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
