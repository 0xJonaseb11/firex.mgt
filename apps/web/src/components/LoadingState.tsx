interface LoadingStateProps {
	message?: string;
	fullPage?: boolean;
}

export function LoadingState({
	message = "Loading...",
	fullPage = false,
}: LoadingStateProps) {
	return (
		<div
			className={fullPage ? "loading-state loading-state--full" : "loading-state"}
			role="status"
			aria-live="polite"
		>
			<div className="loading-state__spinner" aria-hidden="true" />
			<p>{message}</p>
		</div>
	);
}
