interface StatusBadgeProps {
	value: string;
	label?: string;
}

export function StatusBadge({ value, label }: StatusBadgeProps) {
	const text = label ?? value.replace(/_/g, " ");

	return <span className="badge">{text}</span>;
}
