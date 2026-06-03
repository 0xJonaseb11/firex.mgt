import type { ZodSchema } from "zod";

import { ApiError } from "@api/lib/errors";

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
	const result = schema.safeParse(body);
	if (!result.success) {
		throw new ApiError({
			code: "BAD_REQUEST",
			message: "Invalid request body",
			details: result.error.issues,
		});
	}
	return result.data;
}

export function parseQuery<T>(schema: ZodSchema<T>, query: unknown): T {
	const result = schema.safeParse(query);
	if (!result.success) {
		throw new ApiError({
			code: "BAD_REQUEST",
			message: "Invalid query parameters",
			details: result.error.issues,
		});
	}
	return result.data;
}

export function parseParams<T>(schema: ZodSchema<T>, params: unknown): T {
	const result = schema.safeParse(params);
	if (!result.success) {
		throw new ApiError({
			code: "BAD_REQUEST",
			message: "Invalid route parameters",
			details: result.error.issues,
		});
	}
	return result.data;
}
