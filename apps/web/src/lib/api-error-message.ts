import { ApiError } from "@web/api/client";

export function getApiErrorMessage(
	err: unknown,
	fallback: string,
): string {
	if (!(err instanceof ApiError)) {
		return fallback;
	}

	const details = err.details as { code?: string } | undefined;
	if (details?.code === "EMAIL_NOT_VERIFIED") {
		return "Verify your email before performing this action. Check your inbox or resend the confirmation link from your profile.";
	}

	if (err.status === 401) {
		return "Your session expired. Sign in again and retry.";
	}

	return err.message || fallback;
}
