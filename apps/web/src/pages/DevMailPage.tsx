import { useCallback, useEffect, useState } from "react";

import { devMailApi, type DevMailEntry } from "@web/api/dev-mail";
import { ApiError } from "@web/api/client";
import { EmptyState } from "@web/components/EmptyState";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { LoadingState } from "@web/components/LoadingState";
import { PageHeader } from "@web/components/PageHeader";

export function DevMailPage() {
	const [items, setItems] = useState<DevMailEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await devMailApi.list();
			setItems(response.items);
		} catch (err) {
			setError(
				err instanceof ApiError
					? err.message
					: "Unable to load dev mail outbox.",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<div className="page">
			<PageHeader
				title="Dev mail outbox"
				description="All emails sent in development (exam demo — no real inbox required)."
				actions={
					<button type="button" className="btn btn-secondary" onClick={() => void load()}>
						Refresh
					</button>
				}
			/>
			{error ? <ErrorAlert message={error} onDismiss={() => setError(null)} /> : null}
			{loading ? (
				<LoadingState message="Loading outbox..." />
			) : items.length === 0 ? (
				<EmptyState
					title="No emails yet"
					description="Trigger forgot-password, registration, or an inspection to see messages here."
				/>
			) : (
				<ul className="dev-mail-list">
					{items.map((item) => (
						<li key={item.id} className="dev-mail-list__item panel">
							<div className="dev-mail-list__meta">
								<strong>{item.subject}</strong>
								<span>
									To: {item.to} · {item.provider} · {new Date(item.createdAt).toLocaleString()}
								</span>
							</div>
							{item.previewUrl ? (
								<p>
									<a href={item.previewUrl} target="_blank" rel="noreferrer">
										Open email preview
									</a>
								</p>
							) : null}
							<pre className="dev-mail-list__preview">
								{item.text ?? item.html.replace(/<[^>]+>/g, " ").slice(0, 500)}
							</pre>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
