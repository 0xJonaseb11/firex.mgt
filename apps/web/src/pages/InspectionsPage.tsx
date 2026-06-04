import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
	cancelInspectionSchema,
	completeInspectionSchema,
	inspectionFilterSchema,
	scheduleInspectionSchema,
} from "@tzw-firex/contracts";

import { extinguishersApi } from "@web/api/extinguishers";
import { inspectionsApi } from "@web/api/inspections";
import { usersApi } from "@web/api/users";
import { ApiError } from "@web/api/client";
import type { Extinguisher, Inspection, User } from "@web/api/types";
import { EmptyState } from "@web/components/EmptyState";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import { StatusBadge } from "@web/components/StatusBadge";
import {
	InspectionActionModal,
	type InspectionActionType,
} from "@web/components/InspectionActionModal";
import { JsonPreview } from "@web/components/JsonPreview";
import { ViewModeToggle, type ViewMode } from "@web/components/ViewModeToggle";
import { useAuth } from "@web/contexts/AuthContext";
import { useToast } from "@web/contexts/ToastContext";
import {
	formatDate,
	formatUserBrief,
	inspectionStatusLabels,
} from "@web/lib/labels";
import { zodFieldErrors } from "@web/lib/form-errors";

const scheduleDefaults = {
	extinguisherId: "",
	assignedInspectorId: "",
	scheduledDate: "",
	scheduledTime: "09:00",
	notes: "",
};

export function InspectionsPage() {
	const { user } = useAuth();
	const toast = useToast();
	const canAssignInspector =
		user?.role === "admin" || user?.role === "inspector";
	const pageDescription =
		user?.role === "user"
			? "Schedule inspections for extinguishers. Requests go to the inspector team — you cannot assign staff directly."
			: "Schedule, assign, complete, and track extinguisher inspections.";

	const [items, setItems] = useState<Inspection[]>([]);
	const [rawPayload, setRawPayload] = useState<unknown>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("ui");
	const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
	const [inspectors, setInspectors] = useState<
		Pick<User, "id" | "firstName" | "lastName" | "role">[]
	>([]);
	const [statusFilter, setStatusFilter] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [showSchedule, setShowSchedule] = useState(false);
	const [scheduleForm, setScheduleForm] = useState(scheduleDefaults);
	const [scheduleErrors, setScheduleErrors] = useState<
		Record<string, string | undefined>
	>({});
	const [scheduling, setScheduling] = useState(false);

	const [actionModal, setActionModal] = useState<{
		type: InspectionActionType;
		inspection: Inspection;
	} | null>(null);
	const [actionSubmitting, setActionSubmitting] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const filters = inspectionFilterSchema.parse({
				status: statusFilter || undefined,
			});
			const [inspectionsResponse, extinguishersResponse, inspectorsResponse] =
				await Promise.all([
					inspectionsApi.list({ ...filters, limit: 100 }),
					extinguishersApi.list({ limit: 100 }),
					canAssignInspector
						? usersApi.listInspectors()
						: Promise.resolve({ data: [] }),
				]);
			setItems(inspectionsResponse.data);
			setRawPayload(inspectionsResponse.raw);
			setExtinguishers(extinguishersResponse.data);
			setInspectors(inspectorsResponse.data);
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to load inspections.";
			setError(message);
			toast.error(message);
		} finally {
			setLoading(false);
		}
	}, [statusFilter, toast, canAssignInspector]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleSchedule = async (event: FormEvent) => {
		event.preventDefault();
		setScheduleErrors({});
		const parsed = scheduleInspectionSchema.safeParse({
			...scheduleForm,
			assignedInspectorId: scheduleForm.assignedInspectorId || undefined,
			notes: scheduleForm.notes || undefined,
		});
		if (!parsed.success) {
			setScheduleErrors(zodFieldErrors(parsed.error));
			return;
		}

		setScheduling(true);
		try {
			await inspectionsApi.schedule(parsed.data);
			toast.success("Inspection scheduled.");
			setScheduleForm(scheduleDefaults);
			setShowSchedule(false);
			await load();
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to schedule inspection.";
			setError(message);
			toast.error(message);
		} finally {
			setScheduling(false);
		}
	};

	const handleActionSubmit = async (value: string) => {
		if (!actionModal) {
			return;
		}

		const { type, inspection } = actionModal;

		if (type === "complete") {
			const parsed = completeInspectionSchema.safeParse({
				notes: value || undefined,
			});
			if (!parsed.success) {
				setError(parsed.error.issues[0]?.message ?? "Invalid input");
				return;
			}

			setActionSubmitting(true);
			try {
				await inspectionsApi.complete(inspection.id, parsed.data);
				toast.success("Inspection marked complete.");
				setActionModal(null);
				await load();
			} catch (err) {
				const message =
					err instanceof ApiError
						? err.message
						: "Unable to complete inspection.";
				setError(message);
				toast.error(message);
			} finally {
				setActionSubmitting(false);
			}
			return;
		}

		const parsed = cancelInspectionSchema.safeParse({
			reason: value || undefined,
		});
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Invalid input");
			return;
		}

		setActionSubmitting(true);
		try {
			await inspectionsApi.cancel(inspection.id, parsed.data);
			toast.success("Inspection cancelled.");
			setActionModal(null);
			await load();
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to cancel inspection.";
			setError(message);
			toast.error(message);
		} finally {
			setActionSubmitting(false);
		}
	};

	return (
		<div className="page">
			<PageHeader
				title="Inspections"
				description={pageDescription}
				actions={
					<div className="page-header__action-group">
						<ViewModeToggle mode={viewMode} onChange={setViewMode} />
						<button
							type="button"
							className="btn btn-primary"
							onClick={() => setShowSchedule((value) => !value)}
						>
							{showSchedule ? "Close form" : "Schedule inspection"}
						</button>
					</div>
				}
			/>

			{error ? <ErrorAlert message={error} onDismiss={() => setError(null)} /> : null}

			{showSchedule ? (
				<form className="panel form-stack" onSubmit={handleSchedule} noValidate>
					<h2 className="panel__title">Schedule inspection</h2>
					<FormField
						as="select"
						label="Extinguisher"
						name="extinguisherId"
						value={scheduleForm.extinguisherId}
						onChange={(event) =>
							setScheduleForm((current) => ({
								...current,
								extinguisherId: event.target.value,
							}))
						}
						error={scheduleErrors.extinguisherId}
						required
					>
						<option value="">Select extinguisher</option>
						{extinguishers.map((item) => (
							<option key={item.id} value={item.id}>
								{item.serialNumber} - {item.location}
							</option>
						))}
					</FormField>
					<div className="form-row">
						<FormField
							label="Date"
							type="date"
							name="scheduledDate"
							value={scheduleForm.scheduledDate}
							onChange={(event) =>
								setScheduleForm((current) => ({
									...current,
									scheduledDate: event.target.value,
								}))
							}
							error={scheduleErrors.scheduledDate}
							required
						/>
						<FormField
							label="Time"
							type="time"
							name="scheduledTime"
							value={scheduleForm.scheduledTime}
							onChange={(event) =>
								setScheduleForm((current) => ({
									...current,
									scheduledTime: event.target.value,
								}))
							}
							error={scheduleErrors.scheduledTime}
							required
						/>
					</div>
					{canAssignInspector ? (
						<FormField
							as="select"
							label="Assign inspector (optional)"
							name="assignedInspectorId"
							value={scheduleForm.assignedInspectorId}
							onChange={(event) =>
								setScheduleForm((current) => ({
									...current,
									assignedInspectorId: event.target.value,
								}))
							}
							error={scheduleErrors.assignedInspectorId}
						>
							<option value="">Unassigned — visible to all inspectors</option>
							{inspectors.map((inspector) => (
								<option key={inspector.id} value={inspector.id}>
									{formatUserBrief(inspector)}
								</option>
							))}
						</FormField>
					) : (
						<p className="form-field__hint schedule-hint">
							Your inspection will be placed in the inspector queue. Staff
							assignment is managed by inspectors and administrators.
						</p>
					)}
					<FormField
						as="textarea"
						label="Notes"
						name="notes"
						rows={3}
						value={scheduleForm.notes}
						onChange={(event) =>
							setScheduleForm((current) => ({
								...current,
								notes: event.target.value,
							}))
						}
						error={scheduleErrors.notes}
					/>
					<button type="submit" className="btn btn-primary" disabled={scheduling}>
						{scheduling ? "Scheduling..." : "Schedule"}
					</button>
				</form>
			) : null}

			<section className="panel filters-panel">
				<FormField
					as="select"
					label="Status"
					name="status"
					value={statusFilter}
					onChange={(event) => setStatusFilter(event.target.value)}
				>
					<option value="">All statuses</option>
					{Object.entries(inspectionStatusLabels).map(([value, label]) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</FormField>
			</section>

			{loading ? (
				<LoadingState message="Loading inspections..." />
			) : viewMode === "json" ? (
				<JsonPreview data={rawPayload ?? { items }} />
			) : items.length === 0 ? (
				<EmptyState
					title="No inspections found"
					description="Schedule an inspection to get started."
				/>
			) : (
				<div className="table-wrap">
					<table className="data-table data-table--compact">
						<thead>
							<tr>
								<th scope="col">Extinguisher</th>
								<th scope="col">Scheduled</th>
								<th scope="col">Inspector</th>
								<th scope="col">Status</th>
								<th scope="col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item) => (
								<tr key={item.id}>
									<td>
										{item.extinguisher?.serialNumber ?? item.extinguisherId}
										{item.extinguisher?.location ? (
											<p className="table-subtext">{item.extinguisher.location}</p>
										) : null}
									</td>
									<td>
										{formatDate(item.scheduledDate)} at {item.scheduledTime}
									</td>
									<td>
										{item.assignedInspector ? (
											<span className="assignment-pill">
												{formatUserBrief(item.assignedInspector)}
											</span>
										) : (
											<span className="assignment-pill assignment-pill--muted">
												Open queue
											</span>
										)}
									</td>
									<td>
										<StatusBadge
											value={item.status}
											label={
												inspectionStatusLabels[
													item.status as keyof typeof inspectionStatusLabels
												]
											}
										/>
									</td>
									<td>
										{item.status === "scheduled" ||
										item.status === "overdue" ? (
											<div className="table-actions-inline">
												<button
													type="button"
													className="btn btn-secondary btn-sm"
													onClick={() =>
														setActionModal({
															type: "complete",
															inspection: item,
														})
													}
												>
													Complete
												</button>
												<button
													type="button"
													className="btn btn-danger btn-sm"
													onClick={() =>
														setActionModal({
															type: "cancel",
															inspection: item,
														})
													}
												>
													Cancel
												</button>
											</div>
										) : (
											<span className="table-muted">—</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			<InspectionActionModal
				open={actionModal !== null}
				type={actionModal?.type ?? "complete"}
				inspection={actionModal?.inspection ?? null}
				submitting={actionSubmitting}
				onClose={() => setActionModal(null)}
				onSubmit={(value) => void handleActionSubmit(value)}
			/>
		</div>
	);
}
