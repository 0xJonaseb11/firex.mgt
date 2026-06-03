import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
	cancelInspectionSchema,
	completeInspectionSchema,
	inspectionFilterSchema,
	scheduleInspectionSchema,
} from "@repo/contracts";

import { extinguishersApi } from "@web/api/extinguishers";
import { inspectionsApi } from "@web/api/inspections";
import { ApiError } from "@web/api/client";
import type { Extinguisher, Inspection } from "@web/api/types";
import { EmptyState } from "@web/components/EmptyState";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import { StatusBadge } from "@web/components/StatusBadge";
import { useConfirm } from "@web/contexts/ConfirmContext";
import { formatDate, formatUserName, inspectionStatusLabels } from "@web/lib/labels";
import { zodFieldErrors } from "@web/lib/form-errors";

const scheduleDefaults = {
	extinguisherId: "",
	scheduledDate: "",
	scheduledTime: "09:00",
	notes: "",
};

export function InspectionsPage() {
	const { confirm } = useConfirm();

	const [items, setItems] = useState<Inspection[]>([]);
	const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
	const [statusFilter, setStatusFilter] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [showSchedule, setShowSchedule] = useState(false);
	const [scheduleForm, setScheduleForm] = useState(scheduleDefaults);
	const [scheduleErrors, setScheduleErrors] = useState<
		Record<string, string | undefined>
	>({});
	const [scheduling, setScheduling] = useState(false);

	const [completeNotes, setCompleteNotes] = useState<Record<string, string>>({});
	const [cancelReason, setCancelReason] = useState<Record<string, string>>({});

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const filters = inspectionFilterSchema.parse({
				status: statusFilter || undefined,
			});
			const [inspectionsResponse, extinguishersResponse] = await Promise.all([
				inspectionsApi.list(filters),
				extinguishersApi.list({ limit: 100 }),
			]);
			setItems(inspectionsResponse.data);
			setExtinguishers(extinguishersResponse.data);
		} catch (err) {
			setError(
				err instanceof ApiError
					? err.message
					: "Unable to load inspections.",
			);
		} finally {
			setLoading(false);
		}
	}, [statusFilter]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleSchedule = async (event: FormEvent) => {
		event.preventDefault();
		setScheduleErrors({});
		const parsed = scheduleInspectionSchema.safeParse({
			...scheduleForm,
			notes: scheduleForm.notes || undefined,
		});
		if (!parsed.success) {
			setScheduleErrors(zodFieldErrors(parsed.error));
			return;
		}

		setScheduling(true);
		try {
			await inspectionsApi.schedule(parsed.data);
			setScheduleForm(scheduleDefaults);
			setShowSchedule(false);
			await load();
		} catch (err) {
			setError(
				err instanceof ApiError
					? err.message
					: "Unable to schedule inspection.",
			);
		} finally {
			setScheduling(false);
		}
	};

	const handleComplete = async (inspection: Inspection) => {
		const notes = completeNotes[inspection.id] ?? "";
		const parsed = completeInspectionSchema.safeParse({
			notes: notes || undefined,
		});
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Invalid input");
			return;
		}

		try {
			await inspectionsApi.complete(inspection.id, parsed.data);
			await load();
		} catch (err) {
			setError(
				err instanceof ApiError
					? err.message
					: "Unable to complete inspection.",
			);
		}
	};

	const handleCancel = async (inspection: Inspection) => {
		const confirmed = await confirm({
			title: "Cancel inspection",
			message: "Cancel this scheduled inspection?",
			confirmLabel: "Cancel inspection",
			variant: "danger",
		});
		if (!confirmed) {
			return;
		}

		const reason = cancelReason[inspection.id] ?? "";
		const parsed = cancelInspectionSchema.safeParse({
			reason: reason || undefined,
		});
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Invalid input");
			return;
		}

		try {
			await inspectionsApi.cancel(inspection.id, parsed.data);
			await load();
		} catch (err) {
			setError(
				err instanceof ApiError
					? err.message
					: "Unable to cancel inspection.",
			);
		}
	};

	return (
		<div className="page">
			<PageHeader
				title="Inspections"
				description="Schedule, complete, and track extinguisher inspections."
				actions={
					<button
						type="button"
						className="btn btn-primary"
						onClick={() => setShowSchedule((value) => !value)}
					>
						{showSchedule ? "Close form" : "Schedule inspection"}
					</button>
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
			) : items.length === 0 ? (
				<EmptyState
					title="No inspections found"
					description="Schedule an inspection to get started."
				/>
			) : (
				<div className="table-wrap">
					<table className="data-table">
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
										{item.assignedInspector
											? formatUserName(
													item.assignedInspector.firstName,
													item.assignedInspector.lastName,
												)
											: "Unassigned"}
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
									<td className="table-actions">
										{item.status === "scheduled" || item.status === "overdue" ? (
											<>
												<FormField
													label="Completion notes"
													name={`complete-${item.id}`}
													value={completeNotes[item.id] ?? ""}
													onChange={(event) =>
														setCompleteNotes((current) => ({
															...current,
															[item.id]: event.target.value,
														}))
													}
												/>
												<button
													type="button"
													className="btn btn-secondary btn-sm"
													onClick={() => void handleComplete(item)}
												>
													Complete
												</button>
												<FormField
													label="Cancel reason"
													name={`cancel-${item.id}`}
													value={cancelReason[item.id] ?? ""}
													onChange={(event) =>
														setCancelReason((current) => ({
															...current,
															[item.id]: event.target.value,
														}))
													}
												/>
												<button
													type="button"
													className="btn btn-danger btn-sm"
													onClick={() => void handleCancel(item)}
												>
													Cancel
												</button>
											</>
										) : (
											<span className="table-muted">No actions</span>
										)}
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
