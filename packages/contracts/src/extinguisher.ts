import { z } from "zod";

export const extinguisherTypeSchema = z.enum([
	"water",
	"co2",
	"foam",
	"dry_chemical",
]);

export const extinguisherSizeSchema = z.enum(["1.5lb", "5lb", "9lb", "12lb"]);

export const extinguisherStatusSchema = z.enum([
	"active",
	"expired",
	"decommissioned",
	"needs_maintenance",
]);

const dateStringSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

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
	.refine((data) => data.expiryDate >= data.installationDate, {
		message: "Expiry date must be on or after installation date",
		path: ["expiryDate"],
	});

export const updateExtinguisherSchema = createExtinguisherSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

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
