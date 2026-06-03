interface EmptyStateProps {
	title: string;
	description?: string;
	action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
	return (
		<div className="empty-state">
			<h2 className="empty-state__title">{title}</h2>
			{description ? <p>{description}</p> : null}
			{action ? <div className="empty-state__action">{action}</div> : null}
		</div>
	);
}
