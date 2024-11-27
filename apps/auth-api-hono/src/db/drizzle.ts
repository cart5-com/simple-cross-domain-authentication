import { drizzle } from "drizzle-orm/libsql";
import { localDbPath } from "../consts";
import { checkMigrations } from "./migrate";

const db: ReturnType<typeof drizzle> = drizzle(localDbPath);
export default db;


checkMigrations();