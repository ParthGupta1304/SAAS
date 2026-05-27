CREATE TYPE "public"."check_status" AS ENUM('passing', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."check_type" AS ENUM('uptime', 'ssl', 'domain', 'form', 'tracking');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('trial', 'starter', 'growth', 'agency', 'scale');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('draft', 'approved', 'sent');--> statement-breakpoint
CREATE TABLE "alert_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"check_id" uuid NOT NULL,
	"status" "check_status" NOT NULL,
	"response_time" integer,
	"details" text,
	"screenshot_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"type" "check_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"interval" integer NOT NULL,
	"last_checked_at" timestamp,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"check_result_id" uuid NOT NULL,
	"severity" "check_status" NOT NULL,
	"issue" text NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_org_id" text NOT NULL,
	"name" text NOT NULL,
	"plan" "plan" DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp NOT NULL,
	"stripe_subscription_id" text,
	"is_white_label" boolean DEFAULT false NOT NULL,
	"form_checks_enabled" boolean DEFAULT false NOT NULL,
	"max_sites" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"status" "report_status" DEFAULT 'draft' NOT NULL,
	"pdf_url" text,
	"ai_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"client_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_settings" ADD CONSTRAINT "alert_settings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_results" ADD CONSTRAINT "check_results_check_id_checks_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."checks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checks" ADD CONSTRAINT "checks_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_check_result_id_check_results_id_fk" FOREIGN KEY ("check_result_id") REFERENCES "public"."check_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;