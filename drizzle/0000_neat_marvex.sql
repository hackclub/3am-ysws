CREATE TABLE "users" (
	"sub" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"slack_id" text NOT NULL,
	CONSTRAINT "users_slack_id_unique" UNIQUE("slack_id")
);
