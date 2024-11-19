import { commonTableColumns } from "@/database/utils";
import { typeIdDataType as foreignKey, typeIdDataType as publicId } from "@/pkg/utils/typeid";
import { isNotNull, relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * ! Every foreign key should always be publicId when possible
 */

const foreignKeyInteger = (columnName: string) => integer(columnName);

// TODO: add indexes and foreign keys

/**
 * @description
 */
export const tenantStatusEnum = ["active", "inactive"] as const;
export type TenantStatus = (typeof tenantStatusEnum)[number];

export type TenantSettings = Record<string, unknown>;
export const tenants = pgTable(
  "tenants",
  {
    ...commonTableColumns,
    publicId: publicId("tenant", "public_id").notNull(),
    name: varchar("name").notNull(),
    status: varchar("status", { enum: tenantStatusEnum }).notNull().default("active"),
    settings: jsonb("settings").$type<TenantSettings>().notNull().default({}),
  },
  (t) => ({
    publicIdIndex: uniqueIndex("public_id_idx").on(t.publicId),
  }),
);
// * setup index for tenant
//
// uniqueIndex("public_id_idx").on(tenant.publicId);

export const tenantRelations = relations(tenants, (r) => ({
  accounts: r.many(accounts),
  tenantDomains: r.many(tenantDomains),
}));

export type TenantDbType = typeof tenants.$inferSelect;
export type InsertTenantDbType = typeof tenants.$inferInsert;

/**
 * @description
 */
export const tenantDomains = pgTable(
  "tenant_domains",
  {
    ...commonTableColumns,
    tenantId: foreignKey("tenant", "tenant_id").notNull(),
    domain: varchar("domain").notNull(),
  },
  (t) => ({
    domainIndex: uniqueIndex("domain_idx").on(t.domain),
  }),
);
// * setup index for tenant domain
//
// uniqueIndex("domain_idx").on(tenantDomains.domain);

export const tenantDomainRelations = relations(tenantDomains, (r) => ({
  tenant: r.one(tenants, {
    fields: [tenantDomains.tenantId],
    references: [tenants.publicId],
  }),
}));

export type TenantDomainDbType = typeof tenantDomains.$inferSelect;
export type InsertTenantDomainDbType = typeof tenantDomains.$inferInsert;

/**
 * @description
 */
export const roleEnum = ["user", "admin", "system_admin"] as const;
export type Role = (typeof roleEnum)[number];
export const accounts = pgTable(
  "accounts",
  {
    ...commonTableColumns,
    publicId: publicId("account", "public_id").notNull(),
    firstName: varchar("first_name").notNull(),
    lastName: varchar("last_name"),
    email: varchar("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    role: varchar("role", { enum: roleEnum }).notNull().default("user"),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    lastLoginAt: bigint("last_login_at", { mode: "number" }),
    mobile: varchar("mobile", { length: 20 }).notNull(),
    // if tenantId is null, then it is a super admin
    tenantId: foreignKey("tenant", "tenant_id"),
  },
  (t) => ({
    publicIdIndex: uniqueIndex("public_id_idx_acc").on(t.publicId),
    emailTenantIdIndex: uniqueIndex("email_tenant_id_idx")
      .on(t.email, t.tenantId)
      .where(isNotNull(t.tenantId)),
    roleMobileTenantIdIIndex: uniqueIndex("role_mobile_tenant_id_idx")
      .on(t.role, t.mobile, t.tenantId)
      .where(isNotNull(t.tenantId)),
  }),
);
// * setup index for account https://github.com/drizzle-team/drizzle-orm/issues/3255#issue-2622004956
//
// uniqueIndex("public_id_idx_acc").on(accounts.publicId);
// uniqueIndex("email_idx").on(accounts.email);
// uniqueIndex("role_mobile_idx").on(accounts.role, accounts.mobile).where(isNotNull(accounts.mobile));

export const accountRelations = relations(accounts, (r) => ({
  sessions: r.many(sessions),
  tenant: r.one(tenants, {
    fields: [accounts.tenantId],
    references: [tenants.id],
  }),
}));

export type AccountDbType = typeof accounts.$inferSelect;
export type InsertAccountDbType = typeof accounts.$inferInsert;

/**
 * @description
 */
export const sessions = pgTable(
  "sessions",
  {
    ...commonTableColumns,
    publicId: publicId("accountSession", "public_id").notNull(),
    accountId: foreignKeyInteger("account_id").notNull(),
    accountPublicId: foreignKey("account", "account_public_id").notNull(),
    sessionToken: varchar("session_token", { length: 255 }).notNull(),
    device: varchar("device", { length: 255 }).notNull(),
    os: varchar("os", { length: 255 }).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  },
  (t) => ({
    publicIdIndex: index("public_id_idx_ses").on(t.publicId),
    accountIdIndex: index("account_id_idx").on(t.accountId),
    sessionTokenIndex: uniqueIndex("session_token_idx").on(t.sessionToken),
    expiresAtIndex: uniqueIndex("expires_at_idx").on(t.expiresAt),
  }),
);
// * setup index for session https://github.com/drizzle-team/drizzle-orm/issues/3255#issue-2622004956
//
// index("public_id_idx_ses").on(sessions.publicId);
// index("account_id_idx").on(sessions.accountId);
// uniqueIndex("session_token_idx").on(sessions.sessionToken);
// uniqueIndex("expires_at_idx").on(sessions.expiresAt);

export const sessionRelations = relations(sessions, (r) => ({
  account: r.one(accounts, {
    fields: [sessions.accountId],
    references: [accounts.id],
  }),
}));

export type SessionDbType = typeof sessions.$inferSelect;
export type InsertSessionDbType = typeof sessions.$inferInsert;
