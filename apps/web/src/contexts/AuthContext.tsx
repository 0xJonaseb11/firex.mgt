import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";

import { authApi } from "@web/api/auth";
import { ApiError } from "@web/api/client";
import type { User } from "@web/api/types";
import { useToast } from "@web/contexts/ToastContext";

interface AuthContextValue {
	user: User | null;
	loading: boolean;
	error: string | null;
	isAuthenticated: boolean;
	refreshUser: () => Promise<void>;
	login: (email: string, password: string) => Promise<void>;
	register: (
		firstName: string,
		lastName: string,
		email: string,
		password: string,
	) => Promise<void>;
	logout: () => Promise<void>;
	logoutAll: () => Promise<void>;
	clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const toast = useToast();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refreshUser = useCallback(async () => {
		try {
			const response = await authApi.me();
			setUser(response.user);
		} catch (err) {
			setUser(null);
			if (err instanceof ApiError && err.status === 401) {
				return;
			}
			throw err;
		}
	}, []);

	useEffect(() => {
		let active = true;

		(async () => {
			try {
				await refreshUser();
			} catch {
				if (active) {
					setUser(null);
				}
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		})();

		return () => {
			active = false;
		};
	}, [refreshUser]);

	const login = useCallback(async (email: string, password: string) => {
		setError(null);
		try {
			const response = await authApi.login({ email, password });
			setUser(response.user);
			toast.success(`Welcome back, ${response.user.firstName}.`);
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to sign in. Please try again.";
			setError(message);
			toast.error(message);
			throw err;
		}
	}, [toast]);

	const register = useCallback(
		async (
			firstName: string,
			lastName: string,
			email: string,
			password: string,
		) => {
			setError(null);
			try {
				const response = await authApi.register({
					firstName,
					lastName,
					email,
					password,
				});
				setUser(response.user);
				toast.success("Account created. Welcome to TZW Fire Safety.");
			} catch (err) {
				const message =
					err instanceof ApiError
						? err.message
						: "Unable to create account. Please try again.";
				setError(message);
				toast.error(message);
				throw err;
			}
		},
		[toast],
	);

	const logout = useCallback(async () => {
		setError(null);
		await authApi.logout();
		setUser(null);
		toast.info("Signed out successfully.");
	}, [toast]);

	const logoutAll = useCallback(async () => {
		setError(null);
		await authApi.logoutAll();
		setUser(null);
		toast.info("Signed out on all devices.");
	}, [toast]);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	const value = useMemo(
		() => ({
			user,
			loading,
			error,
			isAuthenticated: Boolean(user),
			refreshUser,
			login,
			register,
			logout,
			logoutAll,
			clearError,
		}),
		[
			user,
			loading,
			error,
			refreshUser,
			login,
			register,
			logout,
			logoutAll,
			clearError,
		],
	);

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
}
