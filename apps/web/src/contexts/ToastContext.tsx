import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
	id: string;
	message: string;
	variant: ToastVariant;
}

interface ToastContextValue {
	toast: (message: string, variant?: ToastVariant) => void;
	success: (message: string) => void;
	error: (message: string) => void;
	info: (message: string) => void;
	dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);
	const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

	const dismiss = useCallback((id: string) => {
		const timer = timersRef.current.get(id);
		if (timer) {
			clearTimeout(timer);
			timersRef.current.delete(id);
		}
		setToasts((current) => current.filter((toast) => toast.id !== id));
	}, []);

	const toast = useCallback(
		(message: string, variant: ToastVariant = "info") => {
			const id = crypto.randomUUID();
			setToasts((current) => [...current, { id, message, variant }]);
			const timer = setTimeout(() => dismiss(id), TOAST_DURATION_MS);
			timersRef.current.set(id, timer);
		},
		[dismiss],
	);

	const value = useMemo(
		() => ({
			toast,
			success: (message: string) => toast(message, "success"),
			error: (message: string) => toast(message, "error"),
			info: (message: string) => toast(message, "info"),
			dismiss,
		}),
		[toast, dismiss],
	);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div className="toast-viewport" aria-live="polite" aria-relevant="additions">
				{toasts.map((item) => (
					<div
						key={item.id}
						className={`toast toast--${item.variant}`}
						role="status"
					>
						<p className="toast__message">{item.message}</p>
						<button
							type="button"
							className="toast__dismiss"
							onClick={() => dismiss(item.id)}
							aria-label="Dismiss notification"
						>
							×
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within ToastProvider");
	}
	return context;
}
