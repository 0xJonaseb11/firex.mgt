import { Link } from "react-router-dom";

import { useAuth } from "@web/contexts/AuthContext";

export function EmailVerificationBanner() {
	const { user } = useAuth();

	if (!user || user.emailVerified || user.role === "admin") {
		return null;
	}

	return (
		<div className="verify-banner" role="status">
			<p>
				<strong>Verify your email</strong> — confirm{" "}
				<span className="verify-banner__email">{user.email}</span> to schedule
				inspections and other actions.
			</p>
			<Link to={`/check-email?email=${encodeURIComponent(user.email)}`} className="btn btn-secondary btn-sm">
				Resend link
			</Link>
		</div>
	);
}
