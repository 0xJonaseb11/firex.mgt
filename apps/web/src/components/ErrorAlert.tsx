interface ErrorAlertProps {
	message: string;
	onDismiss?: () => void;
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
	return (
		<div className="alert alert-error" role="alert">
			<span>{message}</span>
			{onDismiss ? (
				<button
					type="button"
					className="alert__dismiss"
					onClick={onDismiss}
					aria-label="Dismiss error"
				>
					x
				</button>
			) : null}
		</div>
	);
}
