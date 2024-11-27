import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve, dirname } from "node:path";
import { getEnvironmentVariable, IS_PROD } from "../utils/getEnvironmentVariable";
import db from "./drizzle";


export const checkMigrations = async () => {
    if (getEnvironmentVariable("AUTO_MIGRATE_DB") === "1") {
        console.log("Auto migrate enabled");
        const __dirname = dirname(new URL(import.meta.url).pathname);
        // path is ./dist in production
        const path = IS_PROD ? "../src/db/generated-sql" : "./generated-sql";
        console.log("Migrations path:", path);
        await migrate(db, { migrationsFolder: resolve(__dirname, path) });
        console.log("Migrations completed");
    }
};
