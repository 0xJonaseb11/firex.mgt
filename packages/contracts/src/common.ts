import { z } from "zod";

export const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.max(128, "Password must be at most 128 characters")
	.regex(/[a-z]/, "Password must contain a lowercase letter")
	.regex(/[A-Z]/, "Password must contain an uppercase letter")
	.regex(/[0-9]/, "Password must contain a number")
	.regex(/[^a-zA-Z0-9]/, "Password must contain a special character");

export const emailSchema = z
	.string()
	.email("Invalid email address")
	.max(255)
	.transform((value) => value.toLowerCase().trim());

export const idParamSchema = z.object({
	id: z.string().min(1),
});

export const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
