import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { forgotPasswordSchema, resetPasswordSchema } from "@repo/contracts";

import { authApi } from "@web/api/auth";
import { ApiError } from "@web/api/client";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { zodFieldErrors } from "@web/lib/form-errors";

export function ForgotPasswordPage() {
	const [searchParams] = useSearchParams();
	const tokenFromUrl = searchParams.get("token") ?? "";
	const [mode, setMode] = useState<"request" | "reset">(
		tokenFromUrl ? "reset" : "request",
	);

	const [email, setEmail] = useState("");
	const [token, setToken] = useState(tokenFromUrl);
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
			setSuccessMessage(
				response.message ??
					"If an account exists for this email, reset instructions have been sent.",
			);
		} catch (err) {
			setErrorMessage(
				err instanceof ApiError
					? err.message
					: "Unable to process request. Please try again.",
			);
		} finally {
			setSubmitting(false);
		}
	};

	const handleReset = async (event: FormEvent) => {
		event.preventDefault();
		setSuccessMessage(null);
		setErrorMessage(null);
		setFieldErrors({});

		const parsed = resetPasswordSchema.safeParse({ token, newPassword });
		if (!parsed.success) {
			setFieldErrors(zodFieldErrors(parsed.error));
			return;
		}

		setSubmitting(true);
		try {
			const response = await authApi.resetPassword(parsed.data);
			setSuccessMessage("Password updated. You may sign in now.");
		} catch (err) {
			setErrorMessage(
				err instanceof ApiError
					? err.message
					: "Unable to reset password. Please try again.",
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<section>
			<h2 className="auth-card__section-title">Password reset</h2>
			<div className="tab-list" role="tablist">
				<button
					type="button"
					role="tab"
					className={mode === "request" ? "tab tab--active" : "tab"}
					aria-selected={mode === "request"}
					onClick={() => setMode("request")}
				>
					Request reset
				</button>
				<button
					type="button"
					role="tab"
					className={mode === "reset" ? "tab tab--active" : "tab"}
					aria-selected={mode === "reset"}
					onClick={() => setMode("reset")}
				>
					Enter token
				</button>
			</div>

			{successMessage ? (
				<div className="alert alert-success" role="status">
					{successMessage}
				</div>
			) : null}
			{errorMessage ? <ErrorAlert message={errorMessage} /> : null}

			{mode === "request" ? (
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
			) : (
				<form className="form-stack" onSubmit={handleReset} noValidate>
					<FormField
						label="Reset token"
						name="token"
						value={token}
						onChange={(event) => setToken(event.target.value)}
						error={fieldErrors.token}
						required
					/>
					<FormField
						label="New password"
						type="password"
						name="newPassword"
						autoComplete="new-password"
						value={newPassword}
						onChange={(event) => setNewPassword(event.target.value)}
						error={fieldErrors.newPassword}
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
			)}

			<p className="auth-card__links">
				<Link to="/login">Back to sign in</Link>
			</p>
		</section>
	);
}
