import { Router } from "express";
import {
	changePasswordSchema,
	forgotPasswordSchema,
	loginSchema,
	registerSchema,
	resetPasswordSchema,
	updateProfileSchema,
} from "@repo/contracts";

import config from "@api/config";
import {
	createNotification,
	createPasswordResetToken,
	createUser,
	deletePasswordResetToken,
	deletePasswordResetTokensForUser,
	findValidPasswordResetToken,
	getUserByEmail,
	getUserById,
	revokeRefreshTokens,
	updateUser,
} from "@api/db/queries";
import { PASSWORD_RESET_TTL_MS } from "@api/lib/constants";
import { ApiError } from "@api/lib/errors";
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
			});

			sendAuthCookies(res, user);
			res.status(201).json({ user: sanitizeUser(user) });
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

			sendAuthCookies(res, user);
			res.json({ user: sanitizeUser(user) });
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
			if (updates.email) {
				const existing = await getUserByEmail(updates.email);
				if (existing && existing.id !== req.userId) {
					throw new ApiError({
						code: "CONFLICT",
						message: "An account with this email already exists",
					});
				}
			}
			const user = await updateUser(req.userId!, updates);
			if (!user) {
				throw new ApiError({ code: "NOT_FOUND", message: "User not found" });
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

				await createNotification({
					id: await generateId(),
					userId: user.id,
					title: "Password reset requested",
					message: `Use this token to reset your password: ${token}`,
					type: "password_reset",
				});

				if (config.isDevelopment) {
					logger.info("Password reset token generated", {
						email: user.email,
						token,
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
