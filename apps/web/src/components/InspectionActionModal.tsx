import { useEffect, useState } from "react";

import type { Inspection } from "@web/api/types";
import { FormField } from "@web/components/FormField";
import { formatDate, formatUserBrief } from "@web/lib/labels";

export type InspectionActionType = "complete" | "cancel";

interface InspectionActionModalProps {
	open: boolean;
	type: InspectionActionType;
	inspection: Inspection | null;
	submitting: boolean;
	onClose: () => void;
	onSubmit: (value: string) => void;
}

export function InspectionActionModal({
	open,
	type,
	inspection,
	submitting,
	onClose,
	onSubmit,
}: InspectionActionModalProps) {
	const [value, setValue] = useState("");

	useEffect(() => {
		if (open) {
			setValue("");
		}
	}, [open, type, inspection?.id]);

	if (!open || !inspection) {
		return null;
	}

	const isComplete = type === "complete";
	const title = isComplete ? "Complete inspection" : "Cancel inspection";
	const label = isComplete ? "Completion notes (optional)" : "Cancel reason (optional)";

	return (
		<div className="modal-overlay" role="presentation" onClick={onClose}>
			<div
				className="modal-dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby="inspection-action-title"
				onClick={(event) => event.stopPropagation()}
			>
				<h2 id="inspection-action-title" className="modal-dialog__title">
					{title}
				</h2>
				<p className="modal-dialog__summary">
					<strong>
						{inspection.extinguisher?.serialNumber ?? inspection.extinguisherId}
					</strong>
					{inspection.extinguisher?.location
						? ` · ${inspection.extinguisher.location}`
						: null}
					<br />
					{formatDate(inspection.scheduledDate)} at {inspection.scheduledTime}
					<br />
					Inspector:{" "}
					{inspection.assignedInspector
						? formatUserBrief(inspection.assignedInspector)
						: "Unassigned"}
				</p>
				<FormField
					as="textarea"
					label={label}
					name="action-notes"
					rows={3}
					value={value}
					onChange={(event) => setValue(event.target.value)}
				/>
				<div className="modal-dialog__actions">
					<button
						type="button"
						className="btn btn-secondary"
						onClick={onClose}
						disabled={submitting}
					>
						Close
					</button>
					<button
						type="button"
						className={`btn ${isComplete ? "btn-primary" : "btn-danger"}`}
						disabled={submitting}
						onClick={() => onSubmit(value)}
					>
						{submitting
							? "Saving..."
							: isComplete
								? "Mark complete"
								: "Cancel inspection"}
					</button>
				</div>
			</div>
		</div>
	);
}
