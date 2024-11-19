import type { Database } from "@/database/db";
import type { TenantDbType } from "@/database/schema";
import type { HttpBindings } from "@hono/node-server";
import type { Session } from "lucia";
import type { User } from "lucia";
import type { Logger } from "winston";

export type ServiceContext = {
  db: Database;
};

export type ContextTenant = Omit<TenantDbType, "id">;

export type HonoEnv = {
  Bindings: HttpBindings;
  Variables: {
    services: ServiceContext;
    requestId: string;
    logger: Logger;
    tenant: ContextTenant;
    user: User | null;
    session: Session | null;
  };
};
