import { Link, Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@web/contexts/AuthContext";

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
					<p className="auth-card__eyebrow">TZW Fire Safety</p>
					<h1 className="auth-card__title">Extinguisher Management</h1>
				</header>
				<Outlet />
				<footer className="auth-card__footer">
					<Link to="/login">Sign in</Link>
					<Link to="/register">Create account</Link>
					<Link to="/forgot-password">Reset password</Link>
				</footer>
			</div>
		</div>
	);
}
