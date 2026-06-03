import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema } from "@repo/contracts";

import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { useAuth } from "@web/contexts/AuthContext";
import { zodFieldErrors } from "@web/lib/form-errors";

export function RegisterPage() {
	const { register, error, clearError } = useAuth();
	const navigate = useNavigate();

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [fieldErrors, setFieldErrors] = useState<
		Record<string, string | undefined>
	>({});
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		clearError();
		setFieldErrors({});

		const parsed = registerSchema.safeParse({
			firstName,
			lastName,
			email,
			password,
		});
		if (!parsed.success) {
			setFieldErrors(zodFieldErrors(parsed.error));
			return;
		}

		setSubmitting(true);
		try {
			await register(
				parsed.data.firstName,
				parsed.data.lastName,
				parsed.data.email,
				parsed.data.password,
			);
			navigate("/dashboard", { replace: true });
		} catch {
			// Error handled in context
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<section>
			<h2 className="auth-card__section-title">Create account</h2>
			{error ? <ErrorAlert message={error} onDismiss={clearError} /> : null}
			<form className="form-stack" onSubmit={handleSubmit} noValidate>
				<div className="form-row">
					<FormField
						label="First name"
						name="firstName"
						autoComplete="given-name"
						value={firstName}
						onChange={(event) => setFirstName(event.target.value)}
						error={fieldErrors.firstName}
						required
					/>
					<FormField
						label="Last name"
						name="lastName"
						autoComplete="family-name"
						value={lastName}
						onChange={(event) => setLastName(event.target.value)}
						error={fieldErrors.lastName}
						required
					/>
				</div>
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
					autoComplete="new-password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					error={fieldErrors.password}
					hint="At least 8 characters with upper, lower, number, and special character."
					required
				/>
				<button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
					{submitting ? "Creating account..." : "Create account"}
				</button>
			</form>
			<p className="auth-card__links">
				Already registered? <Link to="/login">Sign in</Link>
			</p>
		</section>
	);
}
