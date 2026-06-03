import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordSchema, resetPasswordSchema } from "@repo/contracts";

import { authApi } from "@web/api/auth";
import { ApiError } from "@web/api/client";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { useToast } from "@web/contexts/ToastContext";
import { zodFieldErrors } from "@web/lib/form-errors";
import { useConsumeUrlToken } from "@web/lib/use-consume-url-token";

export function ForgotPasswordPage() {
	const toast = useToast();
	const resetToken = useConsumeUrlToken("token");
	const isResetMode = Boolean(resetToken);

	const [email, setEmail] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [fieldErrors, setFieldErrors] = useState<
		Record<string, string | undefined>
	>({});
	const [submitting, setSubmitting] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleRequest = async (event: FormEvent) => {
		event.preventDefault();
		setSuccessMessage(null);
		setErrorMessage(null);
		setFieldErrors({});

		const parsed = forgotPasswordSchema.safeParse({ email });
		if (!parsed.success) {
			setFieldErrors(zodFieldErrors(parsed.error));
			return;
		}

		setSubmitting(true);
		try {
			const response = await authApi.forgotPassword(parsed.data);
			const message =
				response.message ??
				"If an account exists for this email, reset instructions have been sent.";
			setSuccessMessage(message);
			toast.success(message);
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to process request. Please try again.";
			setErrorMessage(message);
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleReset = async (event: FormEvent) => {
		event.preventDefault();
		setSuccessMessage(null);
		setErrorMessage(null);
		setFieldErrors({});

		if (!resetToken) {
			setErrorMessage(
				"This reset link is invalid or expired. Request a new link below.",
			);
			return;
		}

		const parsed = resetPasswordSchema.safeParse({
			token: resetToken,
			newPassword,
		});
		if (!parsed.success) {
			setFieldErrors(zodFieldErrors(parsed.error));
			return;
		}

		setSubmitting(true);
		try {
			await authApi.resetPassword(parsed.data);
			const message = "Password updated. You may sign in now.";
			setSuccessMessage(message);
			toast.success(message);
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to reset password. Please try again.";
			setErrorMessage(message);
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<section>
			<h2 className="auth-card__section-title">
				{isResetMode ? "Choose a new password" : "Password reset"}
			</h2>
			{isResetMode ? (
				<p className="auth-card__lead">
					Enter a new password for your account. This link can only be used once.
				</p>
			) : (
				<p className="auth-card__lead">
					We will email you a secure link to reset your password.
				</p>
			)}

			{successMessage ? (
				<div className="alert alert-success" role="status">
					{successMessage}
				</div>
			) : null}
			{errorMessage ? <ErrorAlert message={errorMessage} /> : null}

			{isResetMode ? (
				<form className="form-stack" onSubmit={handleReset} noValidate>
					<FormField
						label="New password"
						type="password"
						name="newPassword"
						autoComplete="new-password"
						value={newPassword}
						onChange={(event) => setNewPassword(event.target.value)}
						error={fieldErrors.newPassword}
						hint="At least 8 characters with upper, lower, number, and special character."
						required
					/>
					<button
						type="submit"
						className="btn btn-primary btn-block"
						disabled={submitting}
					>
						{submitting ? "Updating..." : "Update password"}
					</button>
				</form>
			) : (
				<form className="form-stack" onSubmit={handleRequest} noValidate>
					<FormField
						label="Email"
						type="email"
						name="email"
						autoComplete="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						error={fieldErrors.email}
						required
					/>
					<button
						type="submit"
						className="btn btn-primary btn-block"
						disabled={submitting}
					>
						{submitting ? "Sending..." : "Send reset link"}
					</button>
				</form>
			)}

			<p className="auth-card__links">
				<Link to="/login">Back to sign in</Link>
				{isResetMode ? (
					<>
						<span aria-hidden="true"> | </span>
						<Link to="/forgot-password">Request a new link</Link>
					</>
				) : null}
			</p>
		</section>
	);
}
