CREATE TABLE "adv_merges" (
	"adv" text PRIMARY KEY NOT NULL,
	"target" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "adv_merges_target_idx" ON "adv_merges" USING btree ("target");