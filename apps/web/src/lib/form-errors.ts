import type { ZodError } from "zod";

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function zodFieldErrors<T extends string>(
	error: ZodError,
): FieldErrors<T> {
	const fieldErrors: FieldErrors<T> = {};

	for (const issue of error.issues) {
		const key = issue.path[0];
		if (typeof key === "string" && !fieldErrors[key as T]) {
			fieldErrors[key as T] = issue.message;
		}
	}

	return fieldErrors;
}

export function firstZodError(error: ZodError): string {
	return error.issues[0]?.message ?? "Validation failed";
}
