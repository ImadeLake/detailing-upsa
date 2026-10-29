CREATE TABLE "adv_colors" (
	"adv" text PRIMARY KEY NOT NULL,
	"color" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
