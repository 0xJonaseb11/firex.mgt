import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
	createExtinguisherSchema,
	extinguisherSizeSchema,
	extinguisherStatusSchema,
	extinguisherTypeSchema,
	updateExtinguisherSchema,
} from "@repo/contracts";

import { extinguishersApi } from "@web/api/extinguishers";
import { ApiError } from "@web/api/client";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import {
	extinguisherSizeLabels,
	extinguisherStatusLabels,
	extinguisherTypeLabels,
} from "@web/lib/labels";
import { useToast } from "@web/contexts/ToastContext";
import { zodFieldErrors } from "@web/lib/form-errors";

const defaultValues = {
	serialNumber: "",
	location: "",
	type: "water" as const,
	size: "5 lbs." as const,
	installationDate: "",
	expiryDate: "",
	status: "active" as const,
};

export function ExtinguisherFormPage() {
	const { id } = useParams<{ id: string }>();
	const isEdit = Boolean(id);
	const navigate = useNavigate();
	const toast = useToast();

	const [form, setForm] = useState(defaultValues);
	const [fieldErrors, setFieldErrors] = useState<
		Record<string, string | undefined>
	>({});
	const [loading, setLoading] = useState(isEdit);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!id) {
			return;
		}

		let active = true;
		(async () => {
			setLoading(true);
			try {
				const response = await extinguishersApi.getById(id);
				if (!active) {
					return;
				}
				const item = response.data;
				setForm({
					serialNumber: item.serialNumber,
					location: item.location,
					type: item.type as typeof defaultValues.type,
					size: item.size as typeof defaultValues.size,
					installationDate: item.installationDate,
					expiryDate: item.expiryDate,
					status: item.status as typeof defaultValues.status,
				});
			} catch (err) {
				if (active) {
					setError(
						err instanceof ApiError
							? err.message
							: "Unable to load extinguisher.",
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
	}, [id]);

	const updateField = <K extends keyof typeof form>(
		key: K,
		value: (typeof form)[K],
	) => {
		setForm((current) => ({ ...current, [key]: value }));
	};

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setFieldErrors({});

		const schema = isEdit ? updateExtinguisherSchema : createExtinguisherSchema;
		const parsed = schema.safeParse(form);
		if (!parsed.success) {
			setFieldErrors(zodFieldErrors(parsed.error));
			return;
		}

		setSubmitting(true);
		try {
			if (isEdit && id) {
				await extinguishersApi.update(id, parsed.data);
				toast.success("Extinguisher updated.");
				navigate(`/extinguishers/${id}`);
			} else {
				const response = await extinguishersApi.create(
					parsed.data as Parameters<typeof extinguishersApi.create>[0],
				);
				toast.success("Extinguisher registered.");
				navigate(`/extinguishers/${response.data.id}`);
			}
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to save extinguisher.";
			setError(message);
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return <LoadingState message="Loading form..." />;
	}

	return (
		<div className="page">
			<PageHeader
				title={isEdit ? "Edit extinguisher" : "Add extinguisher"}
				description="Enter asset details and compliance dates."
			/>
			{error ? <ErrorAlert message={error} /> : null}
			<form className="panel form-stack form-max" onSubmit={handleSubmit} noValidate>
				<FormField
					label="Serial number"
					name="serialNumber"
					value={form.serialNumber}
					onChange={(event) => updateField("serialNumber", event.target.value)}
					error={fieldErrors.serialNumber}
					required
				/>
				<FormField
					label="Location"
					name="location"
					value={form.location}
					onChange={(event) => updateField("location", event.target.value)}
					error={fieldErrors.location}
					required
				/>
				<div className="form-row">
					<FormField
						as="select"
						label="Type"
						name="type"
						value={form.type}
						onChange={(event) =>
							updateField(
								"type",
								event.target.value as typeof form.type,
							)
						}
						error={fieldErrors.type}
						required
					>
						{extinguisherTypeSchema.options.map((value) => (
							<option key={value} value={value}>
								{extinguisherTypeLabels[value]}
							</option>
						))}
					</FormField>
					<FormField
						as="select"
						label="Size"
						name="size"
						value={form.size}
						onChange={(event) =>
							updateField(
								"size",
								event.target.value as typeof form.size,
							)
						}
						error={fieldErrors.size}
						required
					>
						{extinguisherSizeSchema.options.map((value) => (
							<option key={value} value={value}>
								{extinguisherSizeLabels[value]}
							</option>
						))}
					</FormField>
				</div>
				<div className="form-row">
					<FormField
						label="Installation date"
						type="date"
						name="installationDate"
						value={form.installationDate}
						onChange={(event) =>
							updateField("installationDate", event.target.value)
						}
						error={fieldErrors.installationDate}
						required
					/>
					<FormField
						label="Expiry date"
						type="date"
						name="expiryDate"
						value={form.expiryDate}
						onChange={(event) => updateField("expiryDate", event.target.value)}
						error={fieldErrors.expiryDate}
						required
					/>
				</div>
				<FormField
					as="select"
					label="Status"
					name="status"
					value={form.status}
					onChange={(event) =>
						updateField(
							"status",
							event.target.value as typeof form.status,
						)
					}
					error={fieldErrors.status}
					required
				>
					{extinguisherStatusSchema.options.map((value) => (
						<option key={value} value={value}>
							{extinguisherStatusLabels[value]}
						</option>
					))}
				</FormField>
				<div className="form-actions">
					<Link to={isEdit && id ? `/extinguishers/${id}` : "/extinguishers"} className="btn btn-secondary">
						Cancel
					</Link>
					<button type="submit" className="btn btn-primary" disabled={submitting}>
						{submitting ? "Saving..." : isEdit ? "Save changes" : "Create"}
					</button>
				</div>
			</form>
		</div>
	);
}
