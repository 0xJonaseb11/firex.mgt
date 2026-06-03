import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { extinguishersApi } from "@web/api/extinguishers";
import { ApiError } from "@web/api/client";
import type { Extinguisher } from "@web/api/types";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { JsonPreview } from "@web/components/JsonPreview";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import { StatusBadge } from "@web/components/StatusBadge";
import { ViewModeToggle, type ViewMode } from "@web/components/ViewModeToggle";
import { useAuth } from "@web/contexts/AuthContext";
import { useConfirm } from "@web/contexts/ConfirmContext";
import { useToast } from "@web/contexts/ToastContext";
import {
	extinguisherSizeLabels,
	extinguisherStatusLabels,
	extinguisherTypeLabels,
	formatDate,
} from "@web/lib/labels";

export function ExtinguisherDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { user } = useAuth();
	const isStaff = user?.role === "admin" || user?.role === "inspector";
	const { confirm } = useConfirm();
	const toast = useToast();

	const [item, setItem] = useState<Extinguisher | null>(null);
	const [rawPayload, setRawPayload] = useState<unknown>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("ui");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (!id) {
			return;
		}

		let active = true;
		(async () => {
			setLoading(true);
			setError(null);
			try {
				const response = await extinguishersApi.getById(id);
				if (active) {
					setItem(response.data);
					setRawPayload(response.raw);
				}
			} catch (err) {
				if (active) {
					const message =
						err instanceof ApiError
							? err.message
							: "Unable to load extinguisher.";
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
	}, [id, toast]);

	const handleDelete = async () => {
		if (!id || !item) {
			return;
		}

		const confirmed = await confirm({
			title: "Delete extinguisher",
			message: `Delete ${item.serialNumber}? This action cannot be undone.`,
			confirmLabel: "Delete",
			variant: "danger",
		});
		if (!confirmed) {
			return;
		}

		setDeleting(true);
		try {
			await extinguishersApi.remove(id);
			toast.success("Extinguisher deleted.");
			navigate("/extinguishers");
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to delete extinguisher.";
			setError(message);
			toast.error(message);
		} finally {
			setDeleting(false);
		}
	};

	if (loading) {
		return <LoadingState message="Loading extinguisher..." />;
	}

	if (!item) {
		return (
			<div className="page">
				<ErrorAlert message={error ?? "Extinguisher not found."} />
				<Link to="/extinguishers" className="btn btn-secondary">
					Back to list
				</Link>
			</div>
		);
	}

	return (
		<div className="page">
			<PageHeader
				title={item.serialNumber}
				description={item.location}
				actions={
					<div className="page-header__action-group">
						<ViewModeToggle mode={viewMode} onChange={setViewMode} />
						{isStaff ? (
							<>
								<Link
									to={`/extinguishers/${item.id}/edit`}
									className="btn btn-secondary"
								>
									Edit
								</Link>
								<button
									type="button"
									className="btn btn-danger"
									onClick={() => void handleDelete()}
									disabled={deleting}
								>
									{deleting ? "Deleting..." : "Delete"}
								</button>
							</>
						) : null}
					</div>
				}
			/>
			{error ? <ErrorAlert message={error} onDismiss={() => setError(null)} /> : null}
			{viewMode === "json" ? (
				<JsonPreview data={rawPayload ?? { extinguisher: item }} />
			) : (
				<section className="panel detail-grid">
					<div>
						<p className="detail-label">Status</p>
						<StatusBadge
							value={item.status}
							label={
								extinguisherStatusLabels[
									item.status as keyof typeof extinguisherStatusLabels
								]
							}
						/>
					</div>
					<div>
						<p className="detail-label">Type</p>
						<p>
							{extinguisherTypeLabels[
								item.type as keyof typeof extinguisherTypeLabels
							] ?? item.type}
						</p>
					</div>
					<div>
						<p className="detail-label">Size</p>
						<p>
							{extinguisherSizeLabels[
								item.size as keyof typeof extinguisherSizeLabels
							] ?? item.size}
						</p>
					</div>
					<div>
						<p className="detail-label">Installation date</p>
						<p>{formatDate(item.installationDate)}</p>
					</div>
					<div>
						<p className="detail-label">Expiry date</p>
						<p>{formatDate(item.expiryDate)}</p>
					</div>
					<div>
						<p className="detail-label">Last updated</p>
						<p>{formatDate(item.updatedAt)}</p>
					</div>
				</section>
			)}
		</div>
	);
}
