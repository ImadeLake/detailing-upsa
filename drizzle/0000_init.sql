CREATE TABLE "countries" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "countries_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"user_id" integer NOT NULL,
	"page_id" integer NOT NULL,
	"duration_sec" integer NOT NULL,
	"is_offline" boolean NOT NULL,
	CONSTRAINT "events_duration_nonneg" CHECK ("events"."duration_sec" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"segment" text NOT NULL,
	"full_path" text NOT NULL,
	"depth" smallint NOT NULL,
	"is_unavailable" boolean DEFAULT false NOT NULL,
	CONSTRAINT "pages_full_path_unique" UNIQUE("full_path")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"role_id" smallint NOT NULL,
	"country_id" smallint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "events_natural_uq" ON "events" USING btree ("occurred_at","user_id","page_id");--> statement-breakpoint
CREATE INDEX "events_occurred_idx" ON "events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "events_user_occurred_idx" ON "events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "events_page_idx" ON "events" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "pages_parent_idx" ON "pages" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "pages_depth_idx" ON "pages" USING btree ("depth");--> statement-breakpoint
CREATE INDEX "pages_root_idx" ON "pages" USING btree (split_part("full_path", '/', 1));--> statement-breakpoint
CREATE UNIQUE INDEX "users_full_name_role_country_uq" ON "users" USING btree ("full_name","role_id","country_id");--> statement-breakpoint
CREATE INDEX "users_country_idx" ON "users" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role_id");