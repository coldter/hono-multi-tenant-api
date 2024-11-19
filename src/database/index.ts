import { createConnection } from "@/database/db";

export const db = await createConnection();

export * as s from "./schema";
