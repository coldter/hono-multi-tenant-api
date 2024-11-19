CREATE TABLE IF NOT EXISTS "accounts" (
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar,
	"email" varchar NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"role" varchar DEFAULT 'user' NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"last_login_at" bigint,
	"mobile" varchar(20) NOT NULL,
	"tenant_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid NOT NULL,
	"account_id" integer NOT NULL,
	"account_public_id" uuid NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"device" varchar(255) NOT NULL,
	"os" varchar(255) NOT NULL,
	"expires_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_domains" (
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"domain" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "public_id_idx_acc" ON "accounts" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_tenant_id_idx" ON "accounts" USING btree ("email","tenant_id") WHERE "accounts"."tenant_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "role_mobile_tenant_id_idx" ON "accounts" USING btree ("role","mobile","tenant_id") WHERE "accounts"."tenant_id" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "public_id_idx_ses" ON "sessions" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_id_idx" ON "sessions" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "session_token_idx" ON "sessions" USING btree ("session_token");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "domain_idx" ON "tenant_domains" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "public_id_idx" ON "tenants" USING btree ("public_id");