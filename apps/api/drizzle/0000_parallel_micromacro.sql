CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"handle" varchar(15) NOT NULL,
	"name" varchar(50) NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_handle_unique" UNIQUE("handle")
);
