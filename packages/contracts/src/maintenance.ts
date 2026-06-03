import { z } from "zod";

const dateStringSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const createMaintenanceSchema = z.object({
	extinguisherId: z.string().min(1, "Fire extinguisher is required"),
	actionTaken: z.string().min(1, "Action taken is required").max(500).trim(),
	maintenanceDate: dateStringSchema,
	issuesIdentified: z.string().max(2000).optional(),
	notes: z.string().max(2000).optional(),
});

export const maintenanceFilterSchema = z.object({
	extinguisherId: z.string().optional(),
	performedBy: z.string().optional(),
	fromDate: dateStringSchema.optional(),
	toDate: dateStringSchema.optional(),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
