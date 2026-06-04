import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resendVerificationSchema } from "@tzw-firex/contracts";

import { authApi } from "@web/api/auth";
import { ApiError } from "@web/api/client";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { useToast } from "@web/contexts/ToastContext";
import { zodFieldErrors } from "@web/lib/form-errors";

export function CheckEmailPage() {
	const toast = useToast();
	const [searchParams] = useSearchParams();
	const initialEmail = searchParams.get("email") ?? "";

	const [email, setEmail] = useState(initialEmail);
	const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});
	const [submitting, setSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const handleResend = async (event: FormEvent) => {
		event.preventDefault();
		setErrorMessage(null);
		setSuccessMessage(null);
		setFieldErrors({});

		const parsed = resendVerificationSchema.safeParse({ email });
		if (!parsed.success) {
			setFieldErrors(zodFieldErrors(parsed.error));
			return;
		}

		setSubmitting(true);
		try {
			const response = await authApi.resendVerification(parsed.data);
			setSuccessMessage(response.message);
			toast.success(response.message);
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to send verification email.";
			setErrorMessage(message);
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<section>
			<h2 className="auth-card__section-title">Check your email</h2>
			<p className="auth-card__lead">
				We sent a confirmation link
				{initialEmail ? (
					<>
						{" "}
						to <strong>{initialEmail}</strong>
					</>
				) : (
					" to your inbox"
				)}
				. Open it to verify your account, then sign in.
			</p>
			{errorMessage ? <ErrorAlert message={errorMessage} onDismiss={() => setErrorMessage(null)} /> : null}
			{successMessage ? (
				<p className="auth-card__success" role="status">
					{successMessage}
				</p>
			) : null}
			<form className="form-stack" onSubmit={handleResend} noValidate>
				<FormField
					label="Email"
					type="email"
					name="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					error={fieldErrors.email}
					required
				/>
				<button type="submit" className="btn btn-secondary btn-block" disabled={submitting}>
					{submitting ? "Sending..." : "Resend verification email"}
				</button>
			</form>
			<p className="auth-card__links">
				<Link to="/login">Back to sign in</Link>
			</p>
		</section>
	);
}
