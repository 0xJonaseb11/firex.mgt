import { z } from "zod";

import { emailSchema, passwordSchema } from "./common.js";

export const userRoleSchema = z.enum(["user", "inspector", "admin"]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const registerSchema = z.object({
	firstName: z.string().min(1, "First name is required").max(100).trim(),
	lastName: z.string().min(1, "Last name is required").max(100).trim(),
	email: emailSchema,
	password: passwordSchema,
});

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z
	.object({
		firstName: z.string().min(1).max(100).trim().optional(),
		lastName: z.string().min(1).max(100).trim().optional(),
		email: emailSchema.optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(1, "Current password is required"),
	newPassword: passwordSchema,
});

export const forgotPasswordSchema = z.object({
	email: emailSchema,
});

export const resetPasswordSchema = z.object({
	token: z.string().min(1, "Reset token is required"),
	newPassword: passwordSchema,
});

export const updateUserRoleSchema = z.object({
	role: userRoleSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
