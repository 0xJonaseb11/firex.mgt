export type ViewMode = "ui" | "json";

interface ViewModeToggleProps {
	mode: ViewMode;
	onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
	return (
		<div className="view-mode-toggle" role="group" aria-label="View mode">
			<button
				type="button"
				className={
					mode === "ui"
						? "view-mode-toggle__btn view-mode-toggle__btn--active"
						: "view-mode-toggle__btn"
				}
				onClick={() => onChange("ui")}
				aria-pressed={mode === "ui"}
			>
				Table
			</button>
			<button
				type="button"
				className={
					mode === "json"
						? "view-mode-toggle__btn view-mode-toggle__btn--active"
						: "view-mode-toggle__btn"
				}
				onClick={() => onChange("json")}
				aria-pressed={mode === "json"}
			>
				JSON
			</button>
		</div>
	);
}
