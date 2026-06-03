import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { authApi } from "@web/api/auth";
import { ApiError } from "@web/api/client";
import { LoadingState } from "@web/components/LoadingState";
import { useToast } from "@web/contexts/ToastContext";

export function VerifyEmailPage() {
	const toast = useToast();
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token") ?? "";

	const [status, setStatus] = useState<"loading" | "success" | "error">(
		token ? "loading" : "error",
	);
	const [message, setMessage] = useState(
		token ? "Verifying your email..." : "Missing verification token.",
	);

	useEffect(() => {
		if (!token) {
			return;
		}

		let active = true;
		(async () => {
			try {
				const response = await authApi.verifyEmail({ token });
				if (!active) {
					return;
				}
				setStatus("success");
				setMessage(response.message);
				toast.success(response.message);
			} catch (err) {
				if (!active) {
					return;
				}
				setStatus("error");
				const text =
					err instanceof ApiError
						? err.message
						: "Unable to verify email. Request a new link.";
				setMessage(text);
				toast.error(text);
			}
		})();

		return () => {
			active = false;
		};
	}, [token, toast]);

	if (status === "loading") {
		return <LoadingState message="Verifying your email..." />;
	}

	return (
		<section>
			<h2 className="auth-card__section-title">
				{status === "success" ? "Email verified" : "Verification failed"}
			</h2>
			<p className="auth-card__lead">{message}</p>
			<p className="auth-card__links">
				{status === "success" ? (
					<Link to="/login">Sign in</Link>
				) : (
					<>
						<Link to="/check-email">Resend verification email</Link>
						<span aria-hidden="true"> | </span>
						<Link to="/login">Sign in</Link>
					</>
				)}
			</p>
		</section>
	);
}
