import { Router } from "express";
import {
	changePasswordSchema,
	forgotPasswordSchema,
	loginSchema,
	registerSchema,
	resendVerificationSchema,
	resetPasswordSchema,
	updateProfileSchema,
	verifyEmailSchema,
} from "@tzw-firex/contracts";

import config from "@api/config";
import {
	createPasswordResetToken,
	createUser,
	deleteEmailVerificationToken,
	deletePasswordResetToken,
	deletePasswordResetTokensForUser,
	findValidEmailVerificationToken,
	findValidPasswordResetToken,
	getUserByEmail,
	getUserById,
	revokeRefreshTokens,
	updateUser,
} from "@api/db/queries";
import { PASSWORD_RESET_TTL_MS } from "@api/lib/constants";
import { sendEmail } from "@api/lib/email/client";
import { sendAccountVerificationEmail } from "@api/lib/email/send-verification";
import { appUrl, passwordResetEmail } from "@api/lib/email/templates";
import { ApiError } from "@api/lib/errors";
import { notifyUser } from "@api/lib/notify-user";
import {
	hashPassword,
	hashResetTokenLookup,
	verifyPassword,
} from "@api/lib/password";
import { parseBody } from "@api/lib/parse-body";
import {
	asyncHandler,
	authRateLimiter,
	requireAuth,
} from "@api/middlewares";
import {
	checkTokens,
	clearAuthCookies,
	createAuthTokens,
	sendAuthCookies,
	setTokenCookies,
} from "@api/utils/create-auth-tokens";
import { generateId, generateResetToken } from "@api/utils/generate-id";
import logger from "@api/utils/logger";
import { sanitizeUser } from "@api/utils/sanitize-user";

export function createAuthRouter(): Router {
	const router = Router();

	router.post(
		"/register",
		authRateLimiter,
		asyncHandler(async (req, res) => {
			const body = parseBody(registerSchema, req.body);
			if (await getUserByEmail(body.email)) {
				throw new ApiError({
					code: "CONFLICT",
					message: "An account with this email already exists",
				});
			}

			const user = await createUser({
				id: await generateId(),
				firstName: body.firstName,
				lastName: body.lastName,
				email: body.email,
				password: await hashPassword(body.password),
				role: "user",
				emailVerified: false,
			});

			await sendAccountVerificationEmail(user);

			res.status(201).json({
				success: true,
				message:
					"Account created. Check your email to verify your address before signing in.",
				email: user.email,
			});
		}),
	);

	router.post(
		"/login",
		authRateLimiter,
		asyncHandler(async (req, res) => {
			const body = parseBody(loginSchema, req.body);
			const user = await getUserByEmail(body.email);
			const passwordOk = user
				? await verifyPassword(body.password, user.password)
				: await verifyPassword(
						body.password,
						"$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinv",
					);

			if (!user || !passwordOk) {
				throw new ApiError({
					code: "UNAUTHORIZED",
					message: "Invalid email or password",
				});
			}

			if (!user.emailVerified && user.role !== "admin") {
				throw new ApiError({
					code: "FORBIDDEN",
					message:
						"Verify your email before signing in. Check your inbox or request a new link.",
					details: { code: "EMAIL_NOT_VERIFIED", email: user.email },
				});
			}

			sendAuthCookies(res, user);
			res.json({ user: sanitizeUser(user) });
		}),
	);

	router.post(
		"/verify-email",
		authRateLimiter,
		asyncHandler(async (req, res) => {
			const body = parseBody(verifyEmailSchema, req.body);
			const record = await findValidEmailVerificationToken(body.token);
			if (!record) {
				throw new ApiError({
					code: "BAD_REQUEST",
					message: "Invalid or expired verification link",
				});
			}

			const user = await updateUser(record.userId, { emailVerified: true });
			if (!user) {
				throw new ApiError({ code: "NOT_FOUND", message: "User not found" });
			}

			await deleteEmailVerificationToken(record.id);

			res.json({
				success: true,
				message: "Email verified. You can sign in now.",
				user: sanitizeUser(user),
			});
		}),
	);

	router.post(
		"/resend-verification",
		authRateLimiter,
		asyncHandler(async (req, res) => {
			const body = parseBody(resendVerificationSchema, req.body);
			const user = await getUserByEmail(body.email);

			if (user && !user.emailVerified) {
				await sendAccountVerificationEmail(user);
			}

			res.json({
				success: true,
				message:
					"If an unverified account exists for that email, a new confirmation link has been sent",
			});
		}),
	);

	router.post(
		"/refresh",
		asyncHandler(async (req, res) => {
			const refreshToken = req.cookies?.rid ?? "";
			if (!refreshToken) {
				throw new ApiError({ code: "UNAUTHORIZED" });
			}
			const result = await checkTokens("", refreshToken);
			if (result.newTokens) {
				setTokenCookies(res, result.newTokens);
			}
			const user = result.user ?? (await getUserById(result.userId));
			if (user && !user.emailVerified && user.role !== "admin") {
				clearAuthCookies(res);
				throw new ApiError({
					code: "FORBIDDEN",
					message: "Verify your email to continue",
					details: { code: "EMAIL_NOT_VERIFIED", email: user.email },
				});
			}
			res.json({ user: user ? sanitizeUser(user) : null });
		}),
	);

	router.get(
		"/me",
		requireAuth,
		asyncHandler(async (req, res) => {
			const user = req.user ?? (await getUserById(req.userId!));
			if (!user) {
				throw new ApiError({ code: "UNAUTHORIZED" });
			}
			res.json({ user: sanitizeUser(user) });
		}),
	);

	router.patch(
		"/me",
		requireAuth,
		asyncHandler(async (req, res) => {
			const updates = parseBody(updateProfileSchema, req.body);
			const emailChanging =
				updates.email !== undefined &&
				updates.email.toLowerCase() !== req.user!.email.toLowerCase();

			if (updates.email) {
				const existing = await getUserByEmail(updates.email);
				if (existing && existing.id !== req.userId) {
					throw new ApiError({
						code: "CONFLICT",
						message: "An account with this email already exists",
					});
				}
			}

			const user = await updateUser(req.userId!, {
				...updates,
				...(emailChanging ? { emailVerified: false } : {}),
			});
			if (!user) {
				throw new ApiError({ code: "NOT_FOUND", message: "User not found" });
			}

			if (emailChanging) {
				await revokeRefreshTokens(user.id);
				clearAuthCookies(res);
				await sendAccountVerificationEmail(user);
				res.json({
					user: sanitizeUser(user),
					requiresVerification: true,
					message:
						"Email updated. Confirm your new address via the link we sent before signing in again.",
				});
				return;
			}

			res.json({ user: sanitizeUser(user) });
		}),
	);

	router.post(
		"/change-password",
		requireAuth,
		asyncHandler(async (req, res) => {
			const body = parseBody(changePasswordSchema, req.body);
			const user = req.user ?? (await getUserById(req.userId!));
			if (!user) {
				throw new ApiError({ code: "UNAUTHORIZED" });
			}
			if (!(await verifyPassword(body.currentPassword, user.password))) {
				throw new ApiError({
					code: "UNAUTHORIZED",
					message: "Current password is incorrect",
				});
			}
			await updateUser(user.id, {
				password: await hashPassword(body.newPassword),
			});
			await revokeRefreshTokens(user.id);
			const refreshed = await getUserById(user.id);
			if (refreshed) {
				setTokenCookies(res, createAuthTokens(refreshed));
			}
			res.json({ success: true });
		}),
	);

	router.post(
		"/forgot-password",
		authRateLimiter,
		asyncHandler(async (req, res) => {
			const body = parseBody(forgotPasswordSchema, req.body);
			const user = await getUserByEmail(body.email);

			if (user) {
				await deletePasswordResetTokensForUser(user.id);
				const token = generateResetToken();
				await createPasswordResetToken({
					id: await generateId(),
					userId: user.id,
					tokenHash: hashResetTokenLookup(token),
					expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
				});

				const resetUrl = appUrl(
					`/forgot-password?token=${encodeURIComponent(token)}`,
				);
				const content = passwordResetEmail(user.firstName, resetUrl);
				await sendEmail({
					to: user.email,
					subject: content.subject,
					html: content.html,
					text: content.text,
				});

				await notifyUser({
					userId: user.id,
					title: "Password reset requested",
					message:
						"A password reset link was sent to your email if an account exists.",
					type: "password_reset",
					email: null,
				});

				if (config.isDevelopment) {
					logger.info("Password reset link (dev)", {
						email: user.email,
						resetUrl,
					});
				}
			}

			res.json({
				success: true,
				message:
					"If an account exists for that email, reset instructions have been sent",
			});
		}),
	);

	router.post(
		"/reset-password",
		authRateLimiter,
		asyncHandler(async (req, res) => {
			const body = parseBody(resetPasswordSchema, req.body);
			const record = await findValidPasswordResetToken(body.token);
			if (!record) {
				throw new ApiError({
					code: "BAD_REQUEST",
					message: "Invalid or expired reset token",
				});
			}

			await updateUser(record.userId, {
				password: await hashPassword(body.newPassword),
			});
			await revokeRefreshTokens(record.userId);
			await deletePasswordResetToken(record.id);

			res.json({ success: true });
		}),
	);

	router.post("/logout", (_req, res) => {
		clearAuthCookies(res);
		res.json({ success: true });
	});

	router.post(
		"/logout-all",
		requireAuth,
		asyncHandler(async (req, res) => {
			await revokeRefreshTokens(req.userId!);
			clearAuthCookies(res);
			res.json({ success: true });
		}),
	);

	return router;
}
