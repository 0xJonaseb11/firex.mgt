import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import type { UserRole } from "@tzw-firex/contracts";

import { useAuth } from "@web/contexts/AuthContext";

interface RoleGuardProps {
	roles: UserRole[];
	children: ReactNode;
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
	const { user } = useAuth();

	if (!user || !roles.includes(user.role)) {
		return <Navigate to="/dashboard" replace />;
	}

	return children;
}
