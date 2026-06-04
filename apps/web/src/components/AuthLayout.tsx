import { NavLink, Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@web/contexts/AuthContext";

function authNavClass({ isActive }: { isActive: boolean }) {
	return isActive ? "auth-card__nav-link auth-card__nav-link--active" : "auth-card__nav-link";
}

export function AuthLayout() {
	const { isAuthenticated, loading } = useAuth();

	if (loading) {
		return (
			<div className="auth-layout">
				<p className="auth-layout__loading">Loading...</p>
			</div>
		);
	}

	if (isAuthenticated) {
		return <Navigate to="/dashboard" replace />;
	}

	return (
		<div className="auth-layout">
			<div className="auth-card">
				<header className="auth-card__header">
					<p className="auth-card__eyebrow">TZW FireEx</p>
					<h1 className="auth-card__title">Extinguisher Management</h1>
				</header>
				<div className="auth-card__body">
					<Outlet />
				</div>
				<footer className="auth-card__footer">
					<NavLink to="/login" className={authNavClass} end>
						Sign in
					</NavLink>
					<NavLink to="/register" className={authNavClass}>
						Create account
					</NavLink>
					<NavLink to="/forgot-password" className={authNavClass}>
						Reset password
					</NavLink>
				</footer>
			</div>
		</div>
	);
}
