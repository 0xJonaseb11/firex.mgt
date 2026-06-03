CREATE TYPE "public"."extinguisher_type" AS ENUM('water', 'co2', 'foam', 'dry_chemical');--> statement-breakpoint
CREATE TYPE "public"."extinguisher_size" AS ENUM('1.5lb', '5lb', '9lb', '12lb');--> statement-breakpoint
CREATE TYPE "public"."extinguisher_status" AS ENUM('active', 'expired', 'decommissioned', 'needs_maintenance');--> statement-breakpoint
CREATE TABLE "fire_extinguishers" (
	"id" text PRIMARY KEY NOT NULL,
	"serial_number" text NOT NULL,
	"location" text NOT NULL,
	"type" "extinguisher_type" NOT NULL,
	"size" "extinguisher_size" NOT NULL,
	"installation_date" date NOT NULL,
	"expiry_date" date NOT NULL,
	"status" "extinguisher_status" DEFAULT 'active' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fire_extinguishers_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
ALTER TABLE "fire_extinguishers" ADD CONSTRAINT "fire_extinguishers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
