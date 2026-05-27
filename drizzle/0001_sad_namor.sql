ALTER TABLE "incidents" ADD COLUMN "is_read" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "brand_color" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "custom_footer" text;