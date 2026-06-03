import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@web/components/AppLayout";
import { AuthLayout } from "@web/components/AuthLayout";
import { ProtectedRoute } from "@web/components/ProtectedRoute";
import { RoleGuard } from "@web/components/RoleGuard";
import { AuthProvider } from "@web/contexts/AuthContext";
import { ConfirmProvider } from "@web/contexts/ConfirmContext";
import { AdminUsersPage } from "@web/pages/AdminUsersPage";
import { DashboardPage } from "@web/pages/DashboardPage";
import { ExtinguisherDetailPage } from "@web/pages/ExtinguisherDetailPage";
import { ExtinguisherFormPage } from "@web/pages/ExtinguisherFormPage";
import { ExtinguishersPage } from "@web/pages/ExtinguishersPage";
import { ForgotPasswordPage } from "@web/pages/ForgotPasswordPage";
import { InspectionsPage } from "@web/pages/InspectionsPage";
import { LoginPage } from "@web/pages/LoginPage";
import { MaintenancePage } from "@web/pages/MaintenancePage";
import { ProfilePage } from "@web/pages/ProfilePage";
import { RegisterPage } from "@web/pages/RegisterPage";
import { ReportsPage } from "@web/pages/ReportsPage";

export const AppRoutes = () => (
	<BrowserRouter>
		<AuthProvider>
			<ConfirmProvider>
				<Routes>
					<Route element={<AuthLayout />}>
						<Route path="/login" element={<LoginPage />} />
						<Route path="/register" element={<RegisterPage />} />
						<Route path="/forgot-password" element={<ForgotPasswordPage />} />
					</Route>
					<Route element={<ProtectedRoute />}>
						<Route element={<AppLayout />}>
							<Route path="/dashboard" element={<DashboardPage />} />
							<Route path="/extinguishers" element={<ExtinguishersPage />} />
							<Route path="/extinguishers/new" element={<ExtinguisherFormPage />} />
							<Route
								path="/extinguishers/:id/edit"
								element={<ExtinguisherFormPage />}
							/>
							<Route
								path="/extinguishers/:id"
								element={<ExtinguisherDetailPage />}
							/>
							<Route path="/inspections" element={<InspectionsPage />} />
							<Route
								path="/maintenance"
								element={
									<RoleGuard roles={["inspector", "admin"]}>
										<MaintenancePage />
									</RoleGuard>
								}
							/>
							<Route
								path="/reports"
								element={
									<RoleGuard roles={["inspector", "admin"]}>
										<ReportsPage />
									</RoleGuard>
								}
							/>
							<Route
								path="/users"
								element={
									<RoleGuard roles={["admin"]}>
										<AdminUsersPage />
									</RoleGuard>
								}
							/>
							<Route path="/profile" element={<ProfilePage />} />
						</Route>
					</Route>
					<Route path="/" element={<Navigate to="/dashboard" replace />} />
					<Route path="*" element={<Navigate to="/dashboard" replace />} />
				</Routes>
			</ConfirmProvider>
		</AuthProvider>
	</BrowserRouter>
);
