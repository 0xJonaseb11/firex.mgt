import type {
	ChangePasswordInput,
	ForgotPasswordInput,
	LoginInput,
	RegisterInput,
	ResendVerificationInput,
	ResetPasswordInput,
	UpdateProfileInput,
	VerifyEmailInput,
} from "@tzw-firex/contracts";

import { apiRequest } from "@web/api/client";
import type { User } from "@web/api/types";

interface AuthResponse {
	user: User;
}

export const authApi = {
	login(input: LoginInput) {
		return apiRequest<AuthResponse>("/auth/login", {
			method: "POST",
			body: JSON.stringify(input),
		});
	},

	register(input: RegisterInput) {
		return apiRequest<{ success: boolean; message: string; email: string }>(
			"/auth/register",
			{
				method: "POST",
				body: JSON.stringify(input),
			},
		);
	},

	verifyEmail(input: VerifyEmailInput) {
		return apiRequest<{ success: boolean; message: string; user: User }>(
			"/auth/verify-email",
			{
				method: "POST",
				body: JSON.stringify(input),
			},
		);
	},

	resendVerification(input: ResendVerificationInput) {
		return apiRequest<{ success: boolean; message: string }>(
			"/auth/resend-verification",
			{
				method: "POST",
				body: JSON.stringify(input),
			},
		);
	},

	logout() {
		return apiRequest<{ success: boolean }>("/auth/logout", {
			method: "POST",
		});
	},

	logoutAll() {
		return apiRequest<{ success: boolean }>("/auth/logout-all", {
			method: "POST",
		});
	},

	me() {
		return apiRequest<{ user: User }>("/auth/me");
	},

	updateProfile(input: UpdateProfileInput) {
		return apiRequest<
			AuthResponse & { requiresVerification?: boolean; message?: string }
		>("/auth/me", {
			method: "PATCH",
			body: JSON.stringify(input),
		});
	},

	changePassword(input: ChangePasswordInput) {
		return apiRequest<{ success: boolean }>("/auth/change-password", {
			method: "POST",
			body: JSON.stringify(input),
		});
	},

	forgotPassword(input: ForgotPasswordInput) {
		return apiRequest<{ success: boolean; message: string }>(
			"/auth/forgot-password",
			{
				method: "POST",
				body: JSON.stringify(input),
			},
		);
	},

	resetPassword(input: ResetPasswordInput) {
		return apiRequest<{ success: boolean }>("/auth/reset-password", {
			method: "POST",
			body: JSON.stringify(input),
		});
	},
};
