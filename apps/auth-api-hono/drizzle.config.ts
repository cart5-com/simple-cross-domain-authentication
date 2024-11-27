import { defineConfig } from "drizzle-kit";
import { localDbPath } from "./src/consts";

let config: ReturnType<typeof defineConfig>;
config = defineConfig({
	out: "./src/db/generated-sql",
	schema: "./src/db/schema.ts",
	dialect: "sqlite",
	dbCredentials: { url: localDbPath }
});
export default config;
