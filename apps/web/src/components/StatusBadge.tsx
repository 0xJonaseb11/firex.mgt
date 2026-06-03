const toneMap: Record<string, string> = {
	active: "success",
	completed: "success",
	scheduled: "info",
	overdue: "warning",
	expired: "warning",
	needs_maintenance: "warning",
	cancelled: "neutral",
	decommissioned: "neutral",
	user: "neutral",
	inspector: "info",
	admin: "success",
};

interface StatusBadgeProps {
	value: string;
	label?: string;
}

export function StatusBadge({ value, label }: StatusBadgeProps) {
	const tone = toneMap[value] ?? "neutral";
	const text = label ?? value.replace(/_/g, " ");

	return <span className={`badge badge-${tone}`}>{text}</span>;
}
