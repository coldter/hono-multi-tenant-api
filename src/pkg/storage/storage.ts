import { appEnv } from "@/pkg/env/env";
import type { ContextTenant } from "@/pkg/hono/env";
import { seconds } from "itty-time";
import type { DatabaseSession } from "lucia";
import { type StorageValue, createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";
import redisDriver from "unstorage/drivers/redis";

function createCachedStorage<T extends StorageValue = StorageValue>(base: string, ttl: number) {
  return createStorage<T>({
    driver:
      appEnv.CACHE_DRIVER === "memory"
        ? memoryDriver()
        : redisDriver({
            url: appEnv.REDIS_URL!,
            ttl,
            base,
          }),
  });
}

export const storage = {
  session: createCachedStorage<DatabaseSession>("sessions", seconds("1 hour")),
  ctxTenant: createCachedStorage<ContextTenant>("ctx-tenant", seconds("1 hour")),
};
