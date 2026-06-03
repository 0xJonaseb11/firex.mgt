import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@web/components/AppLayout";
import { AuthLayout } from "@web/components/AuthLayout";
import { ProtectedRoute } from "@web/components/ProtectedRoute";
import { RoleGuard } from "@web/components/RoleGuard";
import { AuthProvider } from "@web/contexts/AuthContext";
import { ConfirmProvider } from "@web/contexts/ConfirmContext";
import { ToastProvider } from "@web/contexts/ToastContext";
import { AdminUsersPage } from "@web/pages/AdminUsersPage";
import { DashboardPage } from "@web/pages/DashboardPage";
import { ExtinguisherDetailPage } from "@web/pages/ExtinguisherDetailPage";
import { ExtinguisherFormPage } from "@web/pages/ExtinguisherFormPage";
import { ExtinguishersPage } from "@web/pages/ExtinguishersPage";
import { CheckEmailPage } from "@web/pages/CheckEmailPage";
import { ForgotPasswordPage } from "@web/pages/ForgotPasswordPage";
import { VerifyEmailPage } from "@web/pages/VerifyEmailPage";
import { InspectionsPage } from "@web/pages/InspectionsPage";
import { LoginPage } from "@web/pages/LoginPage";
import { MaintenancePage } from "@web/pages/MaintenancePage";
import { NotificationsPage } from "@web/pages/NotificationsPage";
import { ProfilePage } from "@web/pages/ProfilePage";
import { RegisterPage } from "@web/pages/RegisterPage";
import { ReportsPage } from "@web/pages/ReportsPage";

export const AppRoutes = () => (
	<BrowserRouter>
		<ToastProvider>
			<AuthProvider>
				<ConfirmProvider>
				<Routes>
					<Route element={<AuthLayout />}>
						<Route path="/login" element={<LoginPage />} />
						<Route path="/register" element={<RegisterPage />} />
						<Route path="/forgot-password" element={<ForgotPasswordPage />} />
						<Route path="/check-email" element={<CheckEmailPage />} />
						<Route path="/verify-email" element={<VerifyEmailPage />} />
					</Route>
					<Route element={<ProtectedRoute />}>
						<Route element={<AppLayout />}>
							<Route path="/dashboard" element={<DashboardPage />} />
							<Route path="/notifications" element={<NotificationsPage />} />
							<Route path="/extinguishers" element={<ExtinguishersPage />} />
							<Route
								path="/extinguishers/new"
								element={
									<RoleGuard roles={["inspector", "admin"]}>
										<ExtinguisherFormPage />
									</RoleGuard>
								}
							/>
							<Route
								path="/extinguishers/:id/edit"
								element={
									<RoleGuard roles={["inspector", "admin"]}>
										<ExtinguisherFormPage />
									</RoleGuard>
								}
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
		</ToastProvider>
	</BrowserRouter>
);
