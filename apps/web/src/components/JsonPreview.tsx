interface JsonPreviewProps {
	data: unknown;
	label?: string;
}

export function JsonPreview({ data, label = "API response" }: JsonPreviewProps) {
	return (
		<section className="panel json-preview">
			<div className="json-preview__header">
				<h2 className="panel__title">{label}</h2>
				<p className="json-preview__hint">
					Raw data returned from the API (useful for demos and debugging).
				</p>
			</div>
			<pre className="json-preview__code">
				<code>{JSON.stringify(data, null, 2)}</code>
			</pre>
		</section>
	);
}
