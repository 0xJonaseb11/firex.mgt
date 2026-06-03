import {
	boolean,
	date,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
	"user",
	"inspector",
	"admin",
]);

export const extinguisherTypeEnum = pgEnum("extinguisher_type", [
	"water",
	"co2",
	"foam",
	"dry_chemical",
]);

export const extinguisherSizeEnum = pgEnum("extinguisher_size", [
	"2.5 lbs.",
	"5 lbs.",
	"9 lbs.",
	"12 lbs.",
]);

export const extinguisherStatusEnum = pgEnum("extinguisher_status", [
	"active",
	"expired",
	"decommissioned",
	"needs_maintenance",
]);

export const inspectionStatusEnum = pgEnum("inspection_status", [
	"scheduled",
	"completed",
	"cancelled",
	"overdue",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
	"inspection_scheduled",
	"inspection_overdue",
	"inspection_completed",
	"maintenance_logged",
	"password_reset",
	"general",
]);

export const users = pgTable("users", {
	id: text("id").primaryKey(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	email: text("email").notNull().unique(),
	password: text("password").notNull(),
	role: userRoleEnum("role").notNull().default("user"),
	refreshTokenVersion: integer("refresh_token_version").notNull().default(1),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const fireExtinguishers = pgTable("fire_extinguishers", {
	id: text("id").primaryKey(),
	serialNumber: text("serial_number").notNull().unique(),
	location: text("location").notNull(),
	type: extinguisherTypeEnum("type").notNull(),
	size: extinguisherSizeEnum("size").notNull(),
	installationDate: date("installation_date").notNull(),
	expiryDate: date("expiry_date").notNull(),
	status: extinguisherStatusEnum("status").notNull().default("active"),
	createdBy: text("created_by")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const inspections = pgTable("inspections", {
	id: text("id").primaryKey(),
	extinguisherId: text("extinguisher_id")
		.notNull()
		.references(() => fireExtinguishers.id, { onDelete: "cascade" }),
	scheduledBy: text("scheduled_by")
		.notNull()
		.references(() => users.id),
	assignedInspectorId: text("assigned_inspector_id").references(
		() => users.id,
	),
	scheduledDate: date("scheduled_date").notNull(),
	scheduledTime: text("scheduled_time").notNull(),
	status: inspectionStatusEnum("status").notNull().default("scheduled"),
	notes: text("notes"),
	cancelReason: text("cancel_reason"),
	completedAt: timestamp("completed_at", { withTimezone: true }),
	completedBy: text("completed_by").references(() => users.id),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const maintenanceLogs = pgTable("maintenance_logs", {
	id: text("id").primaryKey(),
	extinguisherId: text("extinguisher_id")
		.notNull()
		.references(() => fireExtinguishers.id, { onDelete: "cascade" }),
	performedBy: text("performed_by")
		.notNull()
		.references(() => users.id),
	actionTaken: text("action_taken").notNull(),
	maintenanceDate: date("maintenance_date").notNull(),
	issuesIdentified: text("issues_identified"),
	notes: text("notes"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const notifications = pgTable("notifications", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	message: text("message").notNull(),
	type: notificationTypeEnum("type").notNull().default("general"),
	read: boolean("read").notNull().default(false),
	relatedEntityType: text("related_entity_type"),
	relatedEntityId: text("related_entity_id"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type FireExtinguisher = typeof fireExtinguishers.$inferSelect;
export type Inspection = typeof inspections.$inferSelect;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
