import { ApiError } from "@web/api/client";

export function isEmailNotVerifiedError(err: unknown): boolean {
	if (!(err instanceof ApiError)) {
		return false;
	}
	const details = err.details as { code?: string } | undefined;
	return (
		details?.code === "EMAIL_NOT_VERIFIED" ||
		err.message.toLowerCase().includes("verify your email")
	);
}

export function emailFromVerificationError(err: unknown): string | undefined {
	if (!(err instanceof ApiError)) {
		return undefined;
	}
	const details = err.details as { email?: string } | undefined;
	return details?.email;
}
