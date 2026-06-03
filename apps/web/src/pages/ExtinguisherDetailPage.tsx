import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { extinguishersApi } from "@web/api/extinguishers";
import { ApiError } from "@web/api/client";
import type { Extinguisher } from "@web/api/types";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";
import { StatusBadge } from "@web/components/StatusBadge";
import { useConfirm } from "@web/contexts/ConfirmContext";
import {
	extinguisherSizeLabels,
	extinguisherStatusLabels,
	extinguisherTypeLabels,
	formatDate,
} from "@web/lib/labels";

export function ExtinguisherDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { confirm } = useConfirm();

	const [item, setItem] = useState<Extinguisher | null>(null);
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
				}
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
			navigate("/extinguishers");
		} catch (err) {
			setError(
				err instanceof ApiError
					? err.message
					: "Unable to delete extinguisher.",
			);
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
					<>
						<Link to={`/extinguishers/${item.id}/edit`} className="btn btn-secondary">
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
				}
			/>
			{error ? <ErrorAlert message={error} /> : null}
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
		</div>
	);
}
