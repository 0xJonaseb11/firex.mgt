import { z } from "zod";

export const extinguisherTypeSchema = z.enum([
	"water",
	"co2",
	"foam",
	"dry_chemical",
]);

export const extinguisherSizeSchema = z.enum([
	"2.5 lbs.",
	"5 lbs.",
	"9 lbs.",
	"12 lbs.",
]);

export const extinguisherStatusSchema = z.enum([
	"active",
	"expired",
	"decommissioned",
	"needs_maintenance",
]);

const dateStringSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const expiryAfterInstallation = (
	data: { installationDate?: string; expiryDate?: string },
	ctx: z.RefinementCtx,
) => {
	if (!data.installationDate || !data.expiryDate) {
		return;
	}
	if (data.expiryDate < data.installationDate) {
		ctx.addIssue({
			code: "custom",
			message: "Expiry date must be on or after installation date",
			path: ["expiryDate"],
		});
	}
};

export const createExtinguisherSchema = z
	.object({
		serialNumber: z.string().min(1, "Serial number is required").max(100).trim(),
		location: z.string().min(1, "Location is required").max(255).trim(),
		type: extinguisherTypeSchema,
		size: extinguisherSizeSchema,
		installationDate: dateStringSchema,
		expiryDate: dateStringSchema,
		status: extinguisherStatusSchema.default("active"),
	})
	.superRefine(expiryAfterInstallation);

export const updateExtinguisherSchema = z
	.object({
		serialNumber: z.string().min(1).max(100).trim().optional(),
		location: z.string().min(1).max(255).trim().optional(),
		type: extinguisherTypeSchema.optional(),
		size: extinguisherSizeSchema.optional(),
		installationDate: dateStringSchema.optional(),
		expiryDate: dateStringSchema.optional(),
		status: extinguisherStatusSchema.optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	})
	.superRefine(expiryAfterInstallation);

export const extinguisherFilterSchema = z.object({
	status: extinguisherStatusSchema.optional(),
	type: extinguisherTypeSchema.optional(),
	location: z.string().max(255).optional(),
	search: z.string().max(100).optional(),
});

export type ExtinguisherType = z.infer<typeof extinguisherTypeSchema>;
export type ExtinguisherSize = z.infer<typeof extinguisherSizeSchema>;
export type ExtinguisherStatus = z.infer<typeof extinguisherStatusSchema>;
export type CreateExtinguisherInput = z.infer<typeof createExtinguisherSchema>;
export type UpdateExtinguisherInput = z.infer<typeof updateExtinguisherSchema>;
