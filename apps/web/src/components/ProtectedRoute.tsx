import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingState } from "@web/components/LoadingState";
import { useAuth } from "@web/contexts/AuthContext";

export function ProtectedRoute() {
	const { isAuthenticated, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return <LoadingState message="Checking session..." fullPage />;
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace state={{ from: location.pathname }} />;
	}

	return <Outlet />;
}
