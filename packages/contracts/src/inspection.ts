import { z } from "zod";

export const inspectionStatusSchema = z.enum([
	"scheduled",
	"completed",
	"cancelled",
	"overdue",
]);

const dateStringSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const timeStringSchema = z
	.string()
	.regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM format");

export const scheduleInspectionSchema = z.object({
	extinguisherId: z.string().min(1, "Fire extinguisher is required"),
	scheduledDate: dateStringSchema,
	scheduledTime: timeStringSchema,
	assignedInspectorId: z.string().min(1).optional(),
	notes: z.string().max(2000).optional(),
});

export const completeInspectionSchema = z.object({
	notes: z.string().max(2000).optional(),
});

export const cancelInspectionSchema = z.object({
	reason: z.string().max(500).optional(),
});

export const inspectionFilterSchema = z.object({
	status: inspectionStatusSchema.optional(),
	extinguisherId: z.string().optional(),
	assignedInspectorId: z.string().optional(),
	fromDate: dateStringSchema.optional(),
	toDate: dateStringSchema.optional(),
});

export type InspectionStatus = z.infer<typeof inspectionStatusSchema>;
export type ScheduleInspectionInput = z.infer<typeof scheduleInspectionSchema>;
export type CompleteInspectionInput = z.infer<typeof completeInspectionSchema>;
export type CancelInspectionInput = z.infer<typeof cancelInspectionSchema>;
