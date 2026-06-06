CREATE INDEX "alert_settings_org_id_idx" ON "alert_settings" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "check_results_check_id_created_at_idx" ON "check_results" USING btree ("check_id","created_at");--> statement-breakpoint
CREATE INDEX "checks_site_id_idx" ON "checks" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "checks_type_active_idx" ON "checks" USING btree ("type","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "checks_site_type_unique_idx" ON "checks" USING btree ("site_id","type");--> statement-breakpoint
CREATE INDEX "incidents_site_id_resolved_at_idx" ON "incidents" USING btree ("site_id","resolved_at");--> statement-breakpoint
CREATE INDEX "incidents_created_at_idx" ON "incidents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reports_site_id_idx" ON "reports" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_site_month_year_unique_idx" ON "reports" USING btree ("site_id","month","year");--> statement-breakpoint
CREATE INDEX "sites_org_id_idx" ON "sites" USING btree ("org_id");