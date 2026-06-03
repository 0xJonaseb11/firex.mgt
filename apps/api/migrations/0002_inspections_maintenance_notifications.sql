CREATE TYPE "public"."inspection_status" AS ENUM('scheduled', 'completed', 'cancelled', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('inspection_scheduled', 'inspection_overdue', 'inspection_completed', 'maintenance_logged', 'password_reset', 'general');--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"extinguisher_id" text NOT NULL,
	"scheduled_by" text NOT NULL,
	"assigned_inspector_id" text,
	"scheduled_date" date NOT NULL,
	"scheduled_time" text NOT NULL,
	"status" "inspection_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"cancel_reason" text,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"extinguisher_id" text NOT NULL,
	"performed_by" text NOT NULL,
	"action_taken" text NOT NULL,
	"maintenance_date" date NOT NULL,
	"issues_identified" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" DEFAULT 'general' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"related_entity_type" text,
	"related_entity_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_extinguisher_id_fire_extinguishers_id_fk" FOREIGN KEY ("extinguisher_id") REFERENCES "public"."fire_extinguishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_scheduled_by_users_id_fk" FOREIGN KEY ("scheduled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_assigned_inspector_id_users_id_fk" FOREIGN KEY ("assigned_inspector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_extinguisher_id_fire_extinguishers_id_fk" FOREIGN KEY ("extinguisher_id") REFERENCES "public"."fire_extinguishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
