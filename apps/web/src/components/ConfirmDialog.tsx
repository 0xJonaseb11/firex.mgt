import { useConfirm } from "@web/contexts/ConfirmContext";

export function ConfirmDialog() {
	const { state, respond } = useConfirm();

	if (!state.open) {
		return null;
	}

	return (
		<div className="confirm-overlay" role="presentation">
			<div
				className="confirm-dialog"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="confirm-title"
				aria-describedby="confirm-message"
			>
				<h2 id="confirm-title" className="confirm-dialog__title">
					{state.title}
				</h2>
				<p id="confirm-message" className="confirm-dialog__message">
					{state.message}
				</p>
				<div className="confirm-dialog__actions">
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => respond(false)}
					>
						{state.cancelLabel ?? "Cancel"}
					</button>
					<button
						type="button"
						className={
							state.variant === "danger"
								? "btn btn-danger"
								: "btn btn-primary"
						}
						onClick={() => respond(true)}
					>
						{state.confirmLabel ?? "Confirm"}
					</button>
				</div>
			</div>
		</div>
	);
}
