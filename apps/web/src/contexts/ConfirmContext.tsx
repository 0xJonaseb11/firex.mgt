import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from "react";

export interface ConfirmOptions {
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "default" | "danger";
}

interface ConfirmState extends ConfirmOptions {
	open: boolean;
	resolve?: (confirmed: boolean) => void;
}

interface ConfirmContextValue {
	confirm: (options: ConfirmOptions) => Promise<boolean>;
	state: ConfirmState;
	respond: (confirmed: boolean) => void;
}

const defaultState: ConfirmState = {
	open: false,
	title: "",
	message: "",
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<ConfirmState>(defaultState);

	const respond = useCallback((confirmed: boolean) => {
		setState((current) => {
			current.resolve?.(confirmed);
			return defaultState;
		});
	}, []);

	const confirm = useCallback((options: ConfirmOptions) => {
		return new Promise<boolean>((resolve) => {
			setState({
				...options,
				open: true,
				resolve,
			});
		});
	}, []);

	const value = useMemo(
		() => ({ confirm, state, respond }),
		[confirm, state, respond],
	);

	return (
		<ConfirmContext.Provider value={value}>{children}</ConfirmContext.Provider>
	);
}

export function useConfirm() {
	const context = useContext(ConfirmContext);
	if (!context) {
		throw new Error("useConfirm must be used within ConfirmProvider");
	}
	return context;
}
