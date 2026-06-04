import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginSchema } from "@tzw-firex/contracts";

import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { useAuth } from "@web/contexts/AuthContext";
import { emailFromVerificationError, isEmailNotVerifiedError } from "@web/lib/auth-errors";
import { zodFieldErrors } from "@web/lib/form-errors";

export function LoginPage() {
	const { login, error, clearError } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const from =
		(location.state as { from?: string } | null)?.from ?? "/dashboard";

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [fieldErrors, setFieldErrors] = useState<{
		email?: string;
		password?: string;
	}>({});
	const [submitting, setSubmitting] = useState(false);
	const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		clearError();
		setUnverifiedEmail(null);
		setFieldErrors({});

		const parsed = loginSchema.safeParse({ email, password });
		if (!parsed.success) {
			setFieldErrors(zodFieldErrors(parsed.error));
			return;
		}

		setSubmitting(true);
		try {
			await login(parsed.data.email, parsed.data.password);
			navigate(from, { replace: true });
		} catch (err) {
			if (isEmailNotVerifiedError(err)) {
				setUnverifiedEmail(
					emailFromVerificationError(err) ?? parsed.data.email,
				);
			}
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<section className="auth-page">
			<h2 className="auth-card__section-title">Sign in</h2>
			{error ? <ErrorAlert message={error} onDismiss={clearError} /> : null}
			<form className="form-stack auth-form" onSubmit={handleSubmit} noValidate>
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
				<FormField
					label="Password"
					type="password"
					name="password"
					autoComplete="current-password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					error={fieldErrors.password}
					required
				/>
				<button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
					{submitting ? "Signing in..." : "Sign in"}
				</button>
			</form>
			{unverifiedEmail ? (
				<p className="auth-card__links">
					<Link
						to={`/check-email?email=${encodeURIComponent(unverifiedEmail)}`}
					>
						Resend verification email
					</Link>
				</p>
			) : null}
			<p className="auth-card__links auth-card__links--inline">
				<Link to="/forgot-password">Forgot password?</Link>
				<span className="auth-card__links-sep" aria-hidden="true">
					{" "}
					|{" "}
				</span>
				<Link to="/register">Create account</Link>
			</p>
		</section>
	);
}
